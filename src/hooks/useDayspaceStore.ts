import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialDayspaceState } from '../data/seed';
import { supabase } from '../lib/supabase';
import {
  CalendarDisplayMode,
  CalendarEvent,
  DayspaceState,
  DigitalWallet,
  FinanceTransaction,
  HabitItem,
  JournalEntry,
  JournalMood,
  JournalPhoto,
  PomodoroMode,
  PomodoroSessionRecord,
  PomodoroSettings,
  SavingsGoal,
  TaskCategory,
  TaskItem,
  TaskPriority,
  TransactionType,
  UserProfile,
  WalletIcon,
  WalletType,
} from '../types/dayspace';
import { sanitizeJournalPhotos } from '../utils/journalPhotos';
import {
  clampDurationMinutes,
  getTodayDateKey,
} from '../utils/productivity';
import {
  createEmptyDayspaceState,
  loadLegacyLocalState,
  loadUserDayspaceState,
  markLegacyLocalMigrated,
  saveUserDayspaceState,
} from '../utils/storage';
import {
  CloudHydrationPhase,
  CloudSyncStatus,
  fetchCloudWorkspace,
  MigrationCandidate,
  resolveAuthenticatedWorkspaceLoad,
  saveCloudWorkspace,
} from '../utils/supabaseSync';
import {
  applyTransactionBalanceDelta,
  deduplicateTransactions,
  reconcileWalletsForTransactionChange,
  TRANSFER_CATEGORY,
  WALLET_TYPE_META,
} from '../utils/wallets';

