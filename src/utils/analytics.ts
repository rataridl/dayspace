import {
  HabitItem,
  PomodoroMode,
  PomodoroSessionRecord,
  TaskCategory,
  TaskItem,
} from '../types/dayspace';
import {
  addDaysToDateKey,
  computeHabitStreak,
  getTodayDateKey,
  parseDateKey,
} from './productivity';

export type AnalyticsDateRange = 'today' | 'week' | 'month';

export interface DateRangeWindow {
  range: AnalyticsDateRange;
  label: string;
  startKey: string;
  endKey: string;
  prevStartKey: string;
  prevEndKey: string;
  elapsedDays: number;
}

export interface WeekdayProductivityPoint {
  dateKey: string;
  dayLabel: string; // Mon..Sun
  isToday: boolean;
  completedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  taskRate: number;
  completedHabits: number;
  totalHabits: number;
  habitRate: number;
  focusMinutes: number;
  focusSessions: number;
}

export interface TaskCategoryInsight {
  category: TaskCategory;
  completed: number;
  pending: number;
  total: number;
  percentage: number;
}

export interface HabitStreakHighlight {
  id: string;
  name: string;
  streak: number;
  completedInRange: number;
}

export interface ScorePillarBreakdown {
  key: 'tasks' | 'habits' | 'focus';
  label: string;
  score: number | null;
  weightPercent: number;
  detail: string;
}

export interface ProductivityScoreResult {
  score: number | null;
  hasSufficientData: boolean;
  ratingLabel: string;
  explanation: string;
  pillars: ScorePillarBreakdown[];
}

export interface DashboardAnalyticsSnapshot {
  window: DateRangeWindow;
  // Weekly / range task metrics
  tasksCompletedThisWeek: number;
  tasksTotalThisWeek: number;
  weeklyTaskRate: number | null;
  tasksCompletedInRange: number;
  tasksPendingInRange: number;
  tasksTotalInRange: number;
  rangeTaskRate: number | null;
  allPendingTasksCount: number;
  taskTrendDelta: number | null; // percentage point diff vs prior period when prior period has tasks
  categoryInsights: TaskCategoryInsight[];

  // Habit analytics
  totalActiveHabits: number;
  dailyHabitRate: number | null;
  dailyHabitsCompleted: number;
  weeklyHabitRate: number | null;
  rangeHabitRate: number | null;
  habitCheckinsInRange: number;
  longestActiveStreak: number;
  topStreakHabitName: string | null;
  habitStreaks: HabitStreakHighlight[];

  // Focus time analytics
  focusMinutesToday: number;
  focusMinutesThisWeek: number;
  focusMinutesInRange: number;
  focusSessionsToday: number;
  focusSessionsThisWeek: number;
  focusSessionsInRange: number;
  focusSessionsTotal: number;

  // Mon–Sun series (adapts to selected filter)
  weekdaySeries: WeekdayProductivityPoint[];
  weekdaySeriesSubtitle: string;

  // Personal productivity score
  productivityScore: ProductivityScoreResult;

  // Overall empty check
  hasAnyWorkspaceData: boolean;
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function getMondayToSundayWeekKeys(todayKey: string): string[] {
  const dt = parseDateKey(todayKey);
  const dayOfWeek = dt.getDay(); // 0=Sun..6=Sat
  const offsetFromMonday = (dayOfWeek + 6) % 7;
  const mondayKey = addDaysToDateKey(todayKey, -offsetFromMonday);
  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    keys.push(addDaysToDateKey(mondayKey, i));
  }
  return keys;
}

