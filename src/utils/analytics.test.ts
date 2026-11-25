import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HabitItem,
  PomodoroMode,
  PomodoroSessionRecord,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/dayspace';
import {
  computeDashboardAnalytics,
  getDateRangeWindow,
  getMondayToSundayWeekKeys,
} from './analytics';

test('getMondayToSundayWeekKeys builds Mon-Sun week around a Wednesday date', () => {
  // 2026-11-25 is Wednesday -> Mon is Nov 23, Sun is Nov 29
  const week = getMondayToSundayWeekKeys('2026-11-25');
  assert.equal(week.length, 7);
  assert.equal(week[0], '2026-11-23');
  assert.equal(week[2], '2026-11-25');
  assert.equal(week[6], '2026-11-29');

  const todayWin = getDateRangeWindow('today', '2026-11-25');
  assert.equal(todayWin.startKey, '2026-11-25');
  assert.equal(todayWin.endKey, '2026-11-25');

  const weekWin = getDateRangeWindow('week', '2026-11-25');
  assert.equal(weekWin.startKey, '2026-11-23');
  assert.equal(weekWin.endKey, '2026-11-29');
  assert.equal(weekWin.elapsedDays, 3);

  const monthWin = getDateRangeWindow('month', '2026-11-25');
  assert.equal(monthWin.startKey, '2026-11-01');
  assert.equal(monthWin.endKey, '2026-11-30');
  assert.equal(monthWin.elapsedDays, 25);
});

test('computeDashboardAnalytics returns insufficient data score and zero fake metrics on empty workspace', () => {
  const snapshot = computeDashboardAnalytics(
    { tasks: [], habits: [], pomodoroSessions: [] },
    'week',
    '2026-11-25'
  );

  assert.equal(snapshot.hasAnyWorkspaceData, false);
  assert.equal(snapshot.tasksCompletedThisWeek, 0);
  assert.equal(snapshot.weeklyTaskRate, null);
  assert.equal(snapshot.dailyHabitRate, null);
  assert.equal(snapshot.weeklyHabitRate, null);
  assert.equal(snapshot.focusMinutesToday, 0);
  assert.equal(snapshot.productivityScore.hasSufficientData, false);
  assert.equal(snapshot.productivityScore.score, null);
  assert.equal(snapshot.categoryInsights.length, 0);
});

test('computeDashboardAnalytics computes task insights, habits, focus, trends, and weighted score dynamically across filters', () => {
  const tasks: TaskItem[] = [
    {
      id: 't1',
      title: 'Monday draft',
      category: TaskCategory.Work,
      priority: TaskPriority.High,
      dueDate: '2026-11-23', // Mon
      completed: true,
      createdAt: '2026-11-23T08:00:00Z',
    },
    {
      id: 't2',
      title: 'Wednesday review',
      category: TaskCategory.Work,
      priority: TaskPriority.Medium,
      dueDate: '2026-11-25', // Wed (today)
      completed: true,
      createdAt: '2026-11-25T08:00:00Z',
    },
    {
      id: 't3',
      title: 'Wednesday groceries',
      category: TaskCategory.Home,
      priority: TaskPriority.Low,
      dueDate: '2026-11-25', // Wed (today)
      completed: false,
      createdAt: '2026-11-25T09:00:00Z',
    },
    {
      id: 't4',
      title: 'Previous week task',
      category: TaskCategory.Personal,
      priority: TaskPriority.Low,
      dueDate: '2026-11-18', // Prior week Wed (100% last week)
      completed: true,
      createdAt: '2026-11-18T09:00:00Z',
    },
  ];

  const habits: HabitItem[] = [
    {
      id: 'h1',
      name: 'Morning sunlight',
      cue: '7 AM',
      targetDaysPerWeek: 7,
      completedDates: ['2026-11-23', '2026-11-24', '2026-11-25'],
      createdAt: '2026-11-01',
    },
    {
      id: 'h2',
      name: 'Outdoor walk',
      cue: '12 PM',
      targetDaysPerWeek: 5,
      completedDates: ['2026-11-24'],
      createdAt: '2026-11-01',
    },
  ];

  const pomodoroSessions: PomodoroSessionRecord[] = [
    {
      id: 'p1',
      mode: PomodoroMode.Focus,
      durationMinutes: 25,
      completedAt: '2026-11-25T09:25:00Z',
      dateKey: '2026-11-25',
    },
    {
      id: 'p2',
      mode: PomodoroMode.Focus,
      durationMinutes: 50,
      completedAt: '2026-11-23T14:00:00Z',
      dateKey: '2026-11-23',
    },
    {
      id: 'p3',
      mode: PomodoroMode.ShortBreak,
      durationMinutes: 5,
      completedAt: '2026-11-25T09:30:00Z',
      dateKey: '2026-11-25',
    },
  ];

  // Week view
  const weekSnap = computeDashboardAnalytics(
    { tasks, habits, pomodoroSessions },
    'week',
    '2026-11-25'
  );
  assert.equal(weekSnap.tasksCompletedThisWeek, 2);
  assert.equal(weekSnap.tasksTotalThisWeek, 3);
  assert.equal(weekSnap.weeklyTaskRate, 67);
  assert.equal(weekSnap.tasksPendingInRange, 1);
  assert.equal(weekSnap.taskTrendDelta, -33); // 67% vs 100% prior week
  assert.equal(weekSnap.categoryInsights.length, 2);
  assert.equal(weekSnap.categoryInsights[0].category, TaskCategory.Work);
  assert.equal(weekSnap.categoryInsights[0].percentage, 100);

  assert.equal(weekSnap.totalActiveHabits, 2);
  assert.equal(weekSnap.dailyHabitRate, 50);
  assert.equal(weekSnap.longestActiveStreak, 3);
  assert.equal(weekSnap.topStreakHabitName, 'Morning sunlight');

  assert.equal(weekSnap.focusMinutesToday, 25);
  assert.equal(weekSnap.focusMinutesThisWeek, 75);
  assert.equal(weekSnap.focusSessionsThisWeek, 2); // short break excluded from focus count

  assert.equal(weekSnap.weekdaySeries.length, 7);
  assert.equal(weekSnap.weekdaySeries[0].dayLabel, 'Mon');
  assert.equal(weekSnap.weekdaySeries[0].focusMinutes, 50);
  assert.equal(weekSnap.weekdaySeries[2].isToday, true);
  assert.equal(weekSnap.weekdaySeries[2].completedTasks, 1);

  assert.equal(weekSnap.productivityScore.hasSufficientData, true);
  assert.ok(
    weekSnap.productivityScore.score !== null &&
      weekSnap.productivityScore.score > 0 &&
      weekSnap.productivityScore.score <= 100
  );

  // Today view updates range metrics cleanly
  const todaySnap = computeDashboardAnalytics(
    { tasks, habits, pomodoroSessions },
    'today',
    '2026-11-25'
  );
  assert.equal(todaySnap.tasksTotalInRange, 2);
  assert.equal(todaySnap.tasksCompletedInRange, 1);
  assert.equal(todaySnap.rangeTaskRate, 50);
  assert.equal(todaySnap.focusMinutesInRange, 25);

  // Month view includes prior week task t4
  const monthSnap = computeDashboardAnalytics(
    { tasks, habits, pomodoroSessions },
    'month',
    '2026-11-25'
  );
  assert.equal(monthSnap.tasksTotalInRange, 4);
  assert.equal(monthSnap.tasksCompletedInRange, 3);
  assert.equal(monthSnap.rangeTaskRate, 75);
});
