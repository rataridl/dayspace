import {
  CalendarEvent,
  FinanceTransaction,
  HabitItem,
  JournalEntry,
  JournalMood,
  PomodoroMode,
  PomodoroSessionRecord,
  PomodoroSettings,
  QuoteItem,
  SavingsGoal,
  TaskItem,
  TaskPriority,
  TransactionType,
} from '../types/dayspace';

export interface TaskSummaryMetrics {
  total: number;
  dueToday: number;
  dueTodayRemaining: number;
  completedTotal: number;
  completedToday: number;
  overdueCount: number;
  completionRate: number;
}

export interface HabitProgressMetrics {
  completedToday: number;
  totalHabits: number;
  percentage: number;
}

export interface CalendarMonthCell {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

export type TaskSortOption = 'smart' | 'deadline' | 'priority';

export type DeadlineStatus = 'completed' | 'overdue' | 'due-today' | 'upcoming';

export function getTodayDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToDateKey(dateKey: string, offsetDays: number): string {
  const dt = parseDateKey(dateKey);
  dt.setDate(dt.getDate() + offsetDays);
  return getTodayDateKey(dt);
}

export function formatDisplayDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatShortDateLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDaysToDateKey(todayKey, 1)) return 'Tomorrow';
  if (dateKey === addDaysToDateKey(todayKey, -1)) return 'Yesterday';

  const dt = parseDateKey(dateKey);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(dt);
}

export function formatLongDateFromKey(dateKey: string): string {
  const dt = parseDateKey(dateKey);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(dt);
}

export function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hourStr, minuteStr] = time24.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time24;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatDeadlineLabel(
  dueDate: string,
  dueTime: string | undefined,
  todayKey: string
): string {
  const dateLabel = formatShortDateLabel(dueDate, todayKey);
  if (!dueTime) return dateLabel;
  return `${dateLabel} · ${formatTime12Hour(dueTime)}`;
}

export function getDeadlineStatus(
  dueDate: string,
  dueTime: string | undefined,
  completed: boolean,
  now: Date = new Date()
): DeadlineStatus {
  if (completed) return 'completed';
  const todayKey = getTodayDateKey(now);
  if (dueDate < todayKey) return 'overdue';
  if (dueDate > todayKey) return 'upcoming';

  if (dueTime && dueTime.includes(':')) {
    const [h, m] = dueTime.split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dueMinutes = h * 60 + m;
    if (!Number.isNaN(dueMinutes) && dueMinutes < nowMinutes) {
      return 'overdue';
    }
  }
  return 'due-today';
}

export function getGreetingByHour(hour: number, name: string): string {
  const cleanName = name.trim();
  const prefix =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return cleanName ? `${prefix}, ${cleanName}` : prefix;
}

export function computeTaskSummary(
  tasks: TaskItem[],
  todayKey: string
): TaskSummaryMetrics {
  const total = tasks.length;
  const todayTasks = tasks.filter((t) => t.dueDate === todayKey);
  const dueToday = todayTasks.length;
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const dueTodayRemaining = dueToday - completedToday;
  const completedTotal = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter(
    (t) => !t.completed && t.dueDate < todayKey
  ).length;
  const completionRate =
    total === 0 ? 0 : Math.round((completedTotal / total) * 100);

  return {
    total,
    dueToday,
    dueTodayRemaining,
    completedTotal,
    completedToday,
    overdueCount,
    completionRate,
  };
}

