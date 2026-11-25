import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sprout,
  Trash2,
} from 'lucide-react';
import {
  CalendarEvent,
  HabitItem,
  NavigationView,
  PomodoroSessionRecord,
  QuoteItem,
  TaskCategory,
  TaskItem,
  TaskPriority,
  UserProfile,
} from '../types/dayspace';
import {
  buildDailyOverviewLine,
  computeHabitProgress,
  computeHabitStreak,
  computeTaskSummary,
  formatDeadlineLabel,
  formatDisplayDate,
  formatShortDateLabel,
  formatTime12Hour,
  getDeadlineStatus,
  getGreetingByHour,
  getTodayDateKey,
  getUpcomingEvents,
  sortTasksForDashboard,
} from '../utils/productivity';
import { DashboardAnalytics } from './DashboardAnalytics';
import { QuickModalKind } from './QuickAddModals';

interface DashboardViewProps {
  profile: UserProfile;
  tasks: TaskItem[];
  habits: HabitItem[];
  events: CalendarEvent[];
  pomodoroSessions: PomodoroSessionRecord[];
  quote: QuoteItem;
  onOpenQuickModal: (kind: QuickModalKind) => void;
  onNavigate: (view: NavigationView) => void;
  onToggleTask: (taskId: string) => void;
  onAddQuickTask: (input: {
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate: string;
  }) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleHabitToday: (habitId: string, dateKey: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCycleQuote: () => void;
}

export function DashboardView({
  profile,
  tasks,
  habits,
  events,
  pomodoroSessions,
  quote,
  onOpenQuickModal,
  onNavigate,
  onToggleTask,
  onAddQuickTask,
  onEditTask,
  onDeleteTask,
  onToggleHabitToday,
  onEditEvent,
  onDeleteEvent,
  onCycleQuote,
}: DashboardViewProps) {
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [inlineTaskError, setInlineTaskError] = useState('');

  const now = new Date();
  const todayKey = getTodayDateKey(now);
  const displayDate = formatDisplayDate(now);
  const greeting = getGreetingByHour(now.getHours(), profile.name);

  const taskSummary = computeTaskSummary(tasks, todayKey);
  const habitProgress = computeHabitProgress(habits, todayKey);
  const upcomingEvents = getUpcomingEvents(events, todayKey);
  const todayEventsCount = upcomingEvents.filter((e) => e.date === todayKey).length;
  const overviewLine = buildDailyOverviewLine(
    taskSummary,
    habitProgress,
    todayEventsCount
  );

  const prioritizedTasks = sortTasksForDashboard(tasks, todayKey).slice(0, 4);
  const visibleEvents = upcomingEvents.slice(0, 4);

  const handleInlineAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim()) {
      setInlineTaskError('Enter a task title first.');
      return;
    }
    onAddQuickTask({
      title: inlineTaskTitle,
      category: TaskCategory.Personal,
      priority: TaskPriority.Medium,
      dueDate: todayKey,
    });
    setInlineTaskTitle('');
    setInlineTaskError('');
  };

  return (
    <div className="space-y-6">
      {/* Greeting, Today's Date, Daily Overview & Quick Actions */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-sm font-medium text-[#5C7C66]">{displayDate}</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1C241E] text-balance">
            {greeting}
          </h1>
          <p className="text-sm sm:text-base text-[#4B574E] tabular-nums">
            {overviewLine}
          </p>
          {profile.dailyFocusNote && (
            <p className="text-sm text-[#58645B] italic pt-0.5">
              Focus: {profile.dailyFocusNote}
            </p>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenQuickModal('task')}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-xs sm:text-sm font-medium hover:bg-[#152E24] transition-colors duration-150 shadow-[0_2px_10px_rgba(30,63,49,0.16)] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add task</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickModal('habit')}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-white border border-[#DDD8CD] text-[#1C241E] text-xs sm:text-sm font-medium hover:bg-[#F3EFE6] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <Sprout className="w-4 h-4 text-[#5C7C66] shrink-0" />
            <span>New habit</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickModal('event')}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-white border border-[#DDD8CD] text-[#1C241E] text-xs sm:text-sm font-medium hover:bg-[#F3EFE6] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="w-4 h-4 text-[#5C7C66] shrink-0" />
            <span>New event</span>
          </button>
        </div>
      </section>

      {/* Task Summary Cards */}
      <section aria-label="Task summary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onNavigate(NavigationView.Tasks)}
            className="group text-left rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)] hover:border-[#B6C7B9] transition-all duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">Due today</span>
              <ArrowRight className="w-4 h-4 text-[#7D8880] group-hover:text-[#1E3F31] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="mt-3 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {taskSummary.dueTodayRemaining}
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {taskSummary.dueToday} scheduled · {taskSummary.overdueCount} overdue
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(NavigationView.Tasks)}
            className="group text-left rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)] hover:border-[#B6C7B9] transition-all duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">Completed</span>
              <ArrowRight className="w-4 h-4 text-[#7D8880] group-hover:text-[#1E3F31] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="mt-3 font-serif text-3xl font-medium text-[#1E3F31] tabular-nums">
              {taskSummary.completedTotal}
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {taskSummary.completedToday} finished today · {taskSummary.total} total
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(NavigationView.Tasks)}
            className="group text-left rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)] hover:border-[#B6C7B9] transition-all duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">Completion rate</span>
              <ArrowRight className="w-4 h-4 text-[#7D8880] group-hover:text-[#1E3F31] group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="mt-3 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {taskSummary.completionRate}%
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#EFECE4] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5C7C66] transition-all duration-300"
                style={{ width: `${taskSummary.completionRate}%` }}
              />
            </div>
          </button>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tasks + Daily Quote */}
        <div className="lg:col-span-7 space-y-6">
          {/* Priority Tasks Widget */}
          <section
            aria-labelledby="dashboard-tasks-heading"
            className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EFECE4]">
              <div>
                <h2
                  id="dashboard-tasks-heading"
                  className="font-serif text-xl font-medium text-[#1C241E]"
                >
                  Today&apos;s focus tasks
                </h2>
                <p className="text-xs text-[#58645B] mt-0.5">
                  Prioritized by deadline and urgency
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Tasks)}
                className="text-sm font-medium text-[#1E3F31] hover:underline whitespace-nowrap shrink-0"
              >
                View all tasks
              </button>
            </div>

            {/* Inline Quick Task Input */}
            <form onSubmit={handleInlineAdd} className="mt-4">
              <div className="flex items-center gap-2">
                <label htmlFor="dashboard-inline-task" className="sr-only">
                  Quick add task for today
                </label>
                <input
                  id="dashboard-inline-task"
                  type="text"
                  value={inlineTaskTitle}
                  onChange={(e) => {
                    setInlineTaskTitle(e.target.value);
                    if (inlineTaskError) setInlineTaskError('');
                  }}
                  placeholder="Write a quick task for today..."
                  className="flex-1 min-w-0 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors whitespace-nowrap shrink-0"
                >
                  Add
                </button>
              </div>
              {inlineTaskError && (
                <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                  {inlineTaskError}
                </p>
              )}
            </form>

            {/* Task Rows */}
            <div className="mt-4 divide-y divide-[#F2EFE8]">
              {prioritizedTasks.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-[#1C241E]">
                    Your task list is clear
                  </p>
                  <p className="mt-1 text-xs text-[#58645B]">
                    Add a priority task above to map out your day.
                  </p>
                </div>
              ) : (
                prioritizedTasks.map((task) => {
                  const priorityLabel =
                    task.priority === TaskPriority.High
                      ? 'High priority'
                      : task.priority === TaskPriority.Medium
                      ? 'Medium priority'
                      : 'Low priority';
                  const deadlineText = formatDeadlineLabel(
                    task.dueDate,
                    task.dueTime,
                    todayKey
                  );
                  const deadlineStatus = getDeadlineStatus(
                    task.dueDate,
                    task.dueTime,
                    task.completed,
                    now
                  );

                  return (
                    <div
                      key={task.id}
                      className="group flex items-start justify-between gap-3 py-3.5"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={task.completed}
                          aria-label={`Mark "${task.title}" as ${
                            task.completed ? 'incomplete' : 'complete'
                          }`}
                          onClick={() => onToggleTask(task.id)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            task.completed
                              ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                              : 'border-[#C7C1B5] bg-white hover:border-[#1E3F31]'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium leading-snug ${
                              task.completed
                                ? 'line-through text-[#7D8880]'
                                : 'text-[#1C241E]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-[#58645B] flex flex-wrap items-center gap-x-1.5">
                            <span>{task.category}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                task.priority === TaskPriority.High && !task.completed
                                  ? 'text-[#1E3F31] font-medium'
                                  : ''
                              }
                            >
                              {priorityLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                deadlineStatus === 'overdue'
                                  ? 'text-[#B42318] font-medium'
                                  : ''
                              }
                            >
                              {deadlineStatus === 'overdue'
                                ? `Overdue (${deadlineText})`
                                : deadlineText}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          aria-label={`Edit task "${task.title}"`}
                          className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          aria-label={`Delete task "${task.title}"`}
                          className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Daily Motivational Quote */}
          <section
            aria-labelledby="daily-quote-heading"
            className="rounded-2xl bg-[#EEF3EE] border border-[#DCE5DC] p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="daily-quote-heading"
                className="text-xs font-semibold tracking-wide text-[#3D5B47]"
              >
                Daily reflection
              </h2>
              <button
                type="button"
                onClick={onCycleQuote}
                aria-label="Show another daily reflection quote"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#1E3F31] hover:bg-[#DFE9E0] transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Next quote</span>
              </button>
            </div>
            <blockquote className="mt-3 font-serif text-lg sm:text-xl leading-relaxed text-[#1C241E]">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-[#4B574E]">— {quote.author}</p>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Journal)}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap shrink-0"
              >
                Open journal
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Habit Progress + Upcoming Events */}
        <div className="lg:col-span-5 space-y-6">
          {/* Habit Progress Widget */}
          <section
            aria-labelledby="habit-progress-heading"
            className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="habit-progress-heading"
                  className="font-serif text-xl font-medium text-[#1C241E]"
                >
                  Habit progress
                </h2>
                <p className="mt-0.5 text-xs text-[#58645B] tabular-nums">
                  {habitProgress.completedToday} of {habitProgress.totalHabits} logged
                  today
                </p>
              </div>
              <span className="font-serif text-2xl font-medium text-[#1E3F31] tabular-nums">
                {habitProgress.percentage}%
              </span>
            </div>

            <div className="mt-3.5 h-2 w-full rounded-full bg-[#EFECE4] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1E3F31] transition-all duration-300"
                style={{ width: `${habitProgress.percentage}%` }}
              />
            </div>

            <div className="mt-5 space-y-2.5">
              {habits.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[#58645B]">No habits added yet.</p>
                  <button
                    type="button"
                    onClick={() => onOpenQuickModal('habit')}
                    className="mt-2 text-sm font-medium text-[#1E3F31] hover:underline"
                  >
                    Create your first habit
                  </button>
                </div>
              ) : (
                habits.map((habit) => {
                  const doneToday = habit.completedDates.includes(todayKey);
                  const streak = computeHabitStreak(habit.completedDates, todayKey);
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => onToggleHabitToday(habit.id, todayKey)}
                      aria-pressed={doneToday}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-150 ${
                        doneToday
                          ? 'bg-[#EEF4EF] border-[#B9CEBE]'
                          : 'bg-[#FBF9F4] border-[#EAE6DC] hover:border-[#C9C3B6]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            doneToday
                              ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                              : 'bg-white border-[#C5BFB2]'
                          }`}
                        >
                          {doneToday && <Check className="w-3 h-3" />}
                        </span>
                        <div className="min-w-0">
                          <span
                            className={`block text-sm font-medium truncate ${
                              doneToday ? 'text-[#1E3F31]' : 'text-[#1C241E]'
                            }`}
                          >
                            {habit.name}
                          </span>
                          <span className="block text-xs text-[#58645B] truncate">
                            {habit.cue}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#5C7C66] tabular-nums whitespace-nowrap shrink-0">
                        {streak > 0 ? `${streak}d streak` : 'Start'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#EFECE4] flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Habits)}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
              >
                Open weekly habit grid
              </button>
            </div>
          </section>

          {/* Upcoming Events Widget */}
          <section
            aria-labelledby="upcoming-events-heading"
            className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EFECE4]">
              <div>
                <h2
                  id="upcoming-events-heading"
                  className="font-serif text-xl font-medium text-[#1C241E]"
                >
                  Upcoming events
                </h2>
                <p className="text-xs text-[#58645B] mt-0.5">
                  Your next scheduled commitments
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(NavigationView.Calendar)}
                className="text-sm font-medium text-[#1E3F31] hover:underline whitespace-nowrap shrink-0"
              >
                Calendar
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#F2EFE8]">
              {visibleEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-[#1C241E]">
                    Nothing scheduled ahead
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenQuickModal('event')}
                    className="mt-1.5 text-xs font-medium text-[#1E3F31] hover:underline"
                  >
                    Add an upcoming event
                  </button>
                </div>
              ) : (
                visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group flex items-start justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-[#5C7C66] font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {formatShortDateLabel(event.date, todayKey)} ·{' '}
                          {formatTime12Hour(event.startTime)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-[#1C241E] truncate">
                        {event.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#58645B]">
                        <MapPin className="w-3 h-3 shrink-0 text-[#7D8880]" />
                        <span className="truncate">
                          {event.location} · {event.category}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditEvent(event)}
                        aria-label={`Edit event "${event.title}"`}
                        className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(event.id)}
                        aria-label={`Remove event "${event.title}"`}
                        className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Dashboard Analytics & Insights */}
      <DashboardAnalytics
        tasks={tasks}
        habits={habits}
        pomodoroSessions={pomodoroSessions}
        todayKey={todayKey}
        onNavigate={onNavigate}
        onOpenQuickModal={onOpenQuickModal}
      />
    </div>
  );
}
