import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDateKey,
  buildDailyOverviewLine,
  clampDurationMinutes,
  computeBestHabitStreak,
  computeCategorySpending,
  computeHabitProgress,
  computeHabitStreak,
  computeHabitWeeklyCompletion,
  computeJournalMetrics,
  computeMonthlyFinanceSummary,
  computeMultiMonthCashflow,
  computeOverallHabitSummary,
  computePomodoroStats,
  computeSavingsGoalsSummary,
  computeTaskSummary,
  computeWeeklyHabitChartData,
  DEFAULT_POMODORO_SETTINGS,
  filterJournalEntries,
  filterTransactions,
  APP_CURRENCY_CODE,
  APP_CURRENCY_LOCALE,
  APP_CURRENCY_SYMBOL,
  formatCurrency,
  formatDeadlineLabel,
  formatMonthKeyLabel,
  formatTime12Hour,
  formatTimerClock,
  getDailyQuote,
  getDeadlineStatus,
  getDurationSecondsForMode,
  getGreetingByHour,
  getMonthCalendarCells,
  getMonthKeyFromDateKey,
  getMonthTitle,
  getNextPomodoroMode,
  getRecentGratitudes,
  getRecentWeekKeys,
  getTodayDateKey,
  getUpcomingEvents,
  getWeekCalendarDays,
  getWeekRangeLabel,
  shiftMonthKey,
  sortJournalEntries,
  sortTasks,
  sortTasksForDashboard,
} from './productivity';
import {
  CalendarEvent,
  FinanceTransaction,
  HabitItem,
  JournalEntry,
  JournalMood,
  PomodoroMode,
  PomodoroSessionRecord,
  QuoteItem,
  SavingsGoal,
  TaskCategory,
  TaskItem,
  TaskPriority,
  TransactionType,
} from '../types/dayspace';

test('getGreetingByHour formats morning, afternoon, evening with name', () => {
  assert.equal(getGreetingByHour(8, 'Clara'), 'Good morning, Clara');
  assert.equal(getGreetingByHour(14, 'Clara'), 'Good afternoon, Clara');
  assert.equal(getGreetingByHour(19, 'Clara'), 'Good evening, Clara');
  assert.equal(getGreetingByHour(9, '  '), 'Good morning');
});

test('date key formatting and day arithmetic work reliably', () => {
  const sample = new Date(2026, 10, 25); // Nov 25, 2026
  const key = getTodayDateKey(sample);
  assert.equal(key, '2026-11-25');
  assert.equal(addDaysToDateKey(key, 1), '2026-11-26');
  assert.equal(addDaysToDateKey(key, -1), '2026-11-24');
  assert.equal(getRecentWeekKeys(key).length, 7);
  assert.equal(getRecentWeekKeys(key)[6], '2026-11-25');
});

test('formatTime12Hour and formatDeadlineLabel format deadlines cleanly', () => {
  assert.equal(formatTime12Hour('09:30'), '9:30 AM');
  assert.equal(formatTime12Hour('12:00'), '12:00 PM');
  assert.equal(formatTime12Hour('00:15'), '12:15 AM');
  assert.equal(formatTime12Hour('16:45'), '4:45 PM');
  assert.equal(formatDeadlineLabel('2026-11-25', '17:00', '2026-11-25'), 'Today · 5:00 PM');
  assert.equal(formatDeadlineLabel('2026-11-26', undefined, '2026-11-25'), 'Tomorrow');
});

test('getDeadlineStatus evaluates overdue, due-today, upcoming, and completed states', () => {
  const now = new Date(2026, 10, 25, 14, 0); // 2:00 PM Nov 25
  assert.equal(getDeadlineStatus('2026-11-24', undefined, false, now), 'overdue');
  assert.equal(getDeadlineStatus('2026-11-25', '11:00', false, now), 'overdue');
  assert.equal(getDeadlineStatus('2026-11-25', '16:30', false, now), 'due-today');
  assert.equal(getDeadlineStatus('2026-11-26', '09:00', false, now), 'upcoming');
  assert.equal(getDeadlineStatus('2026-11-24', '09:00', true, now), 'completed');
});