export function sortTasks(
  tasks: TaskItem[],
  todayKey: string,
  sortBy: TaskSortOption = 'smart'
): TaskItem[] {
  const priorityWeight: Record<TaskPriority, number> = {
    [TaskPriority.High]: 0,
    [TaskPriority.Medium]: 1,
    [TaskPriority.Low]: 2,
  };

  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (sortBy === 'priority') {
      const pDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (pDiff !== 0) return pDiff;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59');
    }

    if (sortBy === 'deadline') {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      const timeDiff = (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59');
      if (timeDiff !== 0) return timeDiff;
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }

    // 'smart': overdue/today first, then dueDate, then dueTime, then priority
    const aTodayOrOverdue = a.dueDate <= todayKey ? 0 : 1;
    const bTodayOrOverdue = b.dueDate <= todayKey ? 0 : 1;
    if (aTodayOrOverdue !== bTodayOrOverdue) {
      return aTodayOrOverdue - bTodayOrOverdue;
    }
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    const pDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (pDiff !== 0) return pDiff;
    return (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59');
  });
}

export function sortTasksForDashboard(
  tasks: TaskItem[],
  todayKey: string
): TaskItem[] {
  return sortTasks(tasks, todayKey, 'smart');
}

export function computeHabitProgress(
  habits: HabitItem[],
  todayKey: string
): HabitProgressMetrics {
  const totalHabits = habits.length;
  if (totalHabits === 0) {
    return { completedToday: 0, totalHabits: 0, percentage: 0 };
  }
  const completedToday = habits.filter((h) =>
    h.completedDates.includes(todayKey)
  ).length;
  const percentage = Math.round((completedToday / totalHabits) * 100);

  return { completedToday, totalHabits, percentage };
}

export function computeHabitStreak(
  completedDates: string[],
  todayKey: string
): number {
  if (completedDates.length === 0) return 0;
  const dateSet = new Set(completedDates);

  let cursor = todayKey;
  if (!dateSet.has(todayKey)) {
    const yesterdayKey = addDaysToDateKey(todayKey, -1);
    if (!dateSet.has(yesterdayKey)) {
      return 0;
    }
    cursor = yesterdayKey;
  }

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }
  return streak;
}

export interface WeeklyHabitDayStat {
  dateKey: string;
  dayLabel: string;
  dayNum: string;
  completedCount: number;
  totalHabits: number;
  percentage: number;
}

export interface HabitWeeklyCompletion {
  completedDays: number;
  targetDays: number;
  percentage: number;
}

export interface OverallHabitSummary {
  completedToday: number;
  totalHabits: number;
  todayPercentage: number;
  weeklyCheckins: number;
  weeklyTargetTotal: number;
  weeklyPercentage: number;
  longestActiveStreak: number;
  topStreakHabitName: string | null;
}

export function computeBestHabitStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const uniqueSorted = Array.from(new Set(completedDates)).sort((a, b) =>
    a.localeCompare(b)
  );
  let best = 1;
  let current = 1;
  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const expectedNext = addDaysToDateKey(uniqueSorted[i - 1], 1);
    if (uniqueSorted[i] === expectedNext) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

export function getRecentWeekKeys(
  todayKey: string,
  weekOffset: number = 0
): string[] {
  const anchorKey = addDaysToDateKey(todayKey, weekOffset * 7);
  const keys: string[] = [];
  for (let i = -6; i <= 0; i += 1) {
    keys.push(addDaysToDateKey(anchorKey, i));
  }
  return keys;
}

export function computeWeeklyHabitChartData(
  habits: HabitItem[],
  weekKeys: string[]
): WeeklyHabitDayStat[] {
  const totalHabits = habits.length;
  return weekKeys.map((dateKey) => {
    const dt = parseDateKey(dateKey);
    const dayLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
    }).format(dt);
    const dayNum = String(dt.getDate());
    const completedCount = habits.filter((h) =>
      h.completedDates.includes(dateKey)
    ).length;
    const percentage =
      totalHabits === 0 ? 0 : Math.round((completedCount / totalHabits) * 100);

    return {
      dateKey,
      dayLabel,
      dayNum,
      completedCount,
      totalHabits,
      percentage,
    };
  });
}

