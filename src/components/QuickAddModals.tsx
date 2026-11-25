import { FormEvent, useEffect, useState } from 'react';
import {
  CalendarEvent,
  HabitItem,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/dayspace';
import { getTodayDateKey } from '../utils/productivity';
import { ModalDialog } from './ModalDialog';

export type QuickModalKind = 'task' | 'habit' | 'event' | null;

export interface TaskFormPayload {
  title: string;
  notes?: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string;
  dueTime?: string;
}

export interface HabitFormPayload {
  name: string;
  cue: string;
  category: string;
  targetDaysPerWeek: number;
}

export interface EventFormPayload {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  category: string;
  notes?: string;
}

interface QuickAddModalsProps {
  activeModal: QuickModalKind;
  editingTask: TaskItem | null;
  editingHabit: HabitItem | null;
  editingEvent: CalendarEvent | null;
  initialDate?: string;
  onClose: () => void;
  onAddTask: (input: TaskFormPayload) => void;
  onUpdateTask: (taskId: string, updates: TaskFormPayload) => void;
  onAddHabit: (input: HabitFormPayload) => void;
  onUpdateHabit: (habitId: string, updates: HabitFormPayload) => void;
  onAddEvent: (input: EventFormPayload) => void;
  onUpdateEvent: (eventId: string, updates: EventFormPayload) => void;
}

export function QuickAddModals({
  activeModal,
  editingTask,
  editingHabit,
  editingEvent,
  initialDate,
  onClose,
  onAddTask,
  onUpdateTask,
  onAddHabit,
  onUpdateHabit,
  onAddEvent,
  onUpdateEvent,
}: QuickAddModalsProps) {
  const today = getTodayDateKey();

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>(TaskCategory.Work);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(TaskPriority.Medium);
  const [taskDueDate, setTaskDueDate] = useState(today);
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskError, setTaskError] = useState('');

  // Habit form state
  const [habitName, setHabitName] = useState('');
  const [habitCue, setHabitCue] = useState('');
  const [habitCategory, setHabitCategory] = useState('Wellness');
  const [habitTarget, setHabitTarget] = useState(5);
  const [habitError, setHabitError] = useState('');

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(today);
  const [eventStart, setEventStart] = useState('10:00');
  const [eventEnd, setEventEnd] = useState('11:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCategory, setEventCategory] = useState('Work');
  const [eventNotes, setEventNotes] = useState('');
  const [eventError, setEventError] = useState('');

  useEffect(() => {
    if (activeModal === 'task') {
      if (editingTask) {
        setTaskTitle(editingTask.title);
        setTaskNotes(editingTask.notes || '');
        setTaskCategory(editingTask.category);
        setTaskPriority(editingTask.priority);
        setTaskDueDate(editingTask.dueDate);
        setTaskDueTime(editingTask.dueTime || '');
      } else {
        setTaskTitle('');
        setTaskNotes('');
        setTaskCategory(TaskCategory.Work);
        setTaskPriority(TaskPriority.Medium);
        setTaskDueDate(initialDate || getTodayDateKey());
        setTaskDueTime('');
      }
      setTaskError('');
    } else if (activeModal === 'event') {
      if (editingEvent) {
        setEventTitle(editingEvent.title);
        setEventDate(editingEvent.date);
        setEventStart(editingEvent.startTime);
        setEventEnd(editingEvent.endTime || '');
        setEventLocation(editingEvent.location);
        setEventCategory(editingEvent.category);
        setEventNotes(editingEvent.notes || '');
      } else {
        setEventTitle('');
        setEventDate(initialDate || getTodayDateKey());
        setEventStart('10:00');
        setEventEnd('11:00');
        setEventLocation('');
        setEventCategory('Work');
        setEventNotes('');
      }
      setEventError('');
    } else if (activeModal === 'habit') {
      if (editingHabit) {
        setHabitName(editingHabit.name);
        setHabitCue(editingHabit.cue);
        setHabitCategory(editingHabit.category || 'Wellness');
        setHabitTarget(editingHabit.targetDaysPerWeek);
      } else {
        setHabitName('');
        setHabitCue('');
        setHabitCategory('Wellness');
        setHabitTarget(5);
      }
      setHabitError('');
    }
  }, [activeModal, editingTask, editingHabit, editingEvent, initialDate]);

  const handleClose = () => {
    setTaskError('');
    setHabitError('');
    setEventError('');
    onClose();
  };

  const handleTaskSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskError('Please enter a task title.');
      return;
    }
    if (!taskDueDate) {
      setTaskError('Please choose a deadline date.');
      return;
    }
    const payload: TaskFormPayload = {
      title: taskTitle,
      notes: taskNotes,
      category: taskCategory,
      priority: taskPriority,
      dueDate: taskDueDate,
      dueTime: taskDueTime,
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
    } else {
      onAddTask(payload);
    }
    onClose();
  };

  const handleHabitSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      setHabitError('Please enter a habit name.');
      return;
    }
    const payload: HabitFormPayload = {
      name: habitName,
      cue: habitCue,
      category: habitCategory,
      targetDaysPerWeek: habitTarget,
    };
    if (editingHabit) {
      onUpdateHabit(editingHabit.id, payload);
    } else {
      onAddHabit(payload);
    }
    onClose();
  };

  const handleEventSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      setEventError('Please enter an event title.');
      return;
    }
    if (!eventDate || !eventStart) {
      setEventError('Please choose both a date and start time.');
      return;
    }
    const payload: EventFormPayload = {
      title: eventTitle,
      date: eventDate,
      startTime: eventStart,
      endTime: eventEnd,
      location: eventLocation,
      category: eventCategory,
      notes: eventNotes,
    };
    if (editingEvent) {
      onUpdateEvent(editingEvent.id, payload);
    } else {
      onAddEvent(payload);
    }
    onClose();
  };

  return (
    <>
      <ModalDialog
        isOpen={activeModal === 'task'}
        title={editingTask ? 'Edit task' : 'Add a new task'}
        description={
          editingTask
            ? 'Adjust priority, deadline, or notes.'
            : 'Set a clear priority and deadline.'
        }
        onClose={handleClose}
      >
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="quick-task-title"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Task title
            </label>
            <input
              id="quick-task-title"
              type="text"
              value={taskTitle}
              onChange={(e) => {
                setTaskTitle(e.target.value);
                if (taskError) setTaskError('');
              }}
              placeholder="e.g. Draft studio notes"
              autoFocus
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
            {taskError && (
              <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                {taskError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-task-category"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Category
              </label>
              <select
                id="quick-task-category"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                {Object.values(TaskCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quick-task-priority"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Priority level
              </label>
              <select
                id="quick-task-priority"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                <option value={TaskPriority.High}>High priority</option>
                <option value={TaskPriority.Medium}>Medium priority</option>
                <option value={TaskPriority.Low}>Low priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-task-due"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Deadline date
              </label>
              <input
                id="quick-task-due"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="quick-task-due-time"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Deadline time
              </label>
              <input
                id="quick-task-due-time"
                type="time"
                value={taskDueTime}
                onChange={(e) => setTaskDueTime(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="quick-task-notes"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Notes (optional)
            </label>
            <textarea
              id="quick-task-notes"
              rows={2}
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Add context, links, or checklist details..."
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#58645B] rounded-xl hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
            >
              {editingTask ? 'Update task' : 'Save task'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        isOpen={activeModal === 'habit'}
        title={editingHabit ? 'Edit habit' : 'Create a custom habit'}
        description={
          editingHabit
            ? 'Adjust your routine cue, category, or weekly target.'
            : 'Build gentle consistency with a clear daily cue.'
        }
        onClose={handleClose}
      >
        <form onSubmit={handleHabitSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="quick-habit-name"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Habit name
            </label>
            <input
              id="quick-habit-name"
              type="text"
              value={habitName}
              onChange={(e) => {
                setHabitName(e.target.value);
                if (habitError) setHabitError('');
              }}
              placeholder="e.g. 10 minutes of stretching"
              autoFocus
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
            {habitError && (
              <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                {habitError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="quick-habit-cue"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Time or cue
            </label>
            <input
              id="quick-habit-cue"
              type="text"
              value={habitCue}
              onChange={(e) => setHabitCue(e.target.value)}
              placeholder="e.g. After morning coffee"
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-habit-category"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Category
              </label>
              <select
                id="quick-habit-category"
                value={habitCategory}
                onChange={(e) => setHabitCategory(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                <option value="Wellness">Wellness</option>
                <option value="Mindfulness">Mindfulness</option>
                <option value="Fitness">Fitness</option>
                <option value="Learning">Learning</option>
                <option value="Routine">Routine</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="quick-habit-target"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Weekly goal
              </label>
              <select
                id="quick-habit-target"
                value={habitTarget}
                onChange={(e) => setHabitTarget(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? 'day' : 'days'} / wk
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#58645B] rounded-xl hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
            >
              {editingHabit ? 'Update habit' : 'Create habit'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        isOpen={activeModal === 'event'}
        title={editingEvent ? 'Edit event' : 'Schedule an event'}
        description={
          editingEvent
            ? 'Update timing, location, or details.'
            : 'Add a meeting, appointment, or focus block.'
        }
        onClose={handleClose}
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="quick-event-title"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Event title
            </label>
            <input
              id="quick-event-title"
              type="text"
              value={eventTitle}
              onChange={(e) => {
                setEventTitle(e.target.value);
                if (eventError) setEventError('');
              }}
              placeholder="e.g. Afternoon studio check-in"
              autoFocus
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
            {eventError && (
              <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                {eventError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-event-date"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Date
              </label>
              <input
                id="quick-event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="quick-event-category"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Context
              </label>
              <select
                id="quick-event-category"
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                <option value="Work">Work</option>
                <option value="Wellness">Wellness</option>
                <option value="Personal">Personal</option>
                <option value="Home">Home</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="quick-event-start"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Start time
              </label>
              <input
                id="quick-event-start"
                type="time"
                value={eventStart}
                onChange={(e) => setEventStart(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="quick-event-end"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                End time
              </label>
              <input
                id="quick-event-end"
                type="time"
                value={eventEnd}
                onChange={(e) => setEventEnd(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="quick-event-location"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Location or link note
            </label>
            <input
              id="quick-event-location"
              type="text"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="e.g. Studio Meet or Cedar Roasters"
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="quick-event-notes"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Notes (optional)
            </label>
            <textarea
              id="quick-event-notes"
              rows={2}
              value={eventNotes}
              onChange={(e) => setEventNotes(e.target.value)}
              placeholder="Agenda or preparation details..."
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-[#58645B] rounded-xl hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
            >
              {editingEvent ? 'Update event' : 'Save event'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}