export function getDateRangeWindow(
  range: AnalyticsDateRange,
  todayKey: string
): DateRangeWindow {
  if (range === 'today') {
    const yesterdayKey = addDaysToDateKey(todayKey, -1);
    return {
      range,
      label: 'Today',
      startKey: todayKey,
      endKey: todayKey,
      prevStartKey: yesterdayKey,
      prevEndKey: yesterdayKey,
      elapsedDays: 1,
    };
  }

  if (range === 'week') {
    const weekKeys = getMondayToSundayWeekKeys(todayKey);
    const startKey = weekKeys[0];
    const endKey = weekKeys[6];
    const dt = parseDateKey(todayKey);
    const elapsedDays = ((dt.getDay() + 6) % 7) + 1;
    return {
      range,
      label: 'This Week',
      startKey,
      endKey,
      prevStartKey: addDaysToDateKey(startKey, -7),
      prevEndKey: addDaysToDateKey(endKey, -7),
      elapsedDays,
    };
  }

  // 'month'
  const dt = parseDateKey(todayKey);
  const year = dt.getFullYear();
  const monthIdx = dt.getMonth();
  const startKey = getTodayDateKey(new Date(year, monthIdx, 1));
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const endKey = getTodayDateKey(new Date(year, monthIdx, lastDay));

  const prevMonthLast = new Date(year, monthIdx, 0);
  const prevStartKey = getTodayDateKey(
    new Date(prevMonthLast.getFullYear(), prevMonthLast.getMonth(), 1)
  );
  const prevEndKey = getTodayDateKey(prevMonthLast);

  return {
    range,
    label: 'This Month',
    startKey,
    endKey,
    prevStartKey,
    prevEndKey,
    elapsedDays: Math.max(1, dt.getDate()),
  };
}

function isInDateWindow(dateKey: string, startKey: string, endKey: string): boolean {
  return dateKey >= startKey && dateKey <= endKey;
}

