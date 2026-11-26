import { createInitialDayspaceState } from '../data/seed';
import {
  CalendarDisplayMode,
  CalendarEvent,
  DayspaceState,
  DigitalWallet,
  FinanceTransaction,
  HabitItem,
  JournalEntry,
  JournalMood,
  PomodoroMode,
  PomodoroSessionRecord,
  PomodoroSettings,
  SavingsGoal,
  TaskCategory,
  TaskItem,
  TaskPriority,
  TransactionType,
  WalletIcon,
  WalletType,
} from '../types/dayspace';
import {
  isQuotaExceededError,
  sanitizeJournalPhotos,
} from './journalPhotos';
import {
  clampDurationMinutes,
  DEFAULT_POMODORO_SETTINGS,
  getTodayDateKey,
} from './productivity';
import {
  deduplicateTransactions,
  WALLET_TYPE_META,
} from './wallets';

export const DAYSPACE_STORAGE_KEY = 'dayspace.workspace.v1';
export const DAYSPACE_LEGACY_MIGRATED_KEY = 'dayspace.legacy.migrated.v1';
export const DAYSPACE_BACKUP_SCHEMA = 'dayspace-backup';
export const DAYSPACE_BACKUP_VERSION = 1;

export function getUserStorageKey(userId: string): string {
  const cleanId = userId.trim();
  if (!cleanId) {
    throw new Error('User ID is required for namespaced workspace storage.');
  }
  return `${DAYSPACE_STORAGE_KEY}.user.${cleanId}`;
}

export interface StorageOperationResult {
  ok: boolean;
  error?: string;
}

export interface DayspaceBackupEnvelope {
  app: 'DAYSPACE';
  schema: typeof DAYSPACE_BACKUP_SCHEMA;
  version: number;
  exportedAt: string;
  data: DayspaceState;
}

export type ParseBackupResult =
  | { ok: true; state: DayspaceState }
  | { ok: false; error: string };

const VALID_PRIORITIES = new Set<string>(Object.values(TaskPriority));
const VALID_CATEGORIES = new Set<string>(Object.values(TaskCategory));
const VALID_MOODS = new Set<string>(Object.values(JournalMood));
const VALID_TX_TYPES = new Set<string>(Object.values(TransactionType));
const VALID_WALLET_TYPES = new Set<string>(Object.values(WalletType));
const VALID_WALLET_ICONS = new Set<WalletIcon>([
  'wallet',
  'smartphone',
  'landmark',
  'banknote',
  'credit-card',
  'coins',
  'sparkles',
]);
const VALID_POMODORO_MODES = new Set<string>(Object.values(PomodoroMode));
const VALID_AMBIENT_SOUNDS = new Set<string>([
  'none',
  'rain',
  'forest-wind',
  'brown-noise',
  'singing-bowl',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeTasks(raw: unknown, fallback: TaskItem[]): TaskItem[] {
  if (!Array.isArray(raw)) return fallback;
  const result: TaskItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const title = asNonEmptyString(item.title).trim();
    if (!id || !title) continue;
    const category = VALID_CATEGORIES.has(String(item.category))
      ? (item.category as TaskCategory)
      : TaskCategory.Personal;
    const priority = VALID_PRIORITIES.has(String(item.priority))
      ? (item.priority as TaskPriority)
      : TaskPriority.Medium;
    const dueDate = asNonEmptyString(item.dueDate).trim() || getTodayDateKey();
    result.push({
      id,
      title,
      notes:
        typeof item.notes === 'string' && item.notes.trim()
          ? item.notes
          : undefined,
      category,
      priority,
      dueDate,
      dueTime:
        typeof item.dueTime === 'string' && item.dueTime.trim()
          ? item.dueTime
          : undefined,
      completed: Boolean(item.completed),
      createdAt:
        typeof item.createdAt === 'string' && item.createdAt
          ? item.createdAt
          : new Date().toISOString(),
    });
  }
  return result;
}

function sanitizeHabits(raw: unknown, fallback: HabitItem[]): HabitItem[] {
  if (!Array.isArray(raw)) return fallback;
  const result: HabitItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const name = asNonEmptyString(item.name).trim();
    if (!id || !name) continue;
    const completedDates = Array.isArray(item.completedDates)
      ? item.completedDates.filter(
          (d): d is string => typeof d === 'string' && d.trim().length > 0
        )
      : [];
    const targetNum = Number(item.targetDaysPerWeek);
    result.push({
      id,
      name,
      cue: asNonEmptyString(item.cue, 'Daily routine'),
      category:
        typeof item.category === 'string' && item.category.trim()
          ? item.category
          : 'Wellness',
      targetDaysPerWeek: Number.isFinite(targetNum)
        ? clampDurationMinutes(targetNum, 1, 7)
        : 5,
      completedDates,
      createdAt: asNonEmptyString(item.createdAt, getTodayDateKey()),
    });
  }
  return result;
}