export function useDayspaceStore(
  cloudUserId?: string | null,
  defaultProfileName?: string
) {
  const [state, setState] = useState<DayspaceState>(() =>
    createEmptyDayspaceState(defaultProfileName)
  );
  const [storageError, setStorageError] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('local');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [hydrationPhase, setHydrationPhase] = useState<CloudHydrationPhase>(
    cloudUserId ? 'loading' : 'idle'
  );
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [offlineFallbackState, setOfflineFallbackState] =
    useState<DayspaceState | null>(null);
  const [migrationCandidate, setMigrationCandidate] =
    useState<MigrationCandidate | null>(null);
  const [migrationSubmitting, setMigrationSubmitting] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;

  const activeUserRef = useRef<string | null>(cloudUserId ?? null);
  activeUserRef.current = cloudUserId ?? null;

  const hydratedCloudUserRef = useRef<string | null>(null);
  const skipNextCloudSaveRef = useRef(false);

  // Persist workspace changes ONLY to the active authenticated user's namespaced LocalStorage key
  useEffect(() => {
    if (!cloudUserId || hydrationPhase !== 'ready') return;
    if (hydratedCloudUserRef.current !== cloudUserId) return;

    const result = saveUserDayspaceState(cloudUserId, state);
    setStorageError(result.ok ? null : result.error || 'Unable to save locally.');
  }, [state, cloudUserId, hydrationPhase]);

  // Hydrate authenticated user workspace from Supabase & user-isolated LocalStorage
  useEffect(() => {
    if (!cloudUserId || !supabase) {
      hydratedCloudUserRef.current = null;
      skipNextCloudSaveRef.current = false;
      setState(createEmptyDayspaceState());
      setStorageError(null);
      setCloudSyncStatus('local');
      setCloudSyncError(null);
      setLastSyncedAt(null);
      setHydrationPhase('idle');
      setHydrationError(null);
      setOfflineFallbackState(null);
      setMigrationCandidate(null);
      setMigrationSubmitting(false);
      return;
    }

    let cancelled = false;

    // Immediately clear previous user's in-memory workspace on user switch / login
    if (hydratedCloudUserRef.current !== cloudUserId) {
      hydratedCloudUserRef.current = null;
      setState(createEmptyDayspaceState(defaultProfileName));
      setStorageError(null);
      setLastSyncedAt(null);
    }

    setHydrationPhase('loading');
    setHydrationError(null);
    setOfflineFallbackState(null);
    setMigrationCandidate(null);
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);

    const client = supabase;
    const fallbackName = defaultProfileName?.trim() || 'Personal Space';

    (async () => {
      const fetchResult = await fetchCloudWorkspace(client, cloudUserId);
      if (cancelled) return;

      const userLocalState = loadUserDayspaceState(cloudUserId);
      const legacyLocalState = loadLegacyLocalState();

      const resolution = resolveAuthenticatedWorkspaceLoad({
        cloudResult: fetchResult,
        userLocalState,
        legacyLocalState,
        defaultName: fallbackName,
      });

      if (resolution.phase === 'error') {
        hydratedCloudUserRef.current = null;
        setOfflineFallbackState(resolution.offlineFallbackState);
        setCloudSyncStatus('error');
        setCloudSyncError(resolution.error);
        setHydrationError(resolution.error);
        setHydrationPhase('error');
        return;
      }

      if (resolution.phase === 'needs-migration-choice') {
        hydratedCloudUserRef.current = null;
        setMigrationCandidate({
          source: resolution.candidateSource,
          state: resolution.candidateState,
        });
        setCloudSyncStatus('local');
        setHydrationPhase('needs-migration-choice');
        return;
      }

      skipNextCloudSaveRef.current = true;
      hydratedCloudUserRef.current = cloudUserId;
      setState(resolution.state);
      const localSave = saveUserDayspaceState(cloudUserId, resolution.state);
      setStorageError(
        localSave.ok ? null : localSave.error || 'Unable to save locally.'
      );

      if (resolution.shouldSyncInitialToCloud) {
        const initialSave = await saveCloudWorkspace(
          client,
          cloudUserId,
          resolution.state
        );
        if (cancelled) return;
        if (!initialSave.ok) {
          setCloudSyncStatus('error');
          setCloudSyncError(
            initialSave.error || 'Unable to initialize cloud workspace.'
          );
        } else {
          setCloudSyncStatus('synced');
          setLastSyncedAt(initialSave.updatedAt ?? new Date().toISOString());
        }
      } else {
        setCloudSyncStatus('synced');
        setLastSyncedAt(
          resolution.lastSyncedAt ?? new Date().toISOString()
        );
      }

      setHydrationPhase('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [cloudUserId, defaultProfileName, retryCounter]);

  const retryCloudHydration = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  const continueOfflineWithCache = useCallback(() => {
    if (!cloudUserId || !offlineFallbackState) return;
    skipNextCloudSaveRef.current = true;
    hydratedCloudUserRef.current = cloudUserId;
    setState(offlineFallbackState);
    setHydrationError(null);
    setCloudSyncStatus('error');
    setCloudSyncError(
      'Working offline using this account’s cached local workspace'
    );
    setHydrationPhase('ready');
  }, [cloudUserId, offlineFallbackState]);

  const confirmImportMigration = useCallback(async () => {
    if (!cloudUserId || !supabase || !migrationCandidate) return false;
    setMigrationSubmitting(true);
    setHydrationError(null);

    try {
      const candidateState = migrationCandidate.state;
      const saveResult = await saveCloudWorkspace(
        supabase,
        cloudUserId,
        candidateState
      );
      if (!saveResult.ok) {
        setHydrationError(
          saveResult.error ||
            'Could not save your local workspace to the cloud. Nothing was overwritten — please try again.'
        );
        setCloudSyncStatus('error');
        setCloudSyncError(saveResult.error || 'Migration failed.');
        return false;
      }

      const localResult = saveUserDayspaceState(cloudUserId, candidateState);
      setStorageError(
        localResult.ok ? null : localResult.error || 'Unable to save locally.'
      );
      if (migrationCandidate.source === 'legacy-local') {
        markLegacyLocalMigrated(cloudUserId, 'imported');
      }

      skipNextCloudSaveRef.current = true;
      hydratedCloudUserRef.current = cloudUserId;
      setState(candidateState);
      setMigrationCandidate(null);
      setCloudSyncStatus('synced');
      setCloudSyncError(null);
      setLastSyncedAt(saveResult.updatedAt ?? new Date().toISOString());
      setHydrationPhase('ready');
      return true;
    } finally {
      setMigrationSubmitting(false);
    }
  }, [cloudUserId, migrationCandidate]);

  const confirmStartFreshMigration = useCallback(async () => {
    if (!cloudUserId || !supabase) return false;
    setMigrationSubmitting(true);
    setHydrationError(null);

    try {
      const freshState = createEmptyDayspaceState(defaultProfileName);
      const saveResult = await saveCloudWorkspace(
        supabase,
        cloudUserId,
        freshState
      );
      if (!saveResult.ok) {
        setHydrationError(
          saveResult.error ||
            'Could not initialize your fresh workspace in the cloud. Please try again.'
        );
        setCloudSyncStatus('error');
        setCloudSyncError(saveResult.error || 'Initialization failed.');
        return false;
      }

      const localResult = saveUserDayspaceState(cloudUserId, freshState);
      setStorageError(
        localResult.ok ? null : localResult.error || 'Unable to save locally.'
      );
      if (migrationCandidate?.source === 'legacy-local') {
        markLegacyLocalMigrated(cloudUserId, 'fresh');
      }

      skipNextCloudSaveRef.current = true;
      hydratedCloudUserRef.current = cloudUserId;
      setState(freshState);
      setMigrationCandidate(null);
      setCloudSyncStatus('synced');
      setCloudSyncError(null);
      setLastSyncedAt(saveResult.updatedAt ?? new Date().toISOString());
      setHydrationPhase('ready');
      return true;
    } finally {
      setMigrationSubmitting(false);
    }
  }, [cloudUserId, defaultProfileName, migrationCandidate]);

  // Debounced auto-save to Supabase whenever state changes while signed in & hydrated
  useEffect(() => {
    if (!cloudUserId || !supabase) return;
    if (hydrationPhase !== 'ready') return;
    if (hydratedCloudUserRef.current !== cloudUserId) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const client = supabase;
    const timer = window.setTimeout(async () => {
      if (activeUserRef.current !== cloudUserId) return;
      setCloudSyncStatus('syncing');
      const result = await saveCloudWorkspace(client, cloudUserId, state);
      if (activeUserRef.current !== cloudUserId) return;
      if (!result.ok) {
        setCloudSyncStatus('error');
        setCloudSyncError(result.error || 'Cloud sync failed.');
      } else {
        setCloudSyncStatus('synced');
        setCloudSyncError(null);
        setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [state, cloudUserId, hydrationPhase]);

  const syncNow = useCallback(async () => {
    if (!cloudUserId || !supabase) return;
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);
    const result = await saveCloudWorkspace(
      supabase,
      cloudUserId,
      stateRef.current
    );
    if (!result.ok) {
      setCloudSyncStatus('error');
      setCloudSyncError(result.error || 'Cloud sync failed.');
    } else {
      setCloudSyncStatus('synced');
      setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
    }
  }, [cloudUserId]);

  const addTask = useCallback(
    (input: {
      title: string;
      notes?: string;
      category: TaskCategory;
      priority: TaskPriority;
      dueDate: string;
      dueTime?: string;
    }) => {
      const newTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: input.title.trim(),
        notes: input.notes?.trim() || undefined,
        category: input.category,
        priority: input.priority,
        dueDate: input.dueDate || getTodayDateKey(),
        dueTime: input.dueTime?.trim() || undefined,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
    },
    []
  );

  const updateTask = useCallback(
    (
      taskId: string,
      updates: {
        title: string;
        notes?: string;
        category: TaskCategory;
        priority: TaskPriority;
        dueDate: string;
        dueTime?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: updates.title.trim(),
                notes: updates.notes?.trim() || undefined,
                category: updates.category,
                priority: updates.priority,
                dueDate: updates.dueDate || task.dueDate,
                dueTime: updates.dueTime?.trim() || undefined,
              }
            : task
        ),
      }));
    },
    []
  );

  const toggleTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
  }, []);

  const addHabit = useCallback(
    (input: {
      name: string;
      cue: string;
      category?: string;
      targetDaysPerWeek: number;
    }) => {
      const newHabit: HabitItem = {
        id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        cue: input.cue.trim() || 'Daily routine',
        category: input.category?.trim() || 'Wellness',
        targetDaysPerWeek: input.targetDaysPerWeek,
        completedDates: [],
        createdAt: getTodayDateKey(),
      };
      setState((prev) => ({
        ...prev,
        habits: [...prev.habits, newHabit],
      }));
    },
    []
  );

  const updateHabit = useCallback(
    (
      habitId: string,
      updates: {
        name: string;
        cue: string;
        category?: string;
        targetDaysPerWeek: number;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        habits: prev.habits.map((habit) =>
          habit.id === habitId
            ? {
                ...habit,
                name: updates.name.trim(),
                cue: updates.cue.trim() || 'Daily routine',
                category: updates.category?.trim() || habit.category || 'Wellness',
                targetDaysPerWeek: updates.targetDaysPerWeek,
              }
            : habit
        ),
      }));
    },
    []
  );

  const toggleHabitDate = useCallback((habitId: string, dateKey: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const exists = habit.completedDates.includes(dateKey);
        return {
          ...habit,
          completedDates: exists
            ? habit.completedDates.filter((d) => d !== dateKey)
            : [...habit.completedDates, dateKey],
        };
      }),
    }));
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  }, []);

  const addEvent = useCallback(
    (input: {
      title: string;
      date: string;
      startTime: string;
      endTime?: string;
      location: string;
      category: string;
      notes?: string;
    }) => {
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: input.title.trim(),
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime?.trim() || undefined,
        location: input.location.trim() || 'Personal',
        category: input.category.trim() || 'Schedule',
        notes: input.notes?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        events: [...prev.events, newEvent],
      }));
    },
    []
  );

  const updateEvent = useCallback(
    (
      eventId: string,
      updates: {
        title: string;
        date: string;
        startTime: string;
        endTime?: string;
        location: string;
        category: string;
        notes?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        events: prev.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                title: updates.title.trim(),
                date: updates.date,
                startTime: updates.startTime,
                endTime: updates.endTime?.trim() || undefined,
                location: updates.location.trim() || 'Personal',
                category: updates.category.trim() || 'Schedule',
                notes: updates.notes?.trim() || undefined,
              }
            : event
        ),
      }));
    },
    []
  );

  const deleteEvent = useCallback((eventId: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  }, []);

  const addJournalEntry = useCallback(
    (input: {
      date: string;
      title: string;
      mood: JournalMood;
      gratitude: string[];
      body: string;
      tags: string[];
      photos?: JournalPhoto[];
    }): { ok: boolean; entryId?: string; error?: string } => {
      const nowIso = new Date().toISOString();
      const id = `journal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const photos = sanitizeJournalPhotos(input.photos);
      const newEntry: JournalEntry = {
        id,
        date: input.date || getTodayDateKey(),
        title: input.title.trim(),
        mood: input.mood,
        gratitude: input.gratitude.map((g) => g.trim()).filter(Boolean),
        body: input.body.trim(),
        tags: input.tags.map((t) => t.trim()).filter(Boolean),
        ...(photos.length > 0 ? { photos } : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const activeUserId = activeUserRef.current;
      if (!activeUserId) {
        return {
          ok: false,
          error: 'Please sign in to save journal entries.',
        };
      }
      const nextState: DayspaceState = {
        ...stateRef.current,
        journalEntries: [newEntry, ...stateRef.current.journalEntries],
      };
      const saveResult = saveUserDayspaceState(activeUserId, nextState);
      if (!saveResult.ok) {
        const message =
          saveResult.error ||
          'Storage limit reached — unable to save journal entry locally.';
        setStorageError(message);
        return { ok: false, error: message };
      }
      setStorageError(null);
      setState(nextState);
      return { ok: true, entryId: id };
    },
    []
  );

  const updateJournalEntry = useCallback(
    (
      entryId: string,
      updates: {
        date: string;
        title: string;
        mood: JournalMood;
        gratitude: string[];
        body: string;
        tags: string[];
        photos?: JournalPhoto[];
      }
    ): { ok: boolean; entryId?: string; error?: string } => {
      const activeUserId = activeUserRef.current;
      if (!activeUserId) {
        return {
          ok: false,
          error: 'Please sign in to update journal entries.',
        };
      }
      const nowIso = new Date().toISOString();
      const photos = sanitizeJournalPhotos(updates.photos);
      const nextState: DayspaceState = {
        ...stateRef.current,
        journalEntries: stateRef.current.journalEntries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                date: updates.date || entry.date,
                title: updates.title.trim(),
                mood: updates.mood,
                gratitude: updates.gratitude.map((g) => g.trim()).filter(Boolean),
                body: updates.body.trim(),
                tags: updates.tags.map((t) => t.trim()).filter(Boolean),
                photos: photos.length > 0 ? photos : undefined,
                updatedAt: nowIso,
              }
            : entry
        ),
      };
      const saveResult = saveUserDayspaceState(activeUserId, nextState);
      if (!saveResult.ok) {
        const message =
          saveResult.error ||
          'Storage limit reached — unable to update journal entry locally.';
        setStorageError(message);
        return { ok: false, error: message };
      }
      setStorageError(null);
      setState(nextState);
      return { ok: true, entryId };
    },
    []
  );

  const deleteJournalEntry = useCallback((entryId: string) => {
    setState((prev) => ({
      ...prev,
      journalEntries: prev.journalEntries.filter((entry) => entry.id !== entryId),
    }));
  }, []);

  const addWallet = useCallback(
    (input: {
      name: string;
      type: WalletType;
      balance: number;
      notes?: string;
      color?: string;
      icon?: WalletIcon;
    }) => {
      const nowIso = new Date().toISOString();
      const preset = WALLET_TYPE_META[input.type] || WALLET_TYPE_META[WalletType.Custom];
      const newWallet: DigitalWallet = {
        id: `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim() || preset.defaultName,
        type: input.type,
        balance: Number.isFinite(Number(input.balance)) ? Number(input.balance) : 0,
        notes: input.notes?.trim() || undefined,
        color: input.color || preset.defaultColor,
        icon: input.icon || preset.defaultIcon,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setState((prev) => ({
        ...prev,
        wallets: [...prev.wallets, newWallet],
      }));
    },
    []
  );

  const updateWallet = useCallback(
    (
      walletId: string,
      updates: {
        name: string;
        type: WalletType;
        balance: number;
        notes?: string;
        color?: string;
        icon?: WalletIcon;
      }
    ) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        wallets: prev.wallets.map((wallet) => {
          if (wallet.id !== walletId) return wallet;
          const preset =
            WALLET_TYPE_META[updates.type] || WALLET_TYPE_META[WalletType.Custom];
          return {
            ...wallet,
            name: updates.name.trim() || wallet.name,
            type: updates.type,
            balance: Number.isFinite(Number(updates.balance))
              ? Number(updates.balance)
              : wallet.balance,
            notes: updates.notes?.trim() || undefined,
            color: updates.color || preset.defaultColor,
            icon: updates.icon || preset.defaultIcon,
            updatedAt: nowIso,
          };
        }),
      }));
    },
    []
  );

  const deleteWallet = useCallback((walletId: string) => {
    setState((prev) => ({
      ...prev,
      wallets: prev.wallets.filter((w) => w.id !== walletId),
    }));
  }, []);

  const addTransaction = useCallback(
    (input: {
      type: TransactionType;
      title: string;
      amount: number;
      category: string;
      date: string;
      walletId?: string;
      destinationWalletId?: string;
      notes?: string;
    }) => {
      const newTx: FinanceTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: input.type,
        title: input.title.trim(),
        amount: Math.max(0, Number(input.amount) || 0),
        category:
          input.type === TransactionType.Transfer
            ? input.category.trim() || TRANSFER_CATEGORY
            : input.category.trim() || 'Other',
        date: input.date || getTodayDateKey(),
        ...(input.walletId ? { walletId: input.walletId } : {}),
        ...(input.type === TransactionType.Transfer && input.destinationWalletId
          ? { destinationWalletId: input.destinationWalletId }
          : {}),
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        wallets: applyTransactionBalanceDelta(prev.wallets, newTx, 1),
        transactions: deduplicateTransactions([newTx, ...prev.transactions]),
      }));
    },
    []
  );

  const updateTransaction = useCallback(
    (
      transactionId: string,
      updates: {
        type: TransactionType;
        title: string;
        amount: number;
        category: string;
        date: string;
        walletId?: string;
        destinationWalletId?: string;
        notes?: string;
      }
    ) => {
      setState((prev) => {
        const existingTx = prev.transactions.find((t) => t.id === transactionId);
        if (!existingTx) return prev;

        const nextTx: FinanceTransaction = {
          ...existingTx,
          type: updates.type,
          title: updates.title.trim(),
          amount: Math.max(0, Number(updates.amount) || 0),
          category:
            updates.type === TransactionType.Transfer
              ? updates.category.trim() || TRANSFER_CATEGORY
              : updates.category.trim() || 'Other',
          date: updates.date || existingTx.date,
          walletId: updates.walletId || undefined,
          destinationWalletId:
            updates.type === TransactionType.Transfer
              ? updates.destinationWalletId || undefined
              : undefined,
          notes: updates.notes?.trim() || undefined,
        };

        return {
          ...prev,
          wallets: reconcileWalletsForTransactionChange(
            prev.wallets,
            existingTx,
            nextTx
          ),
          transactions: prev.transactions.map((tx) =>
            tx.id === transactionId ? nextTx : tx
          ),
        };
      });
    },
    []
  );

  const deleteTransaction = useCallback((transactionId: string) => {
    setState((prev) => {
      const existingTx = prev.transactions.find((t) => t.id === transactionId);
      if (!existingTx) return prev;
      return {
        ...prev,
        wallets: applyTransactionBalanceDelta(prev.wallets, existingTx, -1),
        transactions: prev.transactions.filter((tx) => tx.id !== transactionId),
      };
    });
  }, []);

  const importTransactionsCsv = useCallback(
    (importedTransactions: FinanceTransaction[]) => {
      if (importedTransactions.length === 0) return;
      setState((prev) => {
        const combined = deduplicateTransactions(
          [...importedTransactions, ...prev.transactions],
          { deduplicateBySignature: true }
        );
        const existingIds = new Set(prev.transactions.map((t) => t.id));
        const newlyAdded = combined.filter((t) => !existingIds.has(t.id));

        let nextWallets = prev.wallets;
        for (const tx of newlyAdded) {
          nextWallets = applyTransactionBalanceDelta(nextWallets, tx, 1);
        }

        return {
          ...prev,
          wallets: nextWallets,
          transactions: combined,
        };
      });
    },
    []
  );

  const addSavingsGoal = useCallback(
    (input: {
      name: string;
      category: string;
      currentAmount: number;
      targetAmount: number;
      targetDate?: string;
    }) => {
      const newGoal: SavingsGoal = {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        category: input.category.trim() || 'Savings',
        currentAmount: Math.max(0, Number(input.currentAmount) || 0),
        targetAmount: Math.max(1, Number(input.targetAmount) || 1),
        targetDate: input.targetDate?.trim() || undefined,
        createdAt: getTodayDateKey(),
      };
      setState((prev) => ({
        ...prev,
        savingsGoals: [...prev.savingsGoals, newGoal],
      }));
    },
    []
  );

  const updateSavingsGoal = useCallback(
    (
      goalId: string,
      updates: {
        name: string;
        category: string;
        currentAmount: number;
        targetAmount: number;
        targetDate?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                name: updates.name.trim(),
                category: updates.category.trim() || 'Savings',
                currentAmount: Math.max(0, Number(updates.currentAmount) || 0),
                targetAmount: Math.max(1, Number(updates.targetAmount) || 1),
                targetDate: updates.targetDate?.trim() || undefined,
              }
            : goal
        ),
      }));
    },
    []
  );

  const contributeToSavingsGoal = useCallback((goalId: string, deltaAmount: number) => {
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              currentAmount: Math.max(0, goal.currentAmount + deltaAmount),
            }
          : goal
      ),
    }));
  }, []);

  const deleteSavingsGoal = useCallback((goalId: string) => {
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter((g) => g.id !== goalId),
    }));
  }, []);

  const updatePomodoroSettings = useCallback(
    (updates: Partial<PomodoroSettings>) => {
      setState((prev) => {
        const merged: PomodoroSettings = {
          ...prev.pomodoroSettings,
          ...updates,
        };
        return {
          ...prev,
          pomodoroSettings: {
            ...merged,
            focusMinutes: clampDurationMinutes(merged.focusMinutes, 1, 180),
            shortBreakMinutes: clampDurationMinutes(
              merged.shortBreakMinutes,
              1,
              60
            ),
            longBreakMinutes: clampDurationMinutes(
              merged.longBreakMinutes,
              1,
              90
            ),
            longBreakInterval: clampDurationMinutes(
              merged.longBreakInterval,
              2,
              12
            ),
            ambientVolume: Math.min(
              1,
              Math.max(0, Number(merged.ambientVolume) || 0)
            ),
          },
        };
      });
    },
    []
  );

  const recordPomodoroSession = useCallback(
    (input: {
      mode: PomodoroMode;
      durationMinutes: number;
      taskTitle?: string;
    }) => {
      const now = new Date();
      const newSession: PomodoroSessionRecord = {
        id: `pomo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: input.mode,
        durationMinutes: Math.max(1, Math.round(input.durationMinutes)),
        completedAt: now.toISOString(),
        dateKey: getTodayDateKey(now),
        taskTitle: input.taskTitle?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        pomodoroSessions: [newSession, ...prev.pomodoroSessions],
      }));
    },
    []
  );

  const clearPomodoroSessions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pomodoroSessions: [],
    }));
  }, []);

  const updateProfile = useCallback((profile: UserProfile) => {
    setState((prev) => ({
      ...prev,
      profile: {
        name: profile.name.trim(),
        dailyFocusNote: profile.dailyFocusNote.trim(),
      },
    }));
  }, []);

  const cycleQuote = useCallback(() => {
    setState((prev) => ({
      ...prev,
      quoteOffset: prev.quoteOffset + 1,
    }));
  }, []);

  const setCalendarMode = useCallback((mode: CalendarDisplayMode) => {
    setState((prev) => ({
      ...prev,
      calendarMode: mode,
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDayspaceState();
    setState(fresh);
  }, []);

  const importWorkspaceState = useCallback((nextState: DayspaceState) => {
    setState(nextState);
  }, []);

  const clearAllData = useCallback(() => {
    setState((prev) => createEmptyDayspaceState(prev.profile.name));
  }, []);

  return {
    state,
    storageError,
    cloudSyncStatus,
    cloudSyncError,
    lastSyncedAt,
    hydrationPhase,
    hydrationError,
    canContinueOffline: Boolean(offlineFallbackState),
    migrationCandidate,
    migrationSubmitting,
    retryCloudHydration,
    continueOfflineWithCache,
    confirmImportMigration,
    confirmStartFreshMigration,
    syncNow,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addHabit,
    updateHabit,
    toggleHabitDate,
    deleteHabit,
    addEvent,
    updateEvent,
    deleteEvent,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addWallet,
    updateWallet,
    deleteWallet,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactionsCsv,
    addSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    deleteSavingsGoal,
    updatePomodoroSettings,
    recordPomodoroSession,
    clearPomodoroSessions,
    updateProfile,
    cycleQuote,
    setCalendarMode,
    resetDemoData,
    importWorkspaceState,
    clearAllData,
  };
}