function getMondayIndex(dateKey: string): number {
  const dt = parseDateKey(dateKey);
  return (dt.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
}

function getScoreRatingLabel(score: number): string {
  if (score >= 85) return 'Strong momentum';
  if (score >= 65) return 'Steady rhythm';
  if (score >= 40) return 'Building pace';
  return 'Gentle start';
}

export function computeDashboardAnalytics(
  input: {
    tasks: TaskItem[];
    habits: HabitItem[];
    pomodoroSessions: PomodoroSessionRecord[];
  },
  range: AnalyticsDateRange,
  todayKey: string
): DashboardAnalyticsSnapshot {
  const safeTasks = Array.isArray(input.tasks) ? input.tasks : [];
  const safeHabits = Array.isArray(input.habits) ? input.habits : [];
  const safeSessions = Array.isArray(input.pomodoroSessions)
    ? input.pomodoroSessions
    : [];

  const windowInfo = getDateRangeWindow(range, todayKey);
  const currentWeekKeys = getMondayToSundayWeekKeys(todayKey);
  const weekStart = currentWeekKeys[0];
  const weekEnd = currentWeekKeys[6];

  // 1. Task calculations
  const tasksThisWeek = safeTasks.filter((t) =>
    isInDateWindow(t.dueDate, weekStart, weekEnd)
  );
  const tasksCompletedThisWeek = tasksThisWeek.filter((t) => t.completed).length;
  const tasksTotalThisWeek = tasksThisWeek.length;
  const weeklyTaskRate =
    tasksTotalThisWeek === 0
      ? null
      : Math.round((tasksCompletedThisWeek / tasksTotalThisWeek) * 100);

  const tasksInRange = safeTasks.filter((t) =>
    isInDateWindow(t.dueDate, windowInfo.startKey, windowInfo.endKey)
  );
  const tasksCompletedInRange = tasksInRange.filter((t) => t.completed).length;
  const tasksPendingInRange = tasksInRange.length - tasksCompletedInRange;
  const tasksTotalInRange = tasksInRange.length;
  const rangeTaskRate =
    tasksTotalInRange === 0
      ? null
      : Math.round((tasksCompletedInRange / tasksTotalInRange) * 100);
  const allPendingTasksCount = safeTasks.filter((t) => !t.completed).length;

  const prevTasks = safeTasks.filter((t) =>
    isInDateWindow(t.dueDate, windowInfo.prevStartKey, windowInfo.prevEndKey)
  );
  const prevTaskRate =
    prevTasks.length === 0
      ? null
      : Math.round(
          (prevTasks.filter((t) => t.completed).length / prevTasks.length) * 100
        );
  const taskTrendDelta =
    rangeTaskRate !== null && prevTaskRate !== null
      ? rangeTaskRate - prevTaskRate
      : null;

  // Task progress by category (only categories that exist in range, or fallback to all tasks if range is empty? No, reflect selected range honestly!)
  const categoryMap = new Map<TaskCategory, { completed: number; total: number }>();
  for (const task of tasksInRange) {
    const existing = categoryMap.get(task.category) || { completed: 0, total: 0 };
    categoryMap.set(task.category, {
      completed: existing.completed + (task.completed ? 1 : 0),
      total: existing.total + 1,
    });
  }
  const categoryInsights: TaskCategoryInsight[] = Array.from(
    categoryMap.entries()
  )
    .map(([category, counts]) => ({
      category,
      completed: counts.completed,
      pending: counts.total - counts.completed,
      total: counts.total,
      percentage: Math.round((counts.completed / counts.total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  // 2. Habit calculations
  const totalActiveHabits = safeHabits.length;
  const dailyHabitsCompleted = safeHabits.filter((h) =>
    h.completedDates.includes(todayKey)
  ).length;
  const dailyHabitRate =
    totalActiveHabits === 0
      ? null
      : Math.round((dailyHabitsCompleted / totalActiveHabits) * 100);

  let weeklyHabitCheckins = 0;
  let weeklyTargetTotal = 0;
  let habitCheckinsInRange = 0;
  let longestActiveStreak = 0;
  let topStreakHabitName: string | null = null;

  const habitStreaks: HabitStreakHighlight[] = [];
  for (const habit of safeHabits) {
    const uniqueDates = Array.from(new Set(habit.completedDates));
    const weekCount = uniqueDates.filter((d) =>
      isInDateWindow(d, weekStart, weekEnd)
    ).length;
    weeklyHabitCheckins += weekCount;
    weeklyTargetTotal += Math.min(7, Math.max(1, habit.targetDaysPerWeek));

    const inRangeCount = uniqueDates.filter((d) =>
      isInDateWindow(d, windowInfo.startKey, windowInfo.endKey)
    ).length;
    habitCheckinsInRange += inRangeCount;

    const streak = computeHabitStreak(uniqueDates, todayKey);
    if (streak > longestActiveStreak) {
      longestActiveStreak = streak;
      topStreakHabitName = habit.name;
    }
    habitStreaks.push({
      id: habit.id,
      name: habit.name,
      streak,
      completedInRange: inRangeCount,
    });
  }
  habitStreaks.sort((a, b) => b.streak - a.streak || b.completedInRange - a.completedInRange);

  const weeklyHabitRate =
    totalActiveHabits === 0 || weeklyTargetTotal === 0
      ? null
      : Math.min(100, Math.round((weeklyHabitCheckins / weeklyTargetTotal) * 100));

  let rangeHabitRate: number | null = null;
  if (totalActiveHabits > 0) {
    if (range === 'today') {
      rangeHabitRate = dailyHabitRate;
    } else if (range === 'week') {
      rangeHabitRate = weeklyHabitRate;
    } else {
      const monthDenominator = totalActiveHabits * windowInfo.elapsedDays;
      rangeHabitRate =
        monthDenominator === 0
          ? null
          : Math.min(100, Math.round((habitCheckinsInRange / monthDenominator) * 100));
    }
  }

  // 3. Focus time calculations
  const focusSessions = safeSessions.filter(
    (s) => s.mode === PomodoroMode.Focus
  );
  const focusSessionsTodayList = focusSessions.filter(
    (s) => s.dateKey === todayKey
  );
  const focusMinutesToday = focusSessionsTodayList.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const focusSessionsToday = focusSessionsTodayList.length;

  const focusSessionsWeekList = focusSessions.filter((s) =>
    isInDateWindow(s.dateKey, weekStart, weekEnd)
  );
  const focusMinutesThisWeek = focusSessionsWeekList.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const focusSessionsThisWeek = focusSessionsWeekList.length;

  const focusSessionsRangeList = focusSessions.filter((s) =>
    isInDateWindow(s.dateKey, windowInfo.startKey, windowInfo.endKey)
  );
  const focusMinutesInRange = focusSessionsRangeList.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const focusSessionsInRange = focusSessionsRangeList.length;
  const focusSessionsTotal = focusSessions.length;

  // 4. Monday–Sunday series (current week for Today / This Week; weekday distribution for This Month)
  const weekdaySeries: WeekdayProductivityPoint[] = currentWeekKeys.map(
    (dateKey, index) => {
      const dayLabel = WEEKDAY_SHORT[index];
      const isToday = dateKey === todayKey;

      if (range === 'month') {
        const monthDayTasks = tasksInRange.filter(
          (t) => getMondayIndex(t.dueDate) === index
        );
        const completedTasks = monthDayTasks.filter((t) => t.completed).length;
        const totalTasks = monthDayTasks.length;

        let completedHabits = 0;
        for (const h of safeHabits) {
          const uniqueMonthDates = Array.from(new Set(h.completedDates)).filter(
            (d) =>
              isInDateWindow(d, windowInfo.startKey, windowInfo.endKey) &&
              getMondayIndex(d) === index
          );
          completedHabits += uniqueMonthDates.length;
        }
        // Occurrences of this weekday in elapsed month days
        const monthStartDt = parseDateKey(windowInfo.startKey);
        let weekdayOccurrences = 0;
        for (let d = 0; d < windowInfo.elapsedDays; d += 1) {
          const cur = new Date(
            monthStartDt.getFullYear(),
            monthStartDt.getMonth(),
            monthStartDt.getDate() + d
          );
          if ((cur.getDay() + 6) % 7 === index) {
            weekdayOccurrences += 1;
          }
        }
        const totalHabitSlots = totalActiveHabits * Math.max(1, weekdayOccurrences);

        const dayFocus = focusSessionsRangeList.filter(
          (s) => getMondayIndex(s.dateKey) === index
        );

        return {
          dateKey,
          dayLabel,
          isToday,
          completedTasks,
          pendingTasks: totalTasks - completedTasks,
          totalTasks,
          taskRate:
            totalTasks === 0
              ? 0
              : Math.round((completedTasks / totalTasks) * 100),
          completedHabits,
          totalHabits: totalHabitSlots,
          habitRate:
            totalHabitSlots === 0
              ? 0
              : Math.min(100, Math.round((completedHabits / totalHabitSlots) * 100)),
          focusMinutes: dayFocus.reduce((sum, s) => sum + s.durationMinutes, 0),
          focusSessions: dayFocus.length,
        };
      }

      const dayTasks = safeTasks.filter((t) => t.dueDate === dateKey);
      const completedTasks = dayTasks.filter((t) => t.completed).length;
      const totalTasks = dayTasks.length;

      const completedHabits = safeHabits.filter((h) =>
        h.completedDates.includes(dateKey)
      ).length;

      const dayFocus = focusSessions.filter((s) => s.dateKey === dateKey);

      return {
        dateKey,
        dayLabel,
        isToday,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        totalTasks,
        taskRate:
          totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
        completedHabits,
        totalHabits: totalActiveHabits,
        habitRate:
          totalActiveHabits === 0
            ? 0
            : Math.round((completedHabits / totalActiveHabits) * 100),
        focusMinutes: dayFocus.reduce((sum, s) => sum + s.durationMinutes, 0),
        focusSessions: dayFocus.length,
      };
    }
  );

  const weekdaySeriesSubtitle =
    range === 'today'
      ? 'Monday – Sunday · Current week (today highlighted)'
      : range === 'week'
      ? 'Monday – Sunday · Current week'
      : 'Monday – Sunday · Monthly weekday distribution';

  // 5. Personal Productivity Score (0–100, dynamically weighted across active pillars, null when insufficient data)
  const focusTargetMinutes =
    range === 'today' ? 50 : range === 'week' ? 250 : 1000;

  const hasTaskSignal = tasksTotalInRange > 0;
  const hasHabitSignal = totalActiveHabits > 0;
  const hasFocusSignal = focusSessionsInRange > 0;

  const taskScoreVal = hasTaskSignal ? rangeTaskRate : null;
  const habitScoreVal = hasHabitSignal ? rangeHabitRate : null;
  const focusScoreVal = hasFocusSignal
    ? Math.min(100, Math.round((focusMinutesInRange / focusTargetMinutes) * 100))
    : null;

  const rawPillars: Array<{
    key: 'tasks' | 'habits' | 'focus';
    label: string;
    score: number | null;
    baseWeight: number;
    detail: string;
  }> = [
    {
      key: 'tasks',
      label: 'Tasks',
      score: taskScoreVal,
      baseWeight: 40,
      detail: hasTaskSignal
        ? `${tasksCompletedInRange}/${tasksTotalInRange} completed`
        : 'No tasks scheduled in period',
    },
    {
      key: 'habits',
      label: 'Habits',
      score: habitScoreVal,
      baseWeight: 40,
      detail: hasHabitSignal
        ? `${rangeHabitRate ?? 0}% consistency`
        : 'No active habits yet',
    },
    {
      key: 'focus',
      label: 'Focus',
      score: focusScoreVal,
      baseWeight: 20,
      detail: hasFocusSignal
        ? `${focusMinutesInRange}m / ${focusTargetMinutes}m goal`
        : 'No focus sessions in period',
    },
  ];

  const activeWeightSum = rawPillars.reduce(
    (sum, p) => (p.score !== null ? sum + p.baseWeight : sum),
    0
  );

  let productivityScore: ProductivityScoreResult;
  if (activeWeightSum === 0) {
    productivityScore = {
      score: null,
      hasSufficientData: false,
      ratingLabel: 'Insufficient data',
      explanation:
        'Add tasks, log a habit check-in, or complete a focus session in this period to calculate your productivity score.',
      pillars: rawPillars.map((p) => ({
        key: p.key,
        label: p.label,
        score: null,
        weightPercent: 0,
        detail: p.detail,
      })),
    };
  } else {
    const normalizedPillars: ScorePillarBreakdown[] = rawPillars.map((p) => ({
      key: p.key,
      label: p.label,
      score: p.score,
      weightPercent:
        p.score !== null
          ? Math.round((p.baseWeight / activeWeightSum) * 100)
          : 0,
      detail: p.detail,
    }));

    const weightedSum = rawPillars.reduce((sum, p) => {
      if (p.score === null) return sum;
      return sum + p.score * (p.baseWeight / activeWeightSum);
    }, 0);
    const finalScore = Math.min(100, Math.max(0, Math.round(weightedSum)));

    const activeNames = normalizedPillars
      .filter((p) => p.score !== null)
      .map((p) => `${p.label} (${p.weightPercent}%)`)
      .join(' + ');

    productivityScore = {
      score: finalScore,
      hasSufficientData: true,
      ratingLabel: getScoreRatingLabel(finalScore),
      explanation: `Weighted from active data in ${windowInfo.label.toLowerCase()}: ${activeNames}.`,
      pillars: normalizedPillars,
    };
  }

  const hasAnyWorkspaceData =
    safeTasks.length > 0 || safeHabits.length > 0 || focusSessions.length > 0;

  return {
    window: windowInfo,
    tasksCompletedThisWeek,
    tasksTotalThisWeek,
    weeklyTaskRate,
    tasksCompletedInRange,
    tasksPendingInRange,
    tasksTotalInRange,
    rangeTaskRate,
    allPendingTasksCount,
    taskTrendDelta,
    categoryInsights,
    totalActiveHabits,
    dailyHabitRate,
    dailyHabitsCompleted,
    weeklyHabitRate,
    rangeHabitRate,
    habitCheckinsInRange,
    longestActiveStreak,
    topStreakHabitName,
    habitStreaks,
    focusMinutesToday,
    focusMinutesThisWeek,
    focusMinutesInRange,
    focusSessionsToday,
    focusSessionsThisWeek,
    focusSessionsInRange,
    focusSessionsTotal,
    weekdaySeries,
    weekdaySeriesSubtitle,
    productivityScore,
    hasAnyWorkspaceData,
  };
}