function sanitizeEvents(
  raw: unknown,
  fallback: CalendarEvent[]
): CalendarEvent[] {
  if (!Array.isArray(raw)) return fallback;
  const result: CalendarEvent[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const title = asNonEmptyString(item.title).trim();
    if (!id || !title) continue;
    result.push({
      id,
      title,
      date: asNonEmptyString(item.date).trim() || getTodayDateKey(),
      startTime: asNonEmptyString(item.startTime).trim() || '09:00',
      endTime:
        typeof item.endTime === 'string' && item.endTime.trim()
          ? item.endTime
          : undefined,
      location: asNonEmptyString(item.location, 'Personal'),
      category: asNonEmptyString(item.category, 'Schedule'),
      notes:
        typeof item.notes === 'string' && item.notes.trim()
          ? item.notes
          : undefined,
    });
  }
  return result;
}

function sanitizeJournalEntries(
  raw: unknown,
  fallback: JournalEntry[]
): JournalEntry[] {
  if (!Array.isArray(raw)) return fallback;
  const result: JournalEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const title = asNonEmptyString(item.title).trim();
    if (!id || !title) continue;
    const mood = VALID_MOODS.has(String(item.mood))
      ? (item.mood as JournalMood)
      : JournalMood.Calm;
    const gratitude = Array.isArray(item.gratitude)
      ? item.gratitude.filter((g): g is string => typeof g === 'string')
      : [];
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === 'string')
      : [];
    const photos = sanitizeJournalPhotos(item.photos);
    const nowIso = new Date().toISOString();
    result.push({
      id,
      date: asNonEmptyString(item.date).trim() || getTodayDateKey(),
      title,
      mood,
      gratitude,
      body: asNonEmptyString(item.body),
      tags,
      ...(photos.length > 0 ? { photos } : {}),
      createdAt: asNonEmptyString(item.createdAt, nowIso),
      updatedAt: asNonEmptyString(item.updatedAt, nowIso),
    });
  }
  return result;
}

function sanitizeWallets(
  raw: unknown,
  fallback: DigitalWallet[]
): DigitalWallet[] {
  if (!Array.isArray(raw)) return fallback;
  const seenIds = new Set<string>();
  const result: DigitalWallet[] = [];

  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const name = asNonEmptyString(item.name).trim();
    if (!id || !name || seenIds.has(id)) continue;
    seenIds.add(id);

    const type = VALID_WALLET_TYPES.has(String(item.type))
      ? (item.type as WalletType)
      : WalletType.Custom;
    const preset = WALLET_TYPE_META[type];
    const balanceNum = Number(item.balance);
    const rawColor = typeof item.color === 'string' ? item.color.trim() : '';
    const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor)
      ? rawColor
      : preset.defaultColor;
    const icon = VALID_WALLET_ICONS.has(item.icon as WalletIcon)
      ? (item.icon as WalletIcon)
      : preset.defaultIcon;
    const nowIso = new Date().toISOString();

    result.push({
      id,
      name,
      type,
      balance: Number.isFinite(balanceNum) ? balanceNum : 0,
      notes:
        typeof item.notes === 'string' && item.notes.trim()
          ? item.notes.trim()
          : undefined,
      color,
      icon,
      createdAt: asNonEmptyString(item.createdAt, nowIso),
      updatedAt: asNonEmptyString(item.updatedAt, nowIso),
    });
  }

  return result;
}

