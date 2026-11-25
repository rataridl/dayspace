import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Minus,
  Plus,
  Sprout,
  Timer,
} from 'lucide-react';
import {
  HabitItem,
  NavigationView,
  PomodoroSessionRecord,
  TaskItem,
} from '../types/dayspace';
import {
  AnalyticsDateRange,
  computeDashboardAnalytics,
} from '../utils/analytics';
import { QuickModalKind } from './QuickAddModals';

interface DashboardAnalyticsProps {
  tasks: TaskItem[];
  habits: HabitItem[];
  pomodoroSessions: PomodoroSessionRecord[];
  todayKey: string;
  onNavigate: (view: NavigationView) => void;
  onOpenQuickModal: (kind: QuickModalKind) => void;
}

const DATE_FILTERS: { id: AnalyticsDateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

export function DashboardAnalytics({
  tasks,
  habits,
  pomodoroSessions,
  todayKey,
  onNavigate,
  onOpenQuickModal,
}: DashboardAnalyticsProps) {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('week');

  const analytics = useMemo(
    () =>
      computeDashboardAnalytics(
        { tasks, habits, pomodoroSessions },
        dateRange,
        todayKey
      ),
    [tasks, habits, pomodoroSessions, dateRange, todayKey]
  );

  const maxWeekdayTasks = Math.max(
    1,
    ...analytics.weekdaySeries.map((d) => d.totalTasks)
  );
  const maxWeekdayFocusMinutes = Math.max(
    1,
    ...analytics.weekdaySeries.map((d) => d.focusMinutes)
  );

  const scoreValue = analytics.productivityScore.score ?? 0;
  const scoreRingRadius = 46;
  const scoreRingCircumference = 2 * Math.PI * scoreRingRadius;
  const scoreRingOffset = analytics.productivityScore.hasSufficientData
    ? scoreRingCircumference * (1 - scoreValue / 100)
    : scoreRingCircumference;

  return (
    <section
      id="dashboard-analytics"
      aria-labelledby="dashboard-analytics-heading"
      className="pt-4 border-t border-[#E5E1D8] space-y-6"
    >
      {/* Analytics Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C7C66]">
            Personal Insights
          </p>
          <h2
            id="dashboard-analytics-heading"
            className="mt-1 font-serif text-2xl sm:text-[28px] font-medium tracking-tight text-[#1C241E]"
          >
            Dashboard Analytics
          </h2>
          <p className="mt-0.5 text-sm text-[#58645B]">
            Live metrics computed from your saved tasks, habits, and focus
            sessions.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Analytics date range"
          className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E5E1D8] shadow-[0_1px_4px_rgba(28,36,30,0.03)] self-start sm:self-auto"
        >
          {DATE_FILTERS.map((filter) => {
            const active = dateRange === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDateRange(filter.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1E3F31] text-white'
                    : 'text-[#4B574E] hover:text-[#1C241E] hover:bg-[#F3EFE6]'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 1: Personal Productivity Score + Weekly Productivity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Personal Productivity Score */}
        <article
          aria-label="Personal productivity score"
          className="lg:col-span-5 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-serif text-xl font-medium text-[#1C241E]">
                Productivity Score
              </h3>
              <span className="text-xs font-medium text-[#5C7C66]">
                {analytics.window.label}
              </span>
            </div>

            {!analytics.productivityScore.hasSufficientData ? (
              <div className="mt-5 rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-5 text-center">
                <Activity className="w-6 h-6 text-[#5C7C66] mx-auto" />
                <p className="mt-2.5 text-sm font-medium text-[#1C241E]">
                  Not enough activity yet
                </p>
                <p className="mt-1 text-xs text-[#58645B] leading-relaxed">
                  {analytics.productivityScore.explanation}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenQuickModal('task')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add task</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate(NavigationView.Focus)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DDD8CD] bg-white text-xs font-medium text-[#1C241E] hover:bg-[#F3EFE6]"
                  >
                    <Timer className="w-3.5 h-3.5 text-[#5C7C66]" />
                    <span>Start focus</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center gap-5">
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 112 112"
                      aria-hidden="true"
                    >
                      <circle
                        cx="56"
                        cy="56"
                        r={scoreRingRadius}
                        fill="none"
                        stroke="#EFECE4"
                        strokeWidth="8"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r={scoreRingRadius}
                        fill="none"
                        stroke="#1E3F31"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={scoreRingCircumference}
                        strokeDashoffset={scoreRingOffset}
                        className="transition-[stroke-dashoffset] duration-500 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        data-testid="productivity-score-value"
                        className="font-mono text-3xl font-semibold text-[#1C241E] tabular-nums leading-none"
                      >
                        {analytics.productivityScore.score}
                      </span>
                      <span className="mt-0.5 font-mono text-[10px] text-[#6A786D]">
                        / 100
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-medium text-[#1E3F31]">
                      {analytics.productivityScore.ratingLabel}
                    </p>
                    <p className="mt-1 text-xs text-[#58645B] leading-relaxed">
                      {analytics.productivityScore.explanation}
                    </p>
                  </div>
                </div>

                {/* Pillar Breakdown */}
                <div className="mt-5 pt-4 border-t border-[#EFECE4] space-y-3">
                  {analytics.productivityScore.pillars.map((pillar) => (
                    <div key={pillar.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#1C241E]">
                          {pillar.label}
                          {pillar.weightPercent > 0 && (
                            <span className="ml-1.5 font-mono text-[11px] text-[#6A786D]">
                              ({pillar.weightPercent}%)
                            </span>
                          )}
                        </span>
                        <span className="text-[#58645B] font-mono tabular-nums">
                          {pillar.score !== null
                            ? `${pillar.score}% · ${pillar.detail}`
                            : pillar.detail}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#EFECE4] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pillar.score !== null
                              ? 'bg-[#5C7C66]'
                              : 'bg-transparent'
                          }`}
                          style={{
                            width: `${pillar.score !== null ? pillar.score : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </article>

        {/* Weekly Productivity Overview */}
        <article
          aria-label="Weekly productivity overview"
          className="lg:col-span-7 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-medium text-[#1C241E]">
                  Weekly Productivity Overview
                </h3>
                <p className="mt-0.5 text-xs text-[#58645B]">
                  {analytics.weekdaySeriesSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Tasks)}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
              >
                Open tasks
              </button>
            </div>

            {/* KPI Summary */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  {dateRange === 'today'
                    ? 'Done today'
                    : dateRange === 'month'
                    ? 'Done this month'
                    : 'Done this week'}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1E3F31] tabular-nums">
                  {analytics.tasksCompletedInRange}
                </p>
                <p className="text-[11px] text-[#6A786D] tabular-nums">
                  {analytics.tasksCompletedThisWeek} this week
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  Pending
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1C241E] tabular-nums">
                  {analytics.tasksPendingInRange}
                </p>
                <p className="text-[11px] text-[#6A786D] tabular-nums">
                  {analytics.allPendingTasksCount} total open
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  Completion rate
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1C241E] tabular-nums">
                  {analytics.rangeTaskRate !== null
                    ? `${analytics.rangeTaskRate}%`
                    : '—'}
                </p>
                <p className="text-[11px] text-[#6A786D] tabular-nums">
                  {analytics.weeklyTaskRate !== null
                    ? `${analytics.weeklyTaskRate}% weekly`
                    : 'No weekly tasks'}
                </p>
              </div>
            </div>
          </div>

          {/* Mon–Sun Bar Chart */}
          {tasks.length === 0 ? (
            <div className="mt-5 rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-6 text-center">
              <CheckCircle2 className="w-6 h-6 text-[#5C7C66] mx-auto" />
              <p className="mt-2 text-sm font-medium text-[#1C241E]">
                No tasks scheduled yet
              </p>
              <p className="mt-1 text-xs text-[#58645B]">
                Create tasks with due dates to track your Monday–Sunday output.
              </p>
              <button
                type="button"
                onClick={() => onOpenQuickModal('task')}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add your first task</span>
              </button>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-[#EFECE4]">
              <div className="flex items-center justify-between text-[11px] text-[#6A786D] mb-3">
                <span>Monday – Sunday task completion</span>
                <span className="font-mono tabular-nums">
                  Completed / Scheduled
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end">
                {analytics.weekdaySeries.map((day) => {
                  const totalHeightPct =
                    day.totalTasks > 0
                      ? Math.max(14, Math.round((day.totalTasks / maxWeekdayTasks) * 100))
                      : 0;
                  const completedInnerPct =
                    day.totalTasks > 0
                      ? Math.round((day.completedTasks / day.totalTasks) * 100)
                      : 0;
                  const dimmed = dateRange === 'today' && !day.isToday;

                  return (
                    <div
                      key={day.dateKey}
                      className={`flex flex-col items-center gap-1.5 transition-opacity ${
                        dimmed ? 'opacity-45' : 'opacity-100'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-[#58645B] tabular-nums">
                        {day.totalTasks > 0
                          ? `${day.completedTasks}/${day.totalTasks}`
                          : '0'}
                      </span>
                      <div className="w-full max-w-[38px] h-32 rounded-xl bg-[#F5F2EA] border border-[#EAE6DC] flex items-end overflow-hidden p-1">
                        {day.totalTasks > 0 && (
                          <div
                            className="w-full rounded-lg bg-[#DCE6DD] flex items-end overflow-hidden transition-all duration-300"
                            style={{ height: `${totalHeightPct}%` }}
                          >
                            <div
                              className="w-full rounded-lg bg-[#1E3F31] transition-all duration-300"
                              style={{ height: `${completedInnerPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          day.isToday
                            ? 'text-[#1E3F31] font-semibold'
                            : 'text-[#58645B]'
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Row 2: Habit Analytics + Focus Time Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Habit Analytics */}
        <article
          aria-label="Habit analytics"
          className="lg:col-span-6 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-medium text-[#1C241E]">
                  Habit Analytics
                </h3>
                <p className="mt-0.5 text-xs text-[#58645B]">
                  Daily &amp; weekly consistency across your routines
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Habits)}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
              >
                Manage habits
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">Active</p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#1C241E] tabular-nums">
                  {analytics.totalActiveHabits}
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">Daily</p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#1E3F31] tabular-nums">
                  {analytics.dailyHabitRate !== null
                    ? `${analytics.dailyHabitRate}%`
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  {dateRange === 'month' ? 'Monthly' : 'Weekly'}
                </p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#1C241E] tabular-nums">
                  {dateRange === 'month'
                    ? analytics.rangeHabitRate !== null
                      ? `${analytics.rangeHabitRate}%`
                      : '—'
                    : analytics.weeklyHabitRate !== null
                    ? `${analytics.weeklyHabitRate}%`
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  Top streak
                </p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#1E3F31] tabular-nums">
                  {analytics.longestActiveStreak}d
                </p>
              </div>
            </div>
          </div>

          {analytics.totalActiveHabits === 0 ? (
            <div className="mt-5 rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-6 text-center">
              <Sprout className="w-6 h-6 text-[#5C7C66] mx-auto" />
              <p className="mt-2 text-sm font-medium text-[#1C241E]">
                No habits tracked yet
              </p>
              <p className="mt-1 text-xs text-[#58645B]">
                Build daily routines to measure streaks and consistency charts.
              </p>
              <button
                type="button"
                onClick={() => onOpenQuickModal('habit')}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a habit</span>
              </button>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-[#EFECE4] space-y-4">
              {/* Weekly Habit Consistency Chart */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#6A786D] mb-2.5">
                  <span>Habit consistency (Mon – Sun)</span>
                  <span className="font-mono tabular-nums">
                    {analytics.habitCheckinsInRange} check-ins in{' '}
                    {analytics.window.label.toLowerCase()}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2 items-end">
                  {analytics.weekdaySeries.map((day) => {
                    const dimmed = dateRange === 'today' && !day.isToday;
                    return (
                      <div
                        key={day.dateKey}
                        className={`flex flex-col items-center gap-1.5 transition-opacity ${
                          dimmed ? 'opacity-45' : 'opacity-100'
                        }`}
                      >
                        <span className="font-mono text-[10px] text-[#58645B] tabular-nums">
                          {day.habitRate}%
                        </span>
                        <div className="w-full max-w-[34px] h-28 rounded-lg bg-[#F5F2EA] border border-[#EAE6DC] flex items-end overflow-hidden p-1">
                          {day.habitRate > 0 && (
                            <div
                              className="w-full rounded-md bg-[#5C7C66] transition-all duration-300"
                              style={{ height: `${Math.max(10, day.habitRate)}%` }}
                            />
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-medium ${
                            day.isToday
                              ? 'text-[#1E3F31] font-semibold'
                              : 'text-[#58645B]'
                          }`}
                        >
                          {day.dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Habit Streaks */}
              <div className="pt-3 border-t border-[#F2EFE8] space-y-2">
                {analytics.habitStreaks.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-[#1C241E] font-medium truncate">
                      {item.name}
                    </span>
                    <span className="font-mono text-[#5C7C66] tabular-nums shrink-0">
                      {item.streak > 0
                        ? `${item.streak}d streak`
                        : `${item.completedInRange} logged`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Focus Time Analytics */}
        <article
          aria-label="Focus time analytics"
          className="lg:col-span-6 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-medium text-[#1C241E]">
                  Focus Time Analytics
                </h3>
                <p className="mt-0.5 text-xs text-[#58645B]">
                  Completed Pomodoro focus rounds and deep work minutes
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Focus)}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
              >
                Open Focus timer
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">Today</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1E3F31] tabular-nums">
                  {analytics.focusMinutesToday}m
                </p>
                <p className="text-[11px] text-[#6A786D] tabular-nums">
                  {analytics.focusSessionsToday}{' '}
                  {analytics.focusSessionsToday === 1 ? 'session' : 'sessions'}
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  {dateRange === 'month' ? 'This month' : 'This week'}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1C241E] tabular-nums">
                  {dateRange === 'month'
                    ? `${analytics.focusMinutesInRange}m`
                    : `${analytics.focusMinutesThisWeek}m`}
                </p>
                <p className="text-[11px] text-[#6A786D] tabular-nums">
                  {dateRange === 'month'
                    ? `${analytics.focusSessionsInRange} sessions`
                    : `${analytics.focusSessionsThisWeek} sessions`}
                </p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  Completed
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1C241E] tabular-nums">
                  {analytics.focusSessionsInRange}
                </p>
                <p className="text-[11px] text-[#6A786D] tabular-nums">
                  {analytics.focusSessionsTotal} all-time
                </p>
              </div>
            </div>
          </div>

          {analytics.focusSessionsTotal === 0 ? (
            <div className="mt-5 rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-6 text-center">
              <Flame className="w-6 h-6 text-[#5C7C66] mx-auto" />
              <p className="mt-2 text-sm font-medium text-[#1C241E]">
                No focus sessions logged yet
              </p>
              <p className="mt-1 text-xs text-[#58645B]">
                Run a Pomodoro sprint in Focus to chart your daily deep-work
                minutes.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Focus)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24]"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Start focus session</span>
              </button>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-[#EFECE4]">
              <div className="flex items-center justify-between text-[11px] text-[#6A786D] mb-2.5">
                <span>Focus minutes (Mon – Sun)</span>
                <span className="font-mono tabular-nums">
                  {analytics.focusMinutesInRange}m in{' '}
                  {analytics.window.label.toLowerCase()}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end">
                {analytics.weekdaySeries.map((day) => {
                  const pct =
                    day.focusMinutes > 0
                      ? Math.max(
                          12,
                          Math.round(
                            (day.focusMinutes / maxWeekdayFocusMinutes) * 100
                          )
                        )
                      : 0;
                  const dimmed = dateRange === 'today' && !day.isToday;
                  return (
                    <div
                      key={day.dateKey}
                      className={`flex flex-col items-center gap-1.5 transition-opacity ${
                        dimmed ? 'opacity-45' : 'opacity-100'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-[#58645B] tabular-nums">
                        {day.focusMinutes > 0 ? `${day.focusMinutes}m` : '0m'}
                      </span>
                      <div className="w-full max-w-[34px] h-28 rounded-lg bg-[#F5F2EA] border border-[#EAE6DC] flex items-end overflow-hidden p-1">
                        {pct > 0 && (
                          <div
                            className="w-full rounded-md bg-[#1E3F31] transition-all duration-300"
                            style={{ height: `${pct}%` }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          day.isToday
                            ? 'text-[#1E3F31] font-semibold'
                            : 'text-[#58645B]'
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Row 3: Task Insights */}
      <article
        aria-label="Task insights and category progress"
        className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[#EFECE4]">
          <div>
            <h3 className="font-serif text-xl font-medium text-[#1C241E]">
              Task Insights
            </h3>
            <p className="mt-0.5 text-xs text-[#58645B]">
              Completed vs. pending tasks, period trend, and category progress
              for {analytics.window.label.toLowerCase()}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            {analytics.taskTrendDelta === null ? (
              <span className="inline-flex items-center gap-1 text-[#6A786D]">
                <Minus className="w-3.5 h-3.5" />
                <span>No prior-period baseline yet</span>
              </span>
            ) : analytics.taskTrendDelta > 0 ? (
              <span className="inline-flex items-center gap-1 text-[#1E3F31]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">
                  +{analytics.taskTrendDelta}% vs previous period
                </span>
              </span>
            ) : analytics.taskTrendDelta < 0 ? (
              <span className="inline-flex items-center gap-1 text-[#9A3B30]">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">
                  {analytics.taskTrendDelta}% vs previous period
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#58645B]">
                <Minus className="w-3.5 h-3.5" />
                <span>Matching previous period</span>
              </span>
            )}
          </div>
        </div>

        {analytics.tasksTotalInRange === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-[#1C241E]">
              No tasks scheduled in {analytics.window.label.toLowerCase()}
            </p>
            <p className="mt-1 text-xs text-[#58645B]">
              Switch the date filter above or add a task to see category
              breakdowns and completion trends.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickModal('task')}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add task</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Completed vs Pending Split */}
            <div className="lg:col-span-5 rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-4">
              <div className="flex items-center justify-between text-xs font-medium text-[#58645B]">
                <span>Completed vs. pending</span>
                <span className="font-mono text-[#1C241E] tabular-nums">
                  {analytics.tasksCompletedInRange} /{' '}
                  {analytics.tasksTotalInRange}
                </span>
              </div>

              <div className="mt-3 h-3 w-full rounded-full bg-[#E6E1D6] overflow-hidden flex">
                <div
                  className="h-full bg-[#1E3F31] transition-all duration-300"
                  style={{ width: `${analytics.rangeTaskRate ?? 0}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-[#1E3F31] font-medium font-mono tabular-nums">
                  {analytics.tasksCompletedInRange} completed (
                  {analytics.rangeTaskRate ?? 0}%)
                </span>
                <span className="text-[#58645B] font-mono tabular-nums">
                  {analytics.tasksPendingInRange} pending
                </span>
              </div>
            </div>

            {/* Category Progress */}
            {analytics.categoryInsights.length > 0 && (
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {analytics.categoryInsights.map((cat) => (
                  <div
                    key={cat.category}
                    className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#1C241E]">
                        {cat.category}
                      </span>
                      <span className="font-mono text-[#58645B] tabular-nums">
                        {cat.completed}/{cat.total} · {cat.percentage}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#E6E1D6] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#5C7C66] transition-all duration-300"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