test('computeTaskSummary and sortTasks support priority and deadline modes', () => {
  const tasks: TaskItem[] = [
    {
      id: '1',
      title: 'Review design brief',
      category: TaskCategory.Work,
      priority: TaskPriority.Medium,
      dueDate: '2026-11-25',
      dueTime: '17:00',
      completed: false,
      createdAt: '2026-11-25T08:00:00Z',
    },
    {
      id: '2',
      title: 'Morning stretch',
      category: TaskCategory.Wellness,
      priority: TaskPriority.Medium,
      dueDate: '2026-11-25',
      completed: true,
      createdAt: '2026-11-25T07:00:00Z',
    },
    {
      id: '3',
      title: 'Overdue invoice',
      category: TaskCategory.Work,
      priority: TaskPriority.Low,
      dueDate: '2026-11-24',
      completed: false,
      createdAt: '2026-11-24T07:00:00Z',
    },
    {
      id: '4',
      title: 'High priority Friday launch',
      category: TaskCategory.Work,
      priority: TaskPriority.High,
      dueDate: '2026-11-27',
      dueTime: '10:00',
      completed: false,
      createdAt: '2026-11-25T08:00:00Z',
    },
  ];

  const summary = computeTaskSummary(tasks, '2026-11-25');
  assert.equal(summary.total, 4);
  assert.equal(summary.dueToday, 2);
  assert.equal(summary.completedToday, 1);
  assert.equal(summary.dueTodayRemaining, 1);
  assert.equal(summary.completedTotal, 1);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.completionRate, 25);

  const smartSorted = sortTasksForDashboard(tasks, '2026-11-25');
  assert.equal(smartSorted[0].id, '3'); // overdue uncompleted first
  assert.equal(smartSorted[smartSorted.length - 1].id, '2'); // completed last

  const prioritySorted = sortTasks(tasks, '2026-11-25', 'priority');
  assert.equal(prioritySorted[0].id, '4'); // high priority first

  const deadlineSorted = sortTasks(tasks, '2026-11-25', 'deadline');
  assert.equal(deadlineSorted[0].id, '3'); // earliest date first
});

test('getMonthCalendarCells and getWeekCalendarDays build accurate grids', () => {
  // November 2026 starts on Sunday (Nov 1 = Sun), 30 days -> fits in 35 cells
  const novCells = getMonthCalendarCells(2026, 10);
  assert.equal(novCells.length, 35);
  assert.equal(novCells[0].dateKey, '2026-11-01');
  assert.equal(novCells[0].isCurrentMonth, true);
  assert.equal(novCells[29].dateKey, '2026-11-30');
  assert.equal(novCells[30].isCurrentMonth, false);
  assert.equal(getMonthTitle(2026, 10), 'November 2026');

  // Nov 25, 2026 is Wednesday -> week is Sun Nov 22 to Sat Nov 28
  const week = getWeekCalendarDays('2026-11-25');
  assert.equal(week.length, 7);
  assert.equal(week[0], '2026-11-22');
  assert.equal(week[6], '2026-11-28');
  assert.match(getWeekRangeLabel(week), /Nov 22 – Nov 28, 2026/);
});

test('computeHabitProgress and computeHabitStreak evaluate streaks accurately', () => {
  const habits: HabitItem[] = [
    {
      id: 'h1',
      name: 'Read 20 pages',
      cue: 'Evening tea',
      targetDaysPerWeek: 7,
      completedDates: ['2026-11-23', '2026-11-24', '2026-11-25'],
      createdAt: '2026-11-01',
    },
    {
      id: 'h2',
      name: 'Mindful walk',
      cue: 'After lunch',
      targetDaysPerWeek: 5,
      completedDates: ['2026-11-24'],
      createdAt: '2026-11-01',
    },
  ];

  const progress = computeHabitProgress(habits, '2026-11-25');
  assert.equal(progress.completedToday, 1);
  assert.equal(progress.totalHabits, 2);
  assert.equal(progress.percentage, 50);

  assert.equal(computeHabitStreak(habits[0].completedDates, '2026-11-25'), 3);
  assert.equal(computeHabitStreak(habits[1].completedDates, '2026-11-25'), 1);
  assert.equal(computeHabitStreak(['2026-11-20'], '2026-11-25'), 0);
});

test('getUpcomingEvents filters past events and sorts chronologically', () => {
  const events: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'Past meeting',
      date: '2026-11-24',
      startTime: '15:00',
      location: 'Studio',
      category: 'Work',
    },
    {
      id: 'e2',
      title: 'Afternoon tea check-in',
      date: '2026-11-25',
      startTime: '14:30',
      location: 'Home Office',
      category: 'Personal',
    },
    {
      id: 'e3',
      title: 'Morning standup',
      date: '2026-11-25',
      startTime: '09:30',
      location: 'Zoom',
      category: 'Work',
    },
  ];

  const upcoming = getUpcomingEvents(events, '2026-11-25');
  assert.equal(upcoming.length, 2);
  assert.equal(upcoming[0].id, 'e3');
  assert.equal(upcoming[1].id, 'e2');
});

