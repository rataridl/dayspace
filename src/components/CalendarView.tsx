import { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CalendarDisplayMode,
  CalendarEvent,
  TaskItem,
  TaskPriority,
} from '../types/dayspace';
import {
  addDaysToDateKey,
  formatLongDateFromKey,
  formatShortDateLabel,
  formatTime12Hour,
  getMonthCalendarCells,
  getMonthTitle,
  getTodayDateKey,
  getWeekCalendarDays,
  getWeekRangeLabel,
  parseDateKey,
} from '../utils/productivity';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  calendarMode: CalendarDisplayMode;
  onChangeCalendarMode: (mode: CalendarDisplayMode) => void;
  onOpenNewEvent: (initialDate?: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onOpenNewTask: (initialDate?: string) => void;
  onEditTask: (task: TaskItem) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

type LayerFilter = 'all' | 'events' | 'deadlines';

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  events,
  tasks,
  calendarMode,
  onChangeCalendarMode,
  onOpenNewEvent,
  onEditEvent,
  onDeleteEvent,
  onOpenNewTask,
  onEditTask,
  onToggleTask,
  onDeleteTask,
}: CalendarViewProps) {
  const todayKey = getTodayDateKey();
  const todayDate = parseDateKey(todayKey);

  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [viewYear, setViewYear] = useState<number>(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDate.getMonth());
  const [weekAnchor, setWeekAnchor] = useState<string>(todayKey);
  const [layerFilter, setLayerFilter] = useState<LayerFilter>('all');

  const monthCells = useMemo(
    () => getMonthCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const weekDays = useMemo(() => getWeekCalendarDays(weekAnchor), [weekAnchor]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    for (const dateKey of Object.keys(map)) {
      map[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const t of tasks) {
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    }
    const weight: Record<TaskPriority, number> = {
      [TaskPriority.High]: 0,
      [TaskPriority.Medium]: 1,
      [TaskPriority.Low]: 2,
    };
    for (const dateKey of Object.keys(map)) {
      map[dateKey].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return weight[a.priority] - weight[b.priority];
      });
    }
    return map;
  }, [tasks]);

  const selectedDayEvents =
    layerFilter === 'deadlines' ? [] : eventsByDate[selectedDate] || [];
  const selectedDayTasks =
    layerFilter === 'events' ? [] : tasksByDate[selectedDate] || [];

  const agendaDateKeys = useMemo(() => {
    const keys = new Set<string>();
    if (layerFilter !== 'deadlines') {
      for (const ev of events) {
        if (ev.date >= todayKey) keys.add(ev.date);
      }
    }
    if (layerFilter !== 'events') {
      for (const t of tasks) {
        if (t.dueDate >= todayKey || !t.completed) keys.add(t.dueDate);
      }
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [events, tasks, todayKey, layerFilter]);

  const activeDeadlinesCount = tasks.filter((t) => !t.completed).length;
  const upcomingEventsCount = events.filter((e) => e.date >= todayKey).length;

  const handlePrevPeriod = () => {
    if (calendarMode === 'month') {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    } else if (calendarMode === 'week') {
      setWeekAnchor((prev) => addDaysToDateKey(prev, -7));
    }
  };

  const handleNextPeriod = () => {
    if (calendarMode === 'month') {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    } else if (calendarMode === 'week') {
      setWeekAnchor((prev) => addDaysToDateKey(prev, 7));
    }
  };

  const handleJumpToday = () => {
    setSelectedDate(todayKey);
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
    setWeekAnchor(todayKey);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
            Calendar &amp; Planner
          </h1>
          <p className="mt-1 text-sm text-[#58645B] tabular-nums">
            {upcomingEventsCount} upcoming{' '}
            {upcomingEventsCount === 1 ? 'event' : 'events'} · {activeDeadlinesCount}{' '}
            active {activeDeadlinesCount === 1 ? 'deadline' : 'deadlines'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenNewTask(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#DDD8CD] text-[#1C241E] text-sm font-medium hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-[#5C7C66]" />
            <span>Add task</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenNewEvent(selectedDate)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>New event</span>
          </button>
        </div>
      </header>

      {/* Toolbar: View Switcher + Period Controls + Layer Filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl bg-white border border-[#E5E1D8] p-4 shadow-[0_2px_12px_rgba(28,36,30,0.02)]">
        {/* Calendar View Switcher */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F3EFE6] self-start"
          role="tablist"
          aria-label="Calendar view mode"
        >
          {(
            [
              { id: 'month', label: 'Month' },
              { id: 'week', label: 'Week' },
              { id: 'agenda', label: 'Agenda' },
            ] as const
          ).map((mode) => {
            const active = calendarMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeCalendarMode(mode.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#1C241E] shadow-xs'
                    : 'text-[#58645B] hover:text-[#1C241E]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Period Navigation */}
        {calendarMode !== 'agenda' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPeriod}
              aria-label={
                calendarMode === 'month' ? 'Previous month' : 'Previous week'
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-serif text-base font-medium text-[#1C241E] px-2 min-w-[155px] text-center whitespace-nowrap">
              {calendarMode === 'month'
                ? getMonthTitle(viewYear, viewMonth)
                : getWeekRangeLabel(weekDays)}
            </span>
            <button
              type="button"
              onClick={handleNextPeriod}
              aria-label={calendarMode === 'month' ? 'Next month' : 'Next week'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleJumpToday}
              className="ml-1 px-3 py-1.5 rounded-xl border border-[#DDD8CD] bg-white text-xs font-medium text-[#1E3F31] hover:bg-[#EEF4EF] transition-colors whitespace-nowrap shrink-0"
            >
              Today
            </button>
          </div>
        )}

        {/* Layer Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <label htmlFor="calendar-layer-select" className="text-xs text-[#58645B]">
            Show:
          </label>
          <select
            id="calendar-layer-select"
            value={layerFilter}
            onChange={(e) => setLayerFilter(e.target.value as LayerFilter)}
            className="rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-1.5 text-xs font-medium text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
          >
            <option value="all">Events &amp; deadlines</option>
            <option value="events">Events only</option>
            <option value="deadlines">Deadlines only</option>
          </select>
        </div>
      </div>

      {/* MONTH VIEW */}
      {calendarMode === 'month' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section
            aria-label="Monthly calendar grid"
            className="xl:col-span-8 rounded-2xl bg-white border border-[#E5E1D8] p-4 sm:p-5 shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
          >
            <div className="grid grid-cols-7 border-b border-[#EFECE4] pb-2.5 mb-2">
              {WEEKDAY_HEADERS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-[#58645B]"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthCells.map((cell) => {
                const dayEvents =
                  layerFilter === 'deadlines' ? [] : eventsByDate[cell.dateKey] || [];
                const dayTasks =
                  layerFilter === 'events' ? [] : tasksByDate[cell.dateKey] || [];
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDate;
                const totalCount = dayEvents.length + dayTasks.length;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateKey)}
                    aria-label={`${formatLongDateFromKey(cell.dateKey)}, ${
                      dayEvents.length
                    } events, ${dayTasks.length} deadlines`}
                    aria-pressed={isSelected}
                    className={`min-h-[76px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-[#EEF4EF] border-[#1E3F31]'
                        : isToday
                        ? 'bg-[#FAF8F2] border-[#9BB6A1]'
                        : cell.isCurrentMonth
                        ? 'bg-white border-[#EFECE4] hover:border-[#C7C1B5]'
                        : 'bg-[#FAF8F4] border-transparent text-[#8F9991] hover:border-[#E5E1D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs tabular-nums ${
                          isToday
                            ? 'bg-[#1E3F31] text-white font-semibold'
                            : cell.isCurrentMonth
                            ? 'text-[#1C241E] font-medium'
                            : 'text-[#8F9991]'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {totalCount > 0 && (
                        <span className="sm:hidden font-mono text-[10px] text-[#1E3F31] tabular-nums">
                          {totalCount}
                        </span>
                      )}
                    </div>

                    <div className="hidden sm:block space-y-1 mt-1 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[11px] leading-tight text-[#1E3F31] font-medium truncate border-b border-[#DCE5DC] pb-0.5"
                        >
                          {formatTime12Hour(ev.startTime).replace(':00 ', '')} {ev.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, Math.max(0, 2 - dayEvents.slice(0, 2).length)).map((t) => (
                        <div
                          key={t.id}
                          className={`text-[11px] leading-tight truncate ${
                            t.completed
                              ? 'line-through text-[#8F9991]'
                              : t.priority === TaskPriority.High
                              ? 'text-[#B42318] font-medium'
                              : 'text-[#4B574E]'
                          }`}
                        >
                          Due: {t.title}
                        </div>
                      ))}
                      {totalCount > 2 && (
                        <div className="text-[10px] font-mono text-[#58645B] tabular-nums">
                          +{totalCount - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Day Inspector Panel */}
          <aside
            aria-label="Selected day planner"
            className="xl:col-span-4 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] space-y-5"
          >
            <div className="pb-4 border-b border-[#EFECE4]">
              <p className="text-xs font-medium text-[#5C7C66]">
                {formatShortDateLabel(selectedDate, todayKey)}
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium text-[#1C241E]">
                {formatLongDateFromKey(selectedDate)}
              </h2>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenNewEvent(selectedDate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNewTask(selectedDate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8EFE9] text-[#1E3F31] text-xs font-medium hover:bg-[#D8E5DA] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Task deadline</span>
                </button>
              </div>
            </div>

            {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-[#1C241E]">
                  No plans on this day
                </p>
                <p className="mt-1 text-xs text-[#58645B]">
                  Add an event or task deadline for{' '}
                  {formatShortDateLabel(selectedDate, todayKey).toLowerCase()}.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {selectedDayEvents.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#58645B] mb-2">
                      Scheduled events ({selectedDayEvents.length})
                    </h3>
                    <div className="divide-y divide-[#F2EFE8]">
                      {selectedDayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-start justify-between gap-2 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs text-[#5C7C66] tabular-nums">
                              {formatTime12Hour(ev.startTime)}
                              {ev.endTime ? ` – ${formatTime12Hour(ev.endTime)}` : ''}
                            </p>
                            <p className="mt-0.5 text-sm font-medium text-[#1C241E]">
                              {ev.title}
                            </p>
                            <p className="mt-0.5 text-xs text-[#58645B]">
                              {ev.location} · {ev.category}
                            </p>
                            {ev.notes && (
                              <p className="mt-1 text-xs text-[#6A786D]">{ev.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditEvent(ev)}
                              aria-label={`Edit event "${ev.title}"`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              aria-label={`Delete event "${ev.title}"`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDayTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#58645B] mb-2">
                      Task deadlines ({selectedDayTasks.length})
                    </h3>
                    <div className="divide-y divide-[#F2EFE8]">
                      {selectedDayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between gap-2 py-2.5"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={task.completed}
                              aria-label={`Mark "${task.title}" as ${
                                task.completed ? 'incomplete' : 'complete'
                              }`}
                              onClick={() => onToggleTask(task.id)}
                              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                task.completed
                                  ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                                  : 'border-[#C7C1B5] bg-white hover:border-[#1E3F31]'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-medium ${
                                  task.completed
                                    ? 'line-through text-[#7D8880]'
                                    : 'text-[#1C241E]'
                                }`}
                              >
                                {task.title}
                              </p>
                              <p className="mt-0.5 text-xs text-[#58645B]">
                                {task.priority} priority
                                {task.dueTime
                                  ? ` · By ${formatTime12Hour(task.dueTime)}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              aria-label={`Edit task "${task.title}"`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              aria-label={`Delete task "${task.title}"`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* WEEK VIEW */}
      {calendarMode === 'week' && (
        <section
          aria-label="Weekly planner view"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3"
        >
          {weekDays.map((dayKey) => {
            const dt = parseDateKey(dayKey);
            const weekdayName = new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
            }).format(dt);
            const dayNum = dt.getDate();
            const isToday = dayKey === todayKey;
            const dayEvents =
              layerFilter === 'deadlines' ? [] : eventsByDate[dayKey] || [];
            const dayTasks =
              layerFilter === 'events' ? [] : tasksByDate[dayKey] || [];

            return (
              <div
                key={dayKey}
                className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[220px] ${
                  isToday
                    ? 'bg-[#F4F8F4] border-[#8EAD96]'
                    : 'bg-white border-[#E5E1D8]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#EFECE4]">
                    <div>
                      <span className="block text-xs font-medium text-[#58645B]">
                        {weekdayName}
                      </span>
                      <span
                        className={`font-serif text-xl font-medium tabular-nums ${
                          isToday ? 'text-[#1E3F31]' : 'text-[#1C241E]'
                        }`}
                      >
                        {dayNum}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenNewEvent(dayKey)}
                      aria-label={`Add event on ${formatLongDateFromKey(dayKey)}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#58645B] hover:bg-[#E8EFE9] hover:text-[#1E3F31] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="group rounded-xl bg-[#FBF9F4] border border-[#E5E1D8] p-2.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-mono text-[11px] text-[#5C7C66] tabular-nums">
                            {formatTime12Hour(ev.startTime)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEditEvent(ev)}
                              aria-label={`Edit event "${ev.title}"`}
                              className="p-0.5 text-[#6A786D] hover:text-[#1E3F31]"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              aria-label={`Delete event "${ev.title}"`}
                              className="p-0.5 text-[#6A786D] hover:text-[#B42318]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-[#1C241E] leading-snug">
                          {ev.title}
                        </p>
                      </div>
                    ))}

                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 py-1 border-b border-[#F2EFE8] last:border-b-0"
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={task.completed}
                          aria-label={`Mark "${task.title}" as ${
                            task.completed ? 'incomplete' : 'complete'
                          }`}
                          onClick={() => onToggleTask(task.id)}
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            task.completed
                              ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                              : 'border-[#C7C1B5] bg-white'
                          }`}
                        >
                          {task.completed && <Check className="w-2.5 h-2.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className={`text-left text-xs leading-snug flex-1 min-w-0 hover:underline ${
                            task.completed
                              ? 'line-through text-[#7D8880]'
                              : 'text-[#1C241E]'
                          }`}
                        >
                          {task.title}
                        </button>
                      </div>
                    ))}

                    {dayEvents.length === 0 && dayTasks.length === 0 && (
                      <p className="text-xs text-[#8F9991] py-2">Open day</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* AGENDA VIEW */}
      {calendarMode === 'agenda' && (
        <>
          {agendaDateKeys.length === 0 ? (
            <section className="rounded-2xl bg-white border border-[#E5E1D8] p-12 text-center shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
              <p className="text-base font-medium text-[#1C241E]">
                Your upcoming schedule is open
              </p>
              <p className="mt-1 text-sm text-[#58645B]">
                Add meetings, appointments, or task deadlines to organize your week.
              </p>
              <button
                type="button"
                onClick={() => onOpenNewEvent(todayKey)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule event</span>
              </button>
            </section>
          ) : (
            <div className="space-y-5">
              {agendaDateKeys.map((dateKey) => {
                const dayEvents =
                  layerFilter === 'deadlines' ? [] : eventsByDate[dateKey] || [];
                const dayTasks =
                  layerFilter === 'events' ? [] : tasksByDate[dateKey] || [];
                if (dayEvents.length === 0 && dayTasks.length === 0) return null;

                return (
                  <section
                    key={dateKey}
                    className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#EFECE4]">
                      <h2 className="font-serif text-lg font-medium text-[#1C241E]">
                        {formatShortDateLabel(dateKey, todayKey)} ·{' '}
                        {formatLongDateFromKey(dateKey)}
                      </h2>
                      <span className="font-mono text-xs text-[#58645B] tabular-nums">
                        {dateKey}
                      </span>
                    </div>

                    <div className="mt-2 divide-y divide-[#F2EFE8]">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start justify-between gap-4 py-3.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 font-mono text-xs text-[#5C7C66] tabular-nums">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {formatTime12Hour(event.startTime)}
                                {event.endTime
                                  ? ` – ${formatTime12Hour(event.endTime)}`
                                  : ''}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-[#1C241E]">
                              {event.title}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#58645B]">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#7D8880]" />
                              <span>
                                {event.location} · {event.category}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditEvent(event)}
                              aria-label={`Edit event "${event.title}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(event.id)}
                              aria-label={`Delete event "${event.title}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between gap-4 py-3.5"
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
                                className={`text-sm font-medium ${
                                  task.completed
                                    ? 'line-through text-[#7D8880]'
                                    : 'text-[#1C241E]'
                                }`}
                              >
                                {task.title}
                              </p>
                              <p className="mt-0.5 text-xs text-[#58645B]">
                                Deadline · {task.priority} priority
                                {task.dueTime
                                  ? ` · ${formatTime12Hour(task.dueTime)}`
                                  : ''}{' '}
                                · {task.category}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              aria-label={`Edit task "${task.title}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              aria-label={`Delete task "${task.title}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
