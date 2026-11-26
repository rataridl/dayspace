export enum NavigationView {
  Dashboard = 'dashboard',
  Tasks = 'tasks',
  Habits = 'habits',
  Journal = 'journal',
  Finance = 'finance',
  Focus = 'focus',
  Calendar = 'calendar',
  Settings = 'settings',
}

export enum TaskPriority {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum TaskCategory {
  Work = 'Work',
  Personal = 'Personal',
  Wellness = 'Wellness',
  Home = 'Home',
}

export enum JournalMood {
  Calm = 'calm',
  Grateful = 'grateful',
  Energized = 'energized',
  Reflective = 'reflective',
  Tired = 'tired',
  Stressed = 'stressed',
}

export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
  Transfer = 'transfer',
}

export enum WalletType {
  Dana = 'dana',
  GoPay = 'gopay',
  Ovo = 'ovo',
  ShopeePay = 'shopeepay',
  LinkAja = 'linkaja',
  Bank = 'bank',
  Cash = 'cash',
  Custom = 'custom',
}

export type WalletIcon =
  | 'wallet'
  | 'smartphone'
  | 'landmark'
  | 'banknote'
  | 'credit-card'
  | 'coins'
  | 'sparkles';

export interface DigitalWallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  notes?: string;
  color: string;
  icon: WalletIcon;
  createdAt: string;
  updatedAt: string;
}

export enum PomodoroMode {
  Focus = 'focus',
  ShortBreak = 'short-break',
  LongBreak = 'long-break',
}

export type AmbientSoundPreset =
  | 'none'
  | 'rain'
  | 'forest-wind'
  | 'brown-noise'
  | 'singing-bowl';

export type CalendarDisplayMode = 'month' | 'week' | 'agenda';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm optional deadline time
  completed: boolean;
  createdAt: string;
}

export interface HabitItem {
  id: string;
  name: string;
  cue: string;
  category?: string;
  targetDaysPerWeek: number;
  completedDates: string[]; // array of YYYY-MM-DD
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  location: string;
  category: string;
  notes?: string;
}

export interface JournalPhoto {
  id: string;
  dataUrl: string;
  name?: string;
  width?: number;
  height?: number;
  addedAt: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  mood: JournalMood;
  gratitude: string[];
  body: string;
  tags: string[];
  photos?: JournalPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  walletId?: string;
  destinationWalletId?: string;
  notes?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  category: string;
  currentAmount: number;
  targetAmount: number;
  targetDate?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartNext: boolean;
  soundEnabled: boolean;
  ambientSound: AmbientSoundPreset;
  ambientVolume: number; // 0..1
}

export interface PomodoroSessionRecord {
  id: string;
  mode: PomodoroMode;
  durationMinutes: number;
  completedAt: string; // ISO
  dateKey: string; // YYYY-MM-DD
  taskTitle?: string;
}

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
}

export interface UserProfile {
  name: string;
  dailyFocusNote: string;
}

export interface DayspaceState {
  profile: UserProfile;
  tasks: TaskItem[];
  habits: HabitItem[];
  events: CalendarEvent[];
  journalEntries: JournalEntry[];
  wallets: DigitalWallet[];
  transactions: FinanceTransaction[];
  savingsGoals: SavingsGoal[];
  pomodoroSettings: PomodoroSettings;
  pomodoroSessions: PomodoroSessionRecord[];
  quoteOffset: number;
  calendarMode: CalendarDisplayMode;
}