test('buildDailyOverviewLine and getDailyQuote return readable summaries', () => {
  const line = buildDailyOverviewLine(
    {
      total: 5,
      dueToday: 3,
      dueTodayRemaining: 2,
      completedTotal: 2,
      completedToday: 1,
      overdueCount: 0,
      completionRate: 40,
    },
    { completedToday: 3, totalHabits: 4, percentage: 75 },
    1
  );
  assert.equal(
    line,
    '2 tasks left today · 3 of 4 habits logged · 1 event scheduled today'
  );

  const quotes: QuoteItem[] = [
    { id: 'q1', text: 'First', author: 'A' },
    { id: 'q2', text: 'Second', author: 'B' },
  ];
  const base = getDailyQuote(quotes, new Date(2026, 10, 25), 0);
  const next = getDailyQuote(quotes, new Date(2026, 10, 25), 1);
  assert.notEqual(base.id, next.id);
});

test('computeBestHabitStreak, computeWeeklyHabitChartData, and computeOverallHabitSummary work accurately', () => {
  const habits: HabitItem[] = [
    {
      id: 'h1',
      name: 'Morning sunlight',
      cue: '7 AM',
      category: 'Mindfulness',
      targetDaysPerWeek: 7,
      completedDates: [
        '2026-11-10',
        '2026-11-11',
        '2026-11-12',
        '2026-11-13',
        '2026-11-24',
        '2026-11-25',
      ],
      createdAt: '2026-11-01',
    },
    {
      id: 'h2',
      name: 'Outdoor walk',
      cue: '12 PM',
      category: 'Fitness',
      targetDaysPerWeek: 5,
      completedDates: ['2026-11-23', '2026-11-24', '2026-11-25'],
      createdAt: '2026-11-01',
    },
  ];

  assert.equal(computeBestHabitStreak(habits[0].completedDates), 4);
  assert.equal(computeBestHabitStreak([]), 0);

  const weekKeys = getRecentWeekKeys('2026-11-25', 0);
  assert.equal(weekKeys.length, 7);
  assert.equal(weekKeys[0], '2026-11-19');
  assert.equal(weekKeys[6], '2026-11-25');

  const chart = computeWeeklyHabitChartData(habits, weekKeys);
  assert.equal(chart.length, 7);
  assert.equal(chart[6].completedCount, 2);
  assert.equal(chart[6].percentage, 100);
  assert.equal(chart[5].completedCount, 2);
  assert.equal(chart[4].completedCount, 1);
  assert.equal(chart[4].percentage, 50);

  const weeklyGoal = computeHabitWeeklyCompletion(habits[1], weekKeys);
  assert.equal(weeklyGoal.completedDays, 3);
  assert.equal(weeklyGoal.targetDays, 5);
  assert.equal(weeklyGoal.percentage, 60);

  const summary = computeOverallHabitSummary(habits, '2026-11-25', weekKeys);
  assert.equal(summary.completedToday, 2);
  assert.equal(summary.totalHabits, 2);
  assert.equal(summary.todayPercentage, 100);
  assert.equal(summary.weeklyCheckins, 5);
  assert.equal(summary.weeklyTargetTotal, 12);
  assert.equal(summary.weeklyPercentage, 42);
  assert.equal(summary.longestActiveStreak, 3);
  assert.equal(summary.topStreakHabitName, 'Outdoor walk');
});