export function computeHabitWeeklyCompletion(
  habit: HabitItem,
  weekKeys: string[]
): HabitWeeklyCompletion {
  const weekSet = new Set(weekKeys);
  const completedDays = habit.completedDates.filter((d) =>
    weekSet.has(d)
  ).length;
  const targetDays = Math.max(1, habit.targetDaysPerWeek);
  const percentage = Math.min(100, Math.round((completedDays / targetDays) * 100));
  return { completedDays, targetDays, percentage };
}

export function computeOverallHabitSummary(
  habits: HabitItem[],
  todayKey: string,
  weekKeys: string[]
): OverallHabitSummary {
  const todayMetrics = computeHabitProgress(habits, todayKey);
  const weekSet = new Set(weekKeys);

  let weeklyCheckins = 0;
  let weeklyTargetTotal = 0;
  let longestActiveStreak = 0;
  let topStreakHabitName: string | null = null;

  for (const habit of habits) {
    weeklyCheckins += habit.completedDates.filter((d) => weekSet.has(d)).length;
    weeklyTargetTotal += Math.max(1, habit.targetDaysPerWeek);
    const streak = computeHabitStreak(habit.completedDates, todayKey);
    if (streak > longestActiveStreak) {
      longestActiveStreak = streak;
      topStreakHabitName = habit.name;
    }
  }

  const weeklyPercentage =
    weeklyTargetTotal === 0
      ? 0
      : Math.min(100, Math.round((weeklyCheckins / weeklyTargetTotal) * 100));

  return {
    completedToday: todayMetrics.completedToday,
    totalHabits: todayMetrics.totalHabits,
    todayPercentage: todayMetrics.percentage,
    weeklyCheckins,
    weeklyTargetTotal,
    weeklyPercentage,
    longestActiveStreak,
    topStreakHabitName,
  };
}

export function getMonthCalendarCells(
  year: number,
  monthIndex: number
): CalendarMonthCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = startDayOfWeek + daysInMonth > 35 ? 42 : 35;

  const gridStart = new Date(year, monthIndex, 1 - startDayOfWeek);
  const cells: CalendarMonthCell[] = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dt = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    cells.push({
      dateKey: getTodayDateKey(dt),
      dayNumber: dt.getDate(),
      isCurrentMonth: dt.getMonth() === monthIndex && dt.getFullYear() === year,
    });
  }

  return cells;
}

export function getWeekCalendarDays(anchorDateKey: string): string[] {
  const anchor = parseDateKey(anchorDateKey);
  const dayOfWeek = anchor.getDay(); // 0 = Sun
  const sunday = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - dayOfWeek
  );
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dt = new Date(
      sunday.getFullYear(),
      sunday.getMonth(),
      sunday.getDate() + i
    );
    days.push(getTodayDateKey(dt));
  }
  return days;
}

export function getMonthTitle(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1));
}

export function getWeekRangeLabel(weekDays: string[]): string {
  if (weekDays.length === 0) return '';
  const start = parseDateKey(weekDays[0]);
  const end = parseDateKey(weekDays[weekDays.length - 1]);
  const startFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(start);
  const endFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(end);
  return `${startFmt} – ${endFmt}`;
}

export function getUpcomingEvents(
  events: CalendarEvent[],
  todayKey: string
): CalendarEvent[] {
  return [...events]
    .filter((event) => event.date >= todayKey)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
}

export function buildDailyOverviewLine(
  taskSummary: TaskSummaryMetrics,
  habitProgress: HabitProgressMetrics,
  upcomingTodayCount: number
): string {
  const taskPart =
    taskSummary.dueTodayRemaining === 1
      ? '1 task left today'
      : `${taskSummary.dueTodayRemaining} tasks left today`;
  const habitPart = `${habitProgress.completedToday} of ${habitProgress.totalHabits} habits logged`;
  const eventPart =
    upcomingTodayCount === 1
      ? '1 event scheduled today'
      : `${upcomingTodayCount} events scheduled today`;
  return `${taskPart} · ${habitPart} · ${eventPart}`;
}

