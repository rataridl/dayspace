import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { TaskCategory, TaskItem, TaskPriority } from '../types/dayspace';
import {
  TaskSortOption,
  formatDeadlineLabel,
  getDeadlineStatus,
  getTodayDateKey,
  sortTasks,
} from '../utils/productivity';

interface TasksViewProps {
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: () => void;
}

type StatusFilter = 'all' | 'active' | 'completed';

export function TasksView({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
}: TasksViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<TaskSortOption>('smart');
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const todayKey = getTodayDateKey(now);

  const filteredTasks = useMemo(() => {
    const sorted = sortTasks(tasks, todayKey, sortBy);
    return sorted.filter((task) => {
      if (statusFilter === 'active' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const notesMatch = (task.notes || '').toLowerCase().includes(q);
        if (!titleMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [tasks, todayKey, sortBy, statusFilter, categoryFilter, priorityFilter, searchQuery]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter(
    (t) => getDeadlineStatus(t.dueDate, t.dueTime, t.completed, now) === 'overdue'
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-[#58645B] tabular-nums">
            {activeCount} active · {completedCount} completed
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewTask}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add task</span>
        </button>
      </header>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white border border-[#E5E1D8] p-4 shadow-[0_2px_12px_rgba(28,36,30,0.02)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F3EFE6] self-start"
            role="tablist"
            aria-label="Filter tasks by status"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'completed', label: 'Completed' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#1C241E] shadow-xs'
                      : 'text-[#58645B] hover:text-[#1C241E]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#7D8880] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="tasks-search-input" className="sr-only">
                Search tasks
              </label>
              <input
                id="tasks-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full lg:w-48 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-9 pr-3 py-2 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>

            <label htmlFor="tasks-category-select" className="sr-only">
              Filter by category
            </label>
            <select
              id="tasks-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            >
              <option value="all">All categories</option>
              {Object.values(TaskCategory).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <label htmlFor="tasks-priority-select" className="sr-only">
              Filter by priority
            </label>
            <select
              id="tasks-priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            >
              <option value="all">All priorities</option>
              <option value={TaskPriority.High}>High priority</option>
              <option value={TaskPriority.Medium}>Medium priority</option>
              <option value={TaskPriority.Low}>Low priority</option>
            </select>

            <label htmlFor="tasks-sort-select" className="sr-only">
              Sort tasks
            </label>
            <select
              id="tasks-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSortOption)}
              className="rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            >
              <option value="smart">Sort: Smart order</option>
              <option value="deadline">Sort: Deadline</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <section className="rounded-2xl bg-white border border-[#E5E1D8] px-6 py-2 shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base font-medium text-[#1C241E]">
              No matching tasks found
            </p>
            <p className="mt-1 text-sm text-[#58645B]">
              {tasks.length === 0
                ? 'Start by adding your first task for today.'
                : 'Try adjusting your filters or create a new task.'}
            </p>
            <button
              type="button"
              onClick={onOpenNewTask}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create task</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F2EFE8]">
            {filteredTasks.map((task) => {
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
              const priorityLabel =
                task.priority === TaskPriority.High
                  ? 'High priority'
                  : task.priority === TaskPriority.Medium
                  ? 'Medium priority'
                  : 'Low priority';

              return (
                <div
                  key={task.id}
                  className="group flex items-start justify-between gap-4 py-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
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
                      {task.notes && (
                        <p className="mt-1 text-xs text-[#58645B] line-clamp-2">
                          {task.notes}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-[#58645B] flex flex-wrap items-center gap-x-1.5">
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
                            : `Due ${deadlineText}`}
                        </span>
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