test('filterJournalEntries, sortJournalEntries, computeJournalMetrics, and getRecentGratitudes work accurately', () => {
  const entries: JournalEntry[] = [
    {
      id: 'j1',
      date: '2026-11-23',
      title: 'Monday reset',
      mood: JournalMood.Reflective,
      gratitude: ['Hot ginger tea', 'Quiet library corner'],
      body: 'Mapped out priorities for the week ahead.',
      tags: ['Planning'],
      createdAt: '2026-11-23T09:00:00Z',
      updatedAt: '2026-11-23T09:00:00Z',
    },
    {
      id: 'j2',
      date: '2026-11-25',
      title: 'Morning sunlight',
      mood: JournalMood.Calm,
      gratitude: ['Crisp autumn breeze', 'Smooth espresso'],
      body: 'Took an unhurried walk through the botanical garden.',
      tags: ['Morning pages', 'Outdoors'],
      createdAt: '2026-11-25T08:00:00Z',
      updatedAt: '2026-11-25T08:00:00Z',
    },
    {
      id: 'j3',
      date: '2026-11-24',
      title: 'Studio breakthrough',
      mood: JournalMood.Calm,
      gratitude: ['Helpful critique from Elena'],
      body: 'Refined the journal layout and color hierarchy.',
      tags: ['Studio'],
      createdAt: '2026-11-24T19:00:00Z',
      updatedAt: '2026-11-24T19:00:00Z',
    },
  ];

  const sorted = sortJournalEntries(entries);
  assert.equal(sorted[0].id, 'j2');
  assert.equal(sorted[1].id, 'j3');
  assert.equal(sorted[2].id, 'j1');

  // Search by gratitude text
  const byGratitude = filterJournalEntries(entries, 'autumn breeze', 'all');
  assert.equal(byGratitude.length, 1);
  assert.equal(byGratitude[0].id, 'j2');

  // Search by body text + mood filter
  const byMoodAndText = filterJournalEntries(entries, 'botanical', JournalMood.Calm);
  assert.equal(byMoodAndText.length, 1);
  assert.equal(byMoodAndText[0].id, 'j2');

  const noMatch = filterJournalEntries(entries, 'botanical', JournalMood.Stressed);
  assert.equal(noMatch.length, 0);

  // Metrics
  const metrics = computeJournalMetrics(entries, '2026-11-25');
  assert.equal(metrics.totalEntries, 3);
  assert.equal(metrics.entriesThisWeek, 3);
  assert.equal(metrics.currentStreak, 3);
  assert.equal(metrics.totalGratitudes, 5);
  assert.equal(metrics.moodCounts[JournalMood.Calm], 2);
  assert.equal(metrics.topMood, JournalMood.Calm);

  // Recent gratitudes
  const gratitudes = getRecentGratitudes(entries, 3);
  assert.equal(gratitudes.length, 3);
  assert.equal(gratitudes[0].text, 'Crisp autumn breeze');
  assert.equal(gratitudes[2].text, 'Helpful critique from Elena');
});

test('computeMonthlyFinanceSummary, computeCategorySpending, computeMultiMonthCashflow, filterTransactions, and computeSavingsGoalsSummary work accurately', () => {
  assert.equal(APP_CURRENCY_CODE, 'IDR');
  assert.equal(APP_CURRENCY_LOCALE, 'id-ID');
  assert.equal(APP_CURRENCY_SYMBOL, 'Rp');
  assert.equal(formatCurrency(1500000), 'Rp1.500.000');
  assert.equal(formatCurrency(1480), 'Rp1.480');
  assert.equal(formatCurrency(164.5), 'Rp165');
  assert.equal(formatCurrency(0), 'Rp0');
  assert.equal(formatCurrency(-50000), '-Rp50.000');
  assert.equal(getMonthKeyFromDateKey('2026-11-25'), '2026-11');
  assert.equal(shiftMonthKey('2026-11', -1), '2026-10');
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  assert.equal(formatMonthKeyLabel('2026-11'), 'November 2026');

  const transactions: FinanceTransaction[] = [
    {
      id: 't1',
      type: TransactionType.Income,
      title: 'Monthly salary',
      amount: 4000,
      category: 'Salary',
      date: '2026-11-01',
      createdAt: '2026-11-01T09:00:00Z',
    },
    {
      id: 't2',
      type: TransactionType.Expense,
      title: 'Apartment rent',
      amount: 1500,
      category: 'Housing',
      date: '2026-11-02',
      createdAt: '2026-11-02T09:00:00Z',
    },
    {
      id: 't3',
      type: TransactionType.Expense,
      title: 'Weekly groceries',
      amount: 300,
      category: 'Groceries',
      date: '2026-11-10',
      createdAt: '2026-11-10T09:00:00Z',
    },
    {
      id: 't4',
      type: TransactionType.Expense,
      title: 'Farmers market',
      amount: 200,
      category: 'Groceries',
      date: '2026-11-18',
      createdAt: '2026-11-18T09:00:00Z',
    },
    {
      id: 't5',
      type: TransactionType.Income,
      title: 'October retainer',
      amount: 3800,
      category: 'Salary',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:00:00Z',
    },
  ];

  const summary = computeMonthlyFinanceSummary(transactions, '2026-11');
  assert.equal(summary.income, 4000);
  assert.equal(summary.expenses, 2000);
  assert.equal(summary.netSavings, 2000);
  assert.equal(summary.savingsRate, 50);
  assert.equal(summary.transactionCount, 4);

  const spending = computeCategorySpending(transactions, '2026-11');
  assert.equal(spending.length, 2);
  assert.equal(spending[0].category, 'Housing');
  assert.equal(spending[0].amount, 1500);
  assert.equal(spending[0].percentage, 75);
  assert.equal(spending[1].category, 'Groceries');
  assert.equal(spending[1].amount, 500);
  assert.equal(spending[1].count, 2);
  assert.equal(spending[1].percentage, 25);

  const cashflow = computeMultiMonthCashflow(transactions, '2026-11', 3);
  assert.equal(cashflow.length, 3);
  assert.equal(cashflow[1].monthKey, '2026-10');
  assert.equal(cashflow[1].income, 3800);
  assert.equal(cashflow[2].monthKey, '2026-11');
  assert.equal(cashflow[2].net, 2000);

  const filtered = filterTransactions(
    transactions,
    '2026-11',
    TransactionType.Expense,
    'Groceries',
    'market'
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 't4');

  const goals: SavingsGoal[] = [
    {
      id: 'g1',
      name: 'Emergency Reserve',
      category: 'Safety Net',
      currentAmount: 5000,
      targetAmount: 10000,
      createdAt: '2026-10-01',
    },
    {
      id: 'g2',
      name: 'Desk Upgrade',
      category: 'Workspace',
      currentAmount: 1000,
      targetAmount: 1000,
      createdAt: '2026-10-01',
    },
  ];

  const goalSummary = computeSavingsGoalsSummary(goals);
  assert.equal(goalSummary.totalSaved, 6000);
  assert.equal(goalSummary.totalTarget, 11000);
  assert.equal(goalSummary.overallPercentage, 55);
  assert.equal(goalSummary.completedCount, 1);
});