export function getDailyQuote(
  quotes: QuoteItem[],
  date: Date,
  offset: number = 0
): QuoteItem {
  if (quotes.length === 0) {
    return {
      id: 'fallback',
      text: 'Calm clarity comes from deciding what matters most today.',
      author: 'DAYSPACE',
    };
  }
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = (((dayOfYear + offset) % quotes.length) + quotes.length) % quotes.length;
  return quotes[index];
}

export const JOURNAL_MOOD_ORDER: JournalMood[] = [
  JournalMood.Calm,
  JournalMood.Grateful,
  JournalMood.Energized,
  JournalMood.Reflective,
  JournalMood.Tired,
  JournalMood.Stressed,
];

export const JOURNAL_MOOD_LABELS: Record<JournalMood, string> = {
  [JournalMood.Calm]: 'Calm',
  [JournalMood.Grateful]: 'Grateful',
  [JournalMood.Energized]: 'Energized',
  [JournalMood.Reflective]: 'Reflective',
  [JournalMood.Tired]: 'Tired',
  [JournalMood.Stressed]: 'Stressed',
};

export interface JournalMetrics {
  totalEntries: number;
  entriesThisWeek: number;
  currentStreak: number;
  totalGratitudes: number;
  moodCounts: Record<JournalMood, number>;
  topMood: JournalMood | null;
}

export interface GratitudeHighlight {
  entryId: string;
  entryTitle: string;
  date: string;
  text: string;
}