function sanitizeTransactions(
  raw: unknown,
  fallback: FinanceTransaction[]
): FinanceTransaction[] {
  if (!Array.isArray(raw)) return fallback;
  const result: FinanceTransaction[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const title = asNonEmptyString(item.title).trim();
    if (!id || !title) continue;
    const type = VALID_TX_TYPES.has(String(item.type))
      ? (item.type as TransactionType)
      : TransactionType.Expense;
    const amountNum = Number(item.amount);
    const walletId =
      typeof item.walletId === 'string' && item.walletId.trim()
        ? item.walletId.trim()
        : undefined;
    const destinationWalletId =
      type === TransactionType.Transfer &&
      typeof item.destinationWalletId === 'string' &&
      item.destinationWalletId.trim()
        ? item.destinationWalletId.trim()
        : undefined;
    result.push({
      id,
      type,
      title,
      amount: Number.isFinite(amountNum) ? Math.max(0, amountNum) : 0,
      category: asNonEmptyString(item.category, 'Other'),
      date: asNonEmptyString(item.date).trim() || getTodayDateKey(),
      ...(walletId ? { walletId } : {}),
      ...(destinationWalletId ? { destinationWalletId } : {}),
      notes:
        typeof item.notes === 'string' && item.notes.trim()
          ? item.notes
          : undefined,
      createdAt: asNonEmptyString(item.createdAt, new Date().toISOString()),
    });
  }
  return deduplicateTransactions(result);
}

function sanitizeSavingsGoals(
  raw: unknown,
  fallback: SavingsGoal[]
): SavingsGoal[] {
  if (!Array.isArray(raw)) return fallback;
  const result: SavingsGoal[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    const name = asNonEmptyString(item.name).trim();
    if (!id || !name) continue;
    const currentNum = Number(item.currentAmount);
    const targetNum = Number(item.targetAmount);
    result.push({
      id,
      name,
      category: asNonEmptyString(item.category, 'Savings'),
      currentAmount: Number.isFinite(currentNum) ? Math.max(0, currentNum) : 0,
      targetAmount: Number.isFinite(targetNum) ? Math.max(1, targetNum) : 100,
      targetDate:
        typeof item.targetDate === 'string' && item.targetDate.trim()
          ? item.targetDate
          : undefined,
      createdAt: asNonEmptyString(item.createdAt, getTodayDateKey()),
    });
  }
  return result;
}

function sanitizePomodoroSettings(
  raw: unknown,
  fallback: PomodoroSettings
): PomodoroSettings {
  if (!isRecord(raw)) return fallback;
  const ambientSound = VALID_AMBIENT_SOUNDS.has(String(raw.ambientSound))
    ? (raw.ambientSound as PomodoroSettings['ambientSound'])
    : fallback.ambientSound;
  const volNum = Number(raw.ambientVolume);
  return {
    focusMinutes: clampDurationMinutes(
      Number(raw.focusMinutes ?? fallback.focusMinutes),
      1,
      180
    ),
    shortBreakMinutes: clampDurationMinutes(
      Number(raw.shortBreakMinutes ?? fallback.shortBreakMinutes),
      1,
      60
    ),
    longBreakMinutes: clampDurationMinutes(
      Number(raw.longBreakMinutes ?? fallback.longBreakMinutes),
      1,
      90
    ),
    longBreakInterval: clampDurationMinutes(
      Number(raw.longBreakInterval ?? fallback.longBreakInterval),
      2,
      12
    ),
    autoStartNext:
      typeof raw.autoStartNext === 'boolean'
        ? raw.autoStartNext
        : fallback.autoStartNext,
    soundEnabled:
      typeof raw.soundEnabled === 'boolean'
        ? raw.soundEnabled
        : fallback.soundEnabled,
    ambientSound,
    ambientVolume: Number.isFinite(volNum)
      ? Math.min(1, Math.max(0, volNum))
      : fallback.ambientVolume,
  };
}

function sanitizePomodoroSessions(
  raw: unknown,
  fallback: PomodoroSessionRecord[]
): PomodoroSessionRecord[] {
  if (!Array.isArray(raw)) return fallback;
  const result: PomodoroSessionRecord[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asNonEmptyString(item.id).trim();
    if (!id) continue;
    const mode = VALID_POMODORO_MODES.has(String(item.mode))
      ? (item.mode as PomodoroMode)
      : PomodoroMode.Focus;
    const durationNum = Number(item.durationMinutes);
    result.push({
      id,
      mode,
      durationMinutes: Number.isFinite(durationNum)
        ? Math.max(1, Math.round(durationNum))
        : 25,
      completedAt: asNonEmptyString(
        item.completedAt,
        new Date().toISOString()
      ),
      dateKey: asNonEmptyString(item.dateKey).trim() || getTodayDateKey(),
      taskTitle:
        typeof item.taskTitle === 'string' && item.taskTitle.trim()
          ? item.taskTitle
          : undefined,
    });
  }
  return result;
}