test('Pomodoro helpers format clocks, clamp durations, cycle break modes, and compute session stats', () => {
  assert.equal(clampDurationMinutes(0, 1, 60), 1);
  assert.equal(clampDurationMinutes(240, 1, 180), 180);
  assert.equal(clampDurationMinutes(Number.NaN, 5, 60), 5);
  assert.equal(clampDurationMinutes(25.4, 1, 180), 25);

  assert.equal(
    getDurationSecondsForMode(PomodoroMode.Focus, DEFAULT_POMODORO_SETTINGS),
    1500
  );
  assert.equal(
    getDurationSecondsForMode(PomodoroMode.ShortBreak, DEFAULT_POMODORO_SETTINGS),
    300
  );
  assert.equal(
    getDurationSecondsForMode(PomodoroMode.LongBreak, DEFAULT_POMODORO_SETTINGS),
    900
  );

  assert.equal(formatTimerClock(1500), '25:00');
  assert.equal(formatTimerClock(65), '01:05');
  assert.equal(formatTimerClock(-4), '00:00');

  assert.equal(
    getNextPomodoroMode(PomodoroMode.Focus, 0, 4),
    PomodoroMode.ShortBreak
  );
  assert.equal(
    getNextPomodoroMode(PomodoroMode.Focus, 3, 4),
    PomodoroMode.LongBreak
  );
  assert.equal(
    getNextPomodoroMode(PomodoroMode.ShortBreak, 1, 4),
    PomodoroMode.Focus
  );
  assert.equal(
    getNextPomodoroMode(PomodoroMode.LongBreak, 4, 4),
    PomodoroMode.Focus
  );

  const sessions: PomodoroSessionRecord[] = [
    {
      id: 'p1',
      mode: PomodoroMode.Focus,
      durationMinutes: 25,
      completedAt: '2026-11-25T10:00:00Z',
      dateKey: '2026-11-25',
      taskTitle: 'Draft editorial outline',
    },
    {
      id: 'p2',
      mode: PomodoroMode.ShortBreak,
      durationMinutes: 5,
      completedAt: '2026-11-25T10:05:00Z',
      dateKey: '2026-11-25',
    },
    {
      id: 'p3',
      mode: PomodoroMode.Focus,
      durationMinutes: 50,
      completedAt: '2026-11-24T16:00:00Z',
      dateKey: '2026-11-24',
    },
  ];

  const stats = computePomodoroStats(sessions, '2026-11-25');
  assert.equal(stats.completedFocusToday, 1);
  assert.equal(stats.focusMinutesToday, 25);
  assert.equal(stats.completedBreaksToday, 1);
  assert.equal(stats.completedFocusTotal, 2);
  assert.equal(stats.totalFocusMinutes, 75);
  assert.equal(stats.recentSessions[0].id, 'p2');
});