export function sortJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function filterJournalEntries(
  entries: JournalEntry[],
  searchQuery: string,
  moodFilter: JournalMood | 'all' = 'all'
): JournalEntry[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const sorted = sortJournalEntries(entries);

  return sorted.filter((entry) => {
    if (moodFilter !== 'all' && entry.mood !== moodFilter) {
      return false;
    }
    if (!normalizedQuery) return true;

    const moodLabel = JOURNAL_MOOD_LABELS[entry.mood]?.toLowerCase() || '';
    const dateLabel = formatLongDateFromKey(entry.date).toLowerCase();
    const haystack = [
      entry.title,
      entry.body,
      moodLabel,
      entry.date,
      dateLabel,
      ...entry.gratitude,
      ...entry.tags,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function computeJournalMetrics(
  entries: JournalEntry[],
  todayKey: string
): JournalMetrics {
  const weekKeys = new Set(getRecentWeekKeys(todayKey, 0));
  const moodCounts: Record<JournalMood, number> = {
    [JournalMood.Calm]: 0,
    [JournalMood.Grateful]: 0,
    [JournalMood.Energized]: 0,
    [JournalMood.Reflective]: 0,
    [JournalMood.Tired]: 0,
    [JournalMood.Stressed]: 0,
  };

  let entriesThisWeek = 0;
  let totalGratitudes = 0;
  const uniqueEntryDates: string[] = [];

  for (const entry of entries) {
    if (weekKeys.has(entry.date)) {
      entriesThisWeek += 1;
    }
    totalGratitudes += entry.gratitude.filter((g) => g.trim().length > 0).length;
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    uniqueEntryDates.push(entry.date);
  }

  let topMood: JournalMood | null = null;
  let maxMoodCount = 0;
  for (const mood of JOURNAL_MOOD_ORDER) {
    if (moodCounts[mood] > maxMoodCount) {
      maxMoodCount = moodCounts[mood];
      topMood = mood;
    }
  }

  const currentStreak = computeHabitStreak(uniqueEntryDates, todayKey);

  return {
    totalEntries: entries.length,
    entriesThisWeek,
    currentStreak,
    totalGratitudes,
    moodCounts,
    topMood,
  };
}

export function getRecentGratitudes(
  entries: JournalEntry[],
  limit: number = 6
): GratitudeHighlight[] {
  const sorted = sortJournalEntries(entries);
  const items: GratitudeHighlight[] = [];
  for (const entry of sorted) {
    for (const line of entry.gratitude) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      items.push({
        entryId: entry.id,
        entryTitle: entry.title,
        date: entry.date,
        text: trimmed,
      });
      if (items.length >= limit) {
        return items;
      }
    }
  }
  return items;
}

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Gift',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Groceries',
  'Dining',
  'Transport',
  'Utilities',
  'Wellness',
  'Leisure',
  'Other',
] as const;

export interface MonthlyFinanceSummary {
  monthKey: string;
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
}

export interface CategorySpendingItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyCashflowPoint {
  monthKey: string;
  shortLabel: string;
  income: number;
  expenses: number;
  net: number;
}

export interface SavingsGoalsSummary {
  totalSaved: number;
  totalTarget: number;
  overallPercentage: number;
  completedCount: number;
}

export {
  APP_CURRENCY_CODE,
  APP_CURRENCY_LOCALE,
  APP_CURRENCY_SYMBOL,
  formatCurrency,
} from './currency';

export function getMonthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function shiftMonthKey(monthKey: string, offsetMonths: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const dt = new Date(year, month - 1 + offsetMonths, 1);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthKeyLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

export function computeMonthlyFinanceSummary(
  transactions: FinanceTransaction[],
  monthKey: string
): MonthlyFinanceSummary {
  let income = 0;
  let expenses = 0;
  let transactionCount = 0;

  for (const tx of transactions) {
    if (getMonthKeyFromDateKey(tx.date) !== monthKey) continue;
    transactionCount += 1;
    if (tx.type === TransactionType.Income) {
      income += tx.amount;
    } else if (tx.type === TransactionType.Expense) {
      expenses += tx.amount;
    }
  }

  const netSavings = income - expenses;
  const savingsRate =
    income <= 0 ? 0 : Math.max(0, Math.round((netSavings / income) * 100));

  return {
    monthKey,
    income,
    expenses,
    netSavings,
    savingsRate,
    transactionCount,
  };
}

export function computeCategorySpending(
  transactions: FinanceTransaction[],
  monthKey: string
): CategorySpendingItem[] {
  const totals = new Map<string, { amount: number; count: number }>();
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (
      tx.type !== TransactionType.Expense ||
      getMonthKeyFromDateKey(tx.date) !== monthKey
    ) {
      continue;
    }
    totalExpenses += tx.amount;
    const prev = totals.get(tx.category) || { amount: 0, count: 0 };
    totals.set(tx.category, {
      amount: prev.amount + tx.amount,
      count: prev.count + 1,
    });
  }

  return Array.from(totals.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage:
        totalExpenses === 0
          ? 0
          : Math.round((data.amount / totalExpenses) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function computeMultiMonthCashflow(
  transactions: FinanceTransaction[],
  endMonthKey: string,
  monthsCount: number = 6
): MonthlyCashflowPoint[] {
  const points: MonthlyCashflowPoint[] = [];
  for (let i = -(monthsCount - 1); i <= 0; i += 1) {
    const mk = shiftMonthKey(endMonthKey, i);
    const [year, month] = mk.split('-').map(Number);
    const shortLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
    }).format(new Date(year, month - 1, 1));
    const summary = computeMonthlyFinanceSummary(transactions, mk);
    points.push({
      monthKey: mk,
      shortLabel,
      income: summary.income,
      expenses: summary.expenses,
      net: summary.netSavings,
    });
  }
  return points;
}

export function filterTransactions(
  transactions: FinanceTransaction[],
  monthKey: string | 'all',
  typeFilter: TransactionType | 'all' = 'all',
  categoryFilter: string = 'All',
  searchQuery: string = '',
  walletFilter: string = 'all',
  dateFilter: string = '',
  walletNamesById?: Record<string, string>
): FinanceTransaction[] {
  const query = searchQuery.trim().toLowerCase();

  return [...transactions]
    .filter((tx) => {
      if (monthKey !== 'all' && getMonthKeyFromDateKey(tx.date) !== monthKey) {
        return false;
      }
      if (dateFilter && tx.date !== dateFilter) {
        return false;
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }
      if (categoryFilter !== 'All' && tx.category !== categoryFilter) {
        return false;
      }
      if (
        walletFilter !== 'all' &&
        tx.walletId !== walletFilter &&
        tx.destinationWalletId !== walletFilter
      ) {
        return false;
      }
      if (!query) return true;
      const sourceWalletName =
        (tx.walletId && walletNamesById?.[tx.walletId]) || '';
      const destWalletName =
        (tx.destinationWalletId && walletNamesById?.[tx.destinationWalletId]) ||
        '';
      const haystack = `${tx.title} ${tx.category} ${tx.notes || ''} ${tx.date} ${sourceWalletName} ${destWalletName}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function computeSavingsGoalsSummary(
  goals: SavingsGoal[]
): SavingsGoalsSummary {
  let totalSaved = 0;
  let totalTarget = 0;
  let completedCount = 0;

  for (const goal of goals) {
    totalSaved += goal.currentAmount;
    totalTarget += goal.targetAmount;
    if (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount) {
      completedCount += 1;
    }
  }

  const overallPercentage =
    totalTarget <= 0
      ? 0
      : Math.min(100, Math.round((totalSaved / totalTarget) * 100));

  return {
    totalSaved,
    totalTarget,
    overallPercentage,
    completedCount,
  };
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartNext: false,
  soundEnabled: true,
  ambientSound: 'none',
  ambientVolume: 0.35,
};

export function clampDurationMinutes(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getDurationSecondsForMode(
  mode: PomodoroMode,
  settings: PomodoroSettings
): number {
  if (mode === PomodoroMode.Focus) {
    return clampDurationMinutes(settings.focusMinutes, 1, 180) * 60;
  }
  if (mode === PomodoroMode.ShortBreak) {
    return clampDurationMinutes(settings.shortBreakMinutes, 1, 60) * 60;
  }
  return clampDurationMinutes(settings.longBreakMinutes, 1, 90) * 60;
}

export function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getNextPomodoroMode(
  currentMode: PomodoroMode,
  completedFocusToday: number,
  longBreakInterval: number
): PomodoroMode {
  if (currentMode === PomodoroMode.Focus) {
    const safeInterval = Math.max(2, longBreakInterval);
    const nextFocusCount = completedFocusToday + 1;
    return nextFocusCount % safeInterval === 0
      ? PomodoroMode.LongBreak
      : PomodoroMode.ShortBreak;
  }
  return PomodoroMode.Focus;
}

export interface PomodoroStats {
  completedFocusToday: number;
  focusMinutesToday: number;
  completedBreaksToday: number;
  completedFocusTotal: number;
  totalFocusMinutes: number;
  recentSessions: PomodoroSessionRecord[];
}

export function computePomodoroStats(
  sessions: PomodoroSessionRecord[],
  todayKey: string
): PomodoroStats {
  let completedFocusToday = 0;
  let focusMinutesToday = 0;
  let completedBreaksToday = 0;
  let completedFocusTotal = 0;
  let totalFocusMinutes = 0;

  for (const session of sessions) {
    if (session.mode === PomodoroMode.Focus) {
      completedFocusTotal += 1;
      totalFocusMinutes += session.durationMinutes;
      if (session.dateKey === todayKey) {
        completedFocusToday += 1;
        focusMinutesToday += session.durationMinutes;
      }
    } else if (session.dateKey === todayKey) {
      completedBreaksToday += 1;
    }
  }

  const recentSessions = [...sessions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );

  return {
    completedFocusToday,
    focusMinutesToday,
    completedBreaksToday,
    completedFocusTotal,
    totalFocusMinutes,
    recentSessions,
  };
}
