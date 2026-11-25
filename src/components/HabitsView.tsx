import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react';
import { HabitItem } from '../types/dayspace';
import {
  computeBestHabitStreak,
  computeHabitStreak,
  computeHabitWeeklyCompletion,
  computeOverallHabitSummary,
  computeWeeklyHabitChartData,
  getRecentWeekKeys,
  getTodayDateKey,
  getWeekRangeLabel,
} from '../utils/productivity';

interface HabitsViewProps {
  habits: HabitItem[];
  onToggleHabitDate: (habitId: string, dateKey: string) => void;
  onEditHabit: (habit: HabitItem) => void;
  onDeleteHabit: (habitId: string) => void;
  onOpenNewHabit: () => void;
}

export function HabitsView({
  habits,
  onToggleHabitDate,
  onEditHabit,
  onDeleteHabit,
  onOpenNewHabit,
}: HabitsViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const todayKey = getTodayDateKey();
  const weekKeys = useMemo(
    () => getRecentWeekKeys(todayKey, weekOffset),
    [todayKey, weekOffset]
  );

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const h of habits) {
      if (h.category) set.add(h.category);
    }
    return Array.from(set);
  }, [habits]);

  const filteredHabits = useMemo(() => {
    if (categoryFilter === 'All') return habits;
    return habits.filter((h) => (h.category || 'Wellness') === categoryFilter);
  }, [habits, categoryFilter]);

  const summary = useMemo(
    () => computeOverallHabitSummary(filteredHabits, todayKey, weekKeys),
    [filteredHabits, todayKey, weekKeys]
  );

  const chartData = useMemo(
    () => computeWeeklyHabitChartData(filteredHabits, weekKeys),
    [filteredHabits, weekKeys]
  );

  const weekRangeLabel = getWeekRangeLabel(weekKeys);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
            Habit Tracker
          </h1>
          <p className="mt-1 text-sm text-[#58645B] tabular-nums">
            {summary.completedToday} of {summary.totalHabits} checked in today ·{' '}
            {summary.weeklyCheckins} total check-ins across {weekRangeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewHabit}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New habit</span>
        </button>
      </header>

      {/* Summary Metrics Strip */}
      <section aria-label="Habit summary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <span className="text-sm font-medium text-[#58645B]">
              Today&apos;s check-ins
            </span>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {summary.completedToday} / {summary.totalHabits}
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#EFECE4] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1E3F31] transition-all duration-300"
                style={{ width: `${summary.todayPercentage}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <span className="text-sm font-medium text-[#58645B]">
              Weekly goal progress
            </span>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1E3F31] tabular-nums">
              {summary.weeklyPercentage}%
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {summary.weeklyCheckins} of {summary.weeklyTargetTotal} weekly check-ins
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">
                Longest active streak
              </span>
              <Flame className="w-4 h-4 text-[#5C7C66]" aria-hidden="true" />
            </div>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {summary.longestActiveStreak}d
            </p>
            <p className="mt-1 text-xs text-[#58645B] truncate">
              {summary.topStreakHabitName
                ? summary.topStreakHabitName
                : 'Check in today to start a streak'}
            </p>
          </div>
        </div>
      </section>

      {/* Weekly Progress Charts */}
      {habits.length > 0 && (
        <section
          aria-label="Weekly progress charts"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* 7-Day Daily Completion Bar Chart */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
              <div>
                <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                  Weekly completion trend
                </h2>
                <p className="text-xs text-[#58645B] mt-0.5 tabular-nums">
                  {weekRangeLabel}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  aria-label="Previous 7 days"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD8CD] bg-[#FBF9F4] text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {weekOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    className="px-2.5 py-1 rounded-lg border border-[#DDD8CD] bg-white text-xs font-medium text-[#1E3F31] hover:bg-[#EEF4EF] transition-colors whitespace-nowrap"
                  >
                    Current
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
                  disabled={weekOffset === 0}
                  aria-label="Next 7 days"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD8CD] bg-[#FBF9F4] text-[#1C241E] hover:bg-[#F3EFE6] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="mt-6 grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 pt-4"
              role="img"
              aria-label="Daily habit completion percentage bar chart for the selected 7 days"
            >
              {chartData.map((day) => {
                const isToday = day.dateKey === todayKey;
                const barHeight = day.percentage > 0 ? Math.max(10, day.percentage) : 4;
                return (
                  <div
                    key={day.dateKey}
                    className="flex flex-col items-center justify-end h-full gap-2"
                  >
                    <span className="font-mono text-[11px] text-[#58645B] tabular-nums">
                      {day.percentage}%
                    </span>
                    <div className="w-full max-w-[38px] flex-1 flex items-end bg-[#F3EFE6] rounded-lg overflow-hidden p-0.5">
                      <div
                        title={`${day.dayLabel} ${day.dayNum}: ${day.completedCount}/${day.totalHabits} (${day.percentage}%)`}
                        className={`w-full rounded-md transition-all duration-300 ${
                          day.percentage === 0
                            ? 'bg-[#E2DDD2]'
                            : isToday
                            ? 'bg-[#1E3F31]'
                            : 'bg-[#7A9A83]'
                        }`}
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <div className="text-center leading-tight">
                      <span
                        className={`block text-xs ${
                          isToday
                            ? 'font-semibold text-[#1E3F31]'
                            : 'font-medium text-[#58645B]'
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                      <span className="block font-mono text-[11px] text-[#7D8880] tabular-nums">
                        {day.dayNum}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Habit Weekly Target Progress */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
            <div className="pb-4 border-b border-[#EFECE4]">
              <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                Weekly goal breakdown
              </h2>
              <p className="text-xs text-[#58645B] mt-0.5">
                Progress toward each habit&apos;s weekly target
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {filteredHabits.map((habit) => {
                const goal = computeHabitWeeklyCompletion(habit, weekKeys);
                const bestStreak = computeBestHabitStreak(habit.completedDates);
                return (
                  <div key={habit.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-[#1C241E] truncate">
                        {habit.name}
                      </span>
                      <span className="font-mono text-xs text-[#58645B] tabular-nums whitespace-nowrap shrink-0">
                        {goal.completedDays}/{goal.targetDays}d · Best {bestStreak}d
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EFECE4] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          goal.percentage >= 100 ? 'bg-[#1E3F31]' : 'bg-[#7A9A83]'
                        }`}
                        style={{ width: `${goal.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter + Daily Check-In Matrix */}
      <section className="rounded-2xl bg-white border border-[#E5E1D8] overflow-hidden shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
        {categories.length > 2 && (
          <div className="px-6 py-3.5 border-b border-[#EFECE4] flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F3]">
            <div
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EFECE4]"
              role="tablist"
              aria-label="Filter habits by category"
            >
              {categories.map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#1C241E] shadow-xs'
                        : 'text-[#58645B] hover:text-[#1C241E]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-[#58645B] tabular-nums">
              {filteredHabits.length}{' '}
              {filteredHabits.length === 1 ? 'habit' : 'habits'}
            </span>
          </div>
        )}

        {filteredHabits.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-[#1C241E]">
              {habits.length === 0
                ? 'No habits tracked yet'
                : 'No habits in this category'}
            </p>
            <p className="mt-1 text-sm text-[#58645B]">
              Create a custom habit to track daily check-ins, streaks, and weekly goals.
            </p>
            <button
              type="button"
              onClick={onOpenNewHabit}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create habit</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop 7-Day Interactive Check-In Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFECE4] bg-[#FAF8F3]">
                    <th className="py-3.5 pl-6 pr-4 text-xs font-semibold text-[#58645B] min-w-[220px]">
                      Habit
                    </th>
                    {chartData.map((day) => {
                      const isToday = day.dateKey === todayKey;
                      return (
                        <th
                          key={day.dateKey}
                          className="py-3.5 px-2 text-center text-xs font-medium text-[#58645B]"
                        >
                          <span
                            className={`block ${
                              isToday ? 'text-[#1E3F31] font-semibold' : ''
                            }`}
                          >
                            {day.dayLabel}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-[#7D8880]">
                            {day.dayNum}
                          </span>
                        </th>
                      );
                    })}
                    <th className="py-3.5 px-3 text-right text-xs font-semibold text-[#58645B] whitespace-nowrap">
                      Current
                    </th>
                    <th className="py-3.5 px-3 text-right text-xs font-semibold text-[#58645B] whitespace-nowrap">
                      Best
                    </th>
                    <th className="py-3.5 pl-2 pr-6 text-right text-xs font-semibold text-[#58645B]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE8]">
                  {filteredHabits.map((habit) => {
                    const currentStreak = computeHabitStreak(
                      habit.completedDates,
                      todayKey
                    );
                    const bestStreak = computeBestHabitStreak(habit.completedDates);
                    return (
                      <tr
                        key={habit.id}
                        className="hover:bg-[#FCFBF8] transition-colors"
                      >
                        <td className="py-4 pl-6 pr-4">
                          <p className="text-sm font-medium text-[#1C241E]">
                            {habit.name}
                          </p>
                          <p className="text-xs text-[#58645B] mt-0.5">
                            {habit.category || 'Wellness'} · {habit.cue} ·{' '}
                            {habit.targetDaysPerWeek}d/wk
                          </p>
                        </td>
                        {chartData.map((day) => {
                          const checked = habit.completedDates.includes(day.dateKey);
                          return (
                            <td key={day.dateKey} className="py-4 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => onToggleHabitDate(habit.id, day.dateKey)}
                                aria-pressed={checked}
                                aria-label={`Toggle "${habit.name}" for ${day.dayLabel} ${day.dayNum}`}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                  checked
                                    ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                                    : 'bg-[#FBF9F4] border-[#DDD8CD] text-transparent hover:border-[#7A9A83]'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-4 px-3 text-right font-mono text-sm text-[#1E3F31] tabular-nums whitespace-nowrap">
                          {currentStreak}d
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-sm text-[#58645B] tabular-nums whitespace-nowrap">
                          {bestStreak}d
                        </td>
                        <td className="py-4 pl-2 pr-6 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditHabit(habit)}
                              aria-label={`Edit habit "${habit.name}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteHabit(habit.id)}
                              aria-label={`Delete habit "${habit.name}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Check-In Layout */}
            <div className="md:hidden divide-y divide-[#F2EFE8]">
              {filteredHabits.map((habit) => {
                const currentStreak = computeHabitStreak(
                  habit.completedDates,
                  todayKey
                );
                const bestStreak = computeBestHabitStreak(habit.completedDates);
                const doneToday = habit.completedDates.includes(todayKey);

                return (
                  <div key={habit.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1C241E]">
                          {habit.name}
                        </p>
                        <p className="text-xs text-[#58645B] mt-0.5">
                          {habit.category || 'Wellness'} · {habit.cue}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditHabit(habit)}
                          aria-label={`Edit habit "${habit.name}"`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteHabit(habit.id)}
                          aria-label={`Delete habit "${habit.name}"`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#58645B]">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#1E3F31]">
                        <Flame className="w-3.5 h-3.5" />
                        {currentStreak}d current
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Trophy className="w-3.5 h-3.5 text-[#7A9A83]" />
                        {bestStreak}d best
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleHabitDate(habit.id, todayKey)}
                        aria-pressed={doneToday}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          doneToday
                            ? 'bg-[#1E3F31] text-white'
                            : 'bg-[#E8EFE9] text-[#1E3F31]'
                        }`}
                      >
                        {doneToday ? 'Checked in' : 'Check in today'}
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {chartData.map((day) => {
                        const checked = habit.completedDates.includes(day.dateKey);
                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            onClick={() => onToggleHabitDate(habit.id, day.dateKey)}
                            aria-pressed={checked}
                            aria-label={`Toggle "${habit.name}" for ${day.dayLabel} ${day.dayNum}`}
                            className={`py-1.5 rounded-lg border text-center transition-colors ${
                              checked
                                ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                                : 'bg-[#FBF9F4] border-[#DDD8CD] text-[#58645B]'
                            }`}
                          >
                            <span className="block text-[10px] leading-tight">
                              {day.dayLabel[0]}
                            </span>
                            <span className="block font-mono text-[11px] tabular-nums">
                              {day.dayNum}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