export function sanitizeDayspaceState(
  raw: unknown,
  fallback: DayspaceState
): DayspaceState {
  if (!isRecord(raw)) return fallback;

  const rawProfile = isRecord(raw.profile) ? raw.profile : null;
  const profile = rawProfile
    ? {
        name:
          typeof rawProfile.name === 'string'
            ? rawProfile.name
            : fallback.profile.name,
        dailyFocusNote:
          typeof rawProfile.dailyFocusNote === 'string'
            ? rawProfile.dailyFocusNote
            : fallback.profile.dailyFocusNote,
      }
    : fallback.profile;

  const calendarMode: CalendarDisplayMode =
    raw.calendarMode === 'month' ||
    raw.calendarMode === 'week' ||
    raw.calendarMode === 'agenda'
      ? raw.calendarMode
      : fallback.calendarMode;

  return {
    profile,
    tasks: sanitizeTasks(raw.tasks, fallback.tasks),
    habits: sanitizeHabits(raw.habits, fallback.habits),
    events: sanitizeEvents(raw.events, fallback.events),
    journalEntries: sanitizeJournalEntries(
      raw.journalEntries,
      fallback.journalEntries
    ),
    wallets: sanitizeWallets(raw.wallets, fallback.wallets),
    transactions: sanitizeTransactions(raw.transactions, fallback.transactions),
    savingsGoals: sanitizeSavingsGoals(raw.savingsGoals, fallback.savingsGoals),
    pomodoroSettings: sanitizePomodoroSettings(
      raw.pomodoroSettings,
      fallback.pomodoroSettings
    ),
    pomodoroSessions: sanitizePomodoroSessions(
      raw.pomodoroSessions,
      fallback.pomodoroSessions
    ),
    quoteOffset:
      typeof raw.quoteOffset === 'number' && Number.isFinite(raw.quoteOffset)
        ? raw.quoteOffset
        : fallback.quoteOffset,
    calendarMode,
  };
}

export function createEmptyDayspaceState(
  preserveName?: string
): DayspaceState {
  return {
    profile: {
      name: preserveName?.trim() || 'Personal Space',
      dailyFocusNote: '',
    },
    tasks: [],
    habits: [],
    events: [],
    journalEntries: [],
    wallets: [],
    transactions: [],
    savingsGoals: [],
    pomodoroSettings: { ...DEFAULT_POMODORO_SETTINGS },
    pomodoroSessions: [],
    quoteOffset: 0,
    calendarMode: 'month',
  };
}

function getBrowserStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDayspaceState(storage?: Storage): DayspaceState {
  const fallback = createInitialDayspaceState();
  const target = getBrowserStorage(storage);
  if (!target) return fallback;

  try {
    const raw = target.getItem(DAYSPACE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fallback;
    return sanitizeDayspaceState(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function saveDayspaceState(
  state: DayspaceState,
  storage?: Storage
): StorageOperationResult {
  const target = getBrowserStorage(storage);
  if (!target) {
    return { ok: false, error: 'LocalStorage is unavailable in this environment.' };
  }
  try {
    target.setItem(DAYSPACE_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return {
        ok: false,
        error:
          'Storage limit exceeded (QuotaExceededError). Remove one or more photos or export a backup to free up browser LocalStorage space.',
      };
    }
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to save workspace data to LocalStorage.',
    };
  }
}

export function clearDayspaceStorage(
  storage?: Storage
): StorageOperationResult {
  const target = getBrowserStorage(storage);
  if (!target) {
    return { ok: false, error: 'LocalStorage is unavailable in this environment.' };
  }
  try {
    target.removeItem(DAYSPACE_STORAGE_KEY);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to clear LocalStorage.',
    };
  }
}

export function loadUserDayspaceState(
  userId: string,
  storage?: Storage
): DayspaceState | null {
  const target = getBrowserStorage(storage);
  if (!target || !userId.trim()) return null;

  try {
    const raw = target.getItem(getUserStorageKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return sanitizeDayspaceState(parsed, createEmptyDayspaceState());
  } catch {
    return null;
  }
}

export function saveUserDayspaceState(
  userId: string,
  state: DayspaceState,
  storage?: Storage
): StorageOperationResult {
  const target = getBrowserStorage(storage);
  if (!target) {
    return { ok: false, error: 'LocalStorage is unavailable in this environment.' };
  }
  if (!userId.trim()) {
    return { ok: false, error: 'Authenticated user ID is required.' };
  }
  try {
    target.setItem(getUserStorageKey(userId), JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return {
        ok: false,
        error:
          'Storage limit exceeded (QuotaExceededError). Remove one or more photos or export a backup to free up browser LocalStorage space.',
      };
    }
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to save workspace data to LocalStorage.',
    };
  }
}

export function clearUserDayspaceStorage(
  userId: string,
  storage?: Storage
): StorageOperationResult {
  const target = getBrowserStorage(storage);
  if (!target) {
    return { ok: false, error: 'LocalStorage is unavailable in this environment.' };
  }
  if (!userId.trim()) {
    return { ok: false, error: 'Authenticated user ID is required.' };
  }
  try {
    target.removeItem(getUserStorageKey(userId));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to clear user workspace from LocalStorage.',
    };
  }
}

export function isLegacyLocalMigrated(storage?: Storage): boolean {
  const target = getBrowserStorage(storage);
  if (!target) return false;
  try {
    return Boolean(target.getItem(DAYSPACE_LEGACY_MIGRATED_KEY));
  } catch {
    return false;
  }
}

export function markLegacyLocalMigrated(
  userId: string,
  choice: 'imported' | 'fresh',
  storage?: Storage
): StorageOperationResult {
  const target = getBrowserStorage(storage);
  if (!target) {
    return { ok: false, error: 'LocalStorage is unavailable in this environment.' };
  }
  try {
    target.setItem(
      DAYSPACE_LEGACY_MIGRATED_KEY,
      JSON.stringify({
        userId,
        choice,
        migratedAt: new Date().toISOString(),
      })
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to record legacy migration status.',
    };
  }
}

/**
 * Loads pre-auth legacy LocalStorage data (`dayspace.workspace.v1`) strictly
 * if present and not yet claimed/migrated by an authenticated account.
 * Returns null if clean or already handled (never fabricates seed data).
 */
export function loadLegacyLocalState(storage?: Storage): DayspaceState | null {
  const target = getBrowserStorage(storage);
  if (!target) return null;
  if (isLegacyLocalMigrated(target)) return null;

  try {
    const raw = target.getItem(DAYSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return sanitizeDayspaceState(parsed, createEmptyDayspaceState());
  } catch {
    return null;
  }
}

export function exportDayspaceBackup(state: DayspaceState): string {
  const envelope: DayspaceBackupEnvelope = {
    app: 'DAYSPACE',
    schema: DAYSPACE_BACKUP_SCHEMA,
    version: DAYSPACE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(envelope, null, 2);
}

const RECOGNIZED_DAYSPACE_KEYS = [
  'profile',
  'tasks',
  'habits',
  'events',
  'journalEntries',
  'wallets',
  'transactions',
  'savingsGoals',
  'pomodoroSettings',
  'pomodoroSessions',
] as const;

export function parseDayspaceBackup(rawJson: string): ParseBackupResult {
  if (!rawJson || !rawJson.trim()) {
    return { ok: false, error: 'The selected backup file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON file. Please choose a valid DAYSPACE backup.',
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: 'Invalid backup format: expected a DAYSPACE JSON object.',
    };
  }

  let candidate: unknown = parsed;
  if (parsed.schema === DAYSPACE_BACKUP_SCHEMA) {
    if (!isRecord(parsed.data)) {
      return {
        ok: false,
        error: 'Invalid DAYSPACE backup envelope: missing data payload.',
      };
    }
    candidate = parsed.data;
  }

  if (!isRecord(candidate)) {
    return {
      ok: false,
      error: 'Invalid backup format: workspace data is malformed.',
    };
  }

  const hasRecognizedSection = RECOGNIZED_DAYSPACE_KEYS.some(
    (key) => key in candidate
  );
  if (!hasRecognizedSection) {
    return {
      ok: false,
      error:
        'This JSON file does not appear to contain DAYSPACE workspace data.',
    };
  }

  const emptyBaseline = createEmptyDayspaceState();
  return {
    ok: true,
    state: sanitizeDayspaceState(candidate, emptyBaseline),
  };
}
