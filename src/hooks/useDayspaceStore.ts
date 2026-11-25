import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialDayspaceState } from '../data/seed';
import { supabase } from '../lib/supabase';
import {
  CalendarDisplayMode,
  CalendarEvent,
  DayspaceState,
  FinanceTransaction,
  HabitItem,
  JournalEntry,
  JournalMood,
  PomodoroMode,
  PomodoroSessionRecord,
  PomodoroSettings,
  SavingsGoal,
  TaskCategory,
  TaskItem,
  TaskPriority,
  TransactionType,
  UserProfile,
} from '../types/dayspace';
import {
  clampDurationMinutes,
  getTodayDateKey,
} from '../utils/productivity';
import {
  createEmptyDayspaceState,
  loadDayspaceState,
  saveDayspaceState,
} from '../utils/storage';
import {
  CloudSyncStatus,
  fetchCloudWorkspace,
  resolveInitialCloudSync,
  saveCloudWorkspace,
} from '../utils/supabaseSync';

export function useDayspaceStore(cloudUserId?: string | null) {
  const [state, setState] = useState<DayspaceState>(() => loadDayspaceState());
  const [storageError, setStorageError] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('local');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const isInitialMountRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const hydratedCloudUserRef = useRef<string | null>(null);
  const skipNextCloudSaveRef = useRef(false);

  // Always persist state changes to LocalStorage immediately
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    const result = saveDayspaceState(state);
    setStorageError(result.ok ? null : result.error || 'Unable to save locally.');
  }, [state]);

  // Initial cloud sync when user signs in (never overwrites local data with empty cloud data)
  useEffect(() => {
    if (!cloudUserId || !supabase) {
      hydratedCloudUserRef.current = null;
      setCloudSyncStatus('local');
      setCloudSyncError(null);
      return;
    }

    if (hydratedCloudUserRef.current === cloudUserId) {
      return;
    }

    let cancelled = false;
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);

    (async () => {
      const fetchResult = await fetchCloudWorkspace(supabase, cloudUserId);
      if (cancelled) return;

      if (!fetchResult.ok) {
        hydratedCloudUserRef.current = cloudUserId;
        setCloudSyncStatus('error');
        setCloudSyncError(
          fetchResult.error || 'Unable to load cloud workspace.'
        );
        return;
      }

      const resolution = resolveInitialCloudSync(
        stateRef.current,
        fetchResult.data
      );

      if (resolution.shouldUploadLocal) {
        const uploadResult = await saveCloudWorkspace(
          supabase,
          cloudUserId,
          resolution.stateToUse
        );
        if (cancelled) return;
        hydratedCloudUserRef.current = cloudUserId;
        if (!uploadResult.ok) {
          setCloudSyncStatus('error');
          setCloudSyncError(
            uploadResult.error || 'Unable to sync local workspace to cloud.'
          );
        } else {
          setCloudSyncStatus('synced');
          setLastSyncedAt(uploadResult.updatedAt ?? new Date().toISOString());
        }
      } else {
        skipNextCloudSaveRef.current = true;
        setState(resolution.stateToUse);
        saveDayspaceState(resolution.stateToUse);
        hydratedCloudUserRef.current = cloudUserId;
        setCloudSyncStatus('synced');
        setLastSyncedAt(fetchResult.updatedAt ?? new Date().toISOString());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloudUserId]);

  // Debounced auto-save to Supabase whenever state changes while signed in
  useEffect(() => {
    if (!cloudUserId || !supabase) return;
    if (hydratedCloudUserRef.current !== cloudUserId) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const client = supabase;
    const timer = window.setTimeout(async () => {
      setCloudSyncStatus('syncing');
      const result = await saveCloudWorkspace(client, cloudUserId, state);
      if (!result.ok) {
        setCloudSyncStatus('error');
        setCloudSyncError(result.error || 'Cloud sync failed.');
      } else {
        setCloudSyncStatus('synced');
        setCloudSyncError(null);
        setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [state, cloudUserId]);

  const syncNow = useCallback(async () => {
    if (!cloudUserId || !supabase) return;
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);
    const result = await saveCloudWorkspace(
      supabase,
      cloudUserId,
      stateRef.current
    );
    if (!result.ok) {
      setCloudSyncStatus('error');
      setCloudSyncError(result.error || 'Cloud sync failed.');
    } else {
      setCloudSyncStatus('synced');
      setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
    }
  }, [cloudUserId]);

  const addTask = useCallback(
    (input: {
      title: string;
      notes?: string;
      category: TaskCategory;
      priority: TaskPriority;
      dueDate: string;
      dueTime?: string;
    }) => {
      const newTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: input.title.trim(),
        notes: input.notes?.trim() || undefined,
        category: input.category,
        priority: input.priority,
        dueDate: input.dueDate || getTodayDateKey(),
        dueTime: input.dueTime?.trim() || undefined,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
    },
    []
  );

  const updateTask = useCallback(
    (
      taskId: string,
      updates: {
        title: string;
        notes?: string;
        category: TaskCategory;
        priority: TaskPriority;
        dueDate: string;
        dueTime?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: updates.title.trim(),
                notes: updates.notes?.trim() || undefined,
                category: updates.category,
                priority: updates.priority,
                dueDate: updates.dueDate || task.dueDate,
                dueTime: updates.dueTime?.trim() || undefined,
              }
            : task
        ),
      }));
    },
    []
  );

  const toggleTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
  }, []);

  const addHabit = useCallback(
    (input: {
      name: string;
      cue: string;
      category?: string;
      targetDaysPerWeek: number;
    }) => {
      const newHabit: HabitItem = {
        id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        cue: input.cue.trim() || 'Daily routine',
        category: input.category?.trim() || 'Wellness',
        targetDaysPerWeek: input.targetDaysPerWeek,
        completedDates: [],
        createdAt: getTodayDateKey(),
      };
      setState((prev) => ({
        ...prev,
        habits: [...prev.habits, newHabit],
      }));
    },
    []
  );

  const updateHabit = useCallback(
    (
      habitId: string,
      updates: {
        name: string;
        cue: string;
        category?: string;
        targetDaysPerWeek: number;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        habits: prev.habits.map((habit) =>
          habit.id === habitId
            ? {
                ...habit,
                name: updates.name.trim(),
                cue: updates.cue.trim() || 'Daily routine',
                category: updates.category?.trim() || habit.category || 'Wellness',
                targetDaysPerWeek: updates.targetDaysPerWeek,
              }
            : habit
        ),
      }));
    },
    []
  );

  const toggleHabitDate = useCallback((habitId: string, dateKey: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const exists = habit.completedDates.includes(dateKey);
        return {
          ...habit,
          completedDates: exists
            ? habit.completedDates.filter((d) => d !== dateKey)
            : [...habit.completedDates, dateKey],
        };
      }),
    }));
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  }, []);

  const addEvent = useCallback(
    (input: {
      title: string;
      date: string;
      startTime: string;
      endTime?: string;
      location: string;
      category: string;
      notes?: string;
    }) => {
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: input.title.trim(),
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime?.trim() || undefined,
        location: input.location.trim() || 'Personal',
        category: input.category.trim() || 'Schedule',
        notes: input.notes?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        events: [...prev.events, newEvent],
      }));
    },
    []
  );

  const updateEvent = useCallback(
    (
      eventId: string,
      updates: {
        title: string;
        date: string;
        startTime: string;
        endTime?: string;
        location: string;
        category: string;
        notes?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        events: prev.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                title: updates.title.trim(),
                date: updates.date,
                startTime: updates.startTime,
                endTime: updates.endTime?.trim() || undefined,
                location: updates.location.trim() || 'Personal',
                category: updates.category.trim() || 'Schedule',
                notes: updates.notes?.trim() || undefined,
              }
            : event
        ),
      }));
    },
    []
  );

  const deleteEvent = useCallback((eventId: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  }, []);

  const addJournalEntry = useCallback(
    (input: {
      date: string;
      title: string;
      mood: JournalMood;
      gratitude: string[];
      body: string;
      tags: string[];
    }): string => {
      const nowIso = new Date().toISOString();
      const id = `journal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newEntry: JournalEntry = {
        id,
        date: input.date || getTodayDateKey(),
        title: input.title.trim(),
        mood: input.mood,
        gratitude: input.gratitude.map((g) => g.trim()).filter(Boolean),
        body: input.body.trim(),
        tags: input.tags.map((t) => t.trim()).filter(Boolean),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setState((prev) => ({
        ...prev,
        journalEntries: [newEntry, ...prev.journalEntries],
      }));
      return id;
    },
    []
  );

  const updateJournalEntry = useCallback(
    (
      entryId: string,
      updates: {
        date: string;
        title: string;
        mood: JournalMood;
        gratitude: string[];
        body: string;
        tags: string[];
      }
    ) => {
      const nowIso = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        journalEntries: prev.journalEntries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                date: updates.date || entry.date,
                title: updates.title.trim(),
                mood: updates.mood,
                gratitude: updates.gratitude.map((g) => g.trim()).filter(Boolean),
                body: updates.body.trim(),
                tags: updates.tags.map((t) => t.trim()).filter(Boolean),
                updatedAt: nowIso,
              }
            : entry
        ),
      }));
    },
    []
  );

  const deleteJournalEntry = useCallback((entryId: string) => {
    setState((prev) => ({
      ...prev,
      journalEntries: prev.journalEntries.filter((entry) => entry.id !== entryId),
    }));
  }, []);

  const addTransaction = useCallback(
    (input: {
      type: TransactionType;
      title: string;
      amount: number;
      category: string;
      date: string;
      notes?: string;
    }) => {
      const newTx: FinanceTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: input.type,
        title: input.title.trim(),
        amount: Math.max(0, Number(input.amount) || 0),
        category: input.category.trim() || 'Other',
        date: input.date || getTodayDateKey(),
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
      }));
    },
    []
  );

  const updateTransaction = useCallback(
    (
      transactionId: string,
      updates: {
        type: TransactionType;
        title: string;
        amount: number;
        category: string;
        date: string;
        notes?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === transactionId
            ? {
                ...tx,
                type: updates.type,
                title: updates.title.trim(),
                amount: Math.max(0, Number(updates.amount) || 0),
                category: updates.category.trim() || 'Other',
                date: updates.date || tx.date,
                notes: updates.notes?.trim() || undefined,
              }
            : tx
        ),
      }));
    },
    []
  );

  const deleteTransaction = useCallback((transactionId: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== transactionId),
    }));
  }, []);

  const addSavingsGoal = useCallback(
    (input: {
      name: string;
      category: string;
      currentAmount: number;
      targetAmount: number;
      targetDate?: string;
    }) => {
      const newGoal: SavingsGoal = {
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        category: input.category.trim() || 'Savings',
        currentAmount: Math.max(0, Number(input.currentAmount) || 0),
        targetAmount: Math.max(1, Number(input.targetAmount) || 1),
        targetDate: input.targetDate?.trim() || undefined,
        createdAt: getTodayDateKey(),
      };
      setState((prev) => ({
        ...prev,
        savingsGoals: [...prev.savingsGoals, newGoal],
      }));
    },
    []
  );

  const updateSavingsGoal = useCallback(
    (
      goalId: string,
      updates: {
        name: string;
        category: string;
        currentAmount: number;
        targetAmount: number;
        targetDate?: string;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                name: updates.name.trim(),
                category: updates.category.trim() || 'Savings',
                currentAmount: Math.max(0, Number(updates.currentAmount) || 0),
                targetAmount: Math.max(1, Number(updates.targetAmount) || 1),
                targetDate: updates.targetDate?.trim() || undefined,
              }
            : goal
        ),
      }));
    },
    []
  );

  const contributeToSavingsGoal = useCallback((goalId: string, deltaAmount: number) => {
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              currentAmount: Math.max(0, goal.currentAmount + deltaAmount),
            }
          : goal
      ),
    }));
  }, []);

  const deleteSavingsGoal = useCallback((goalId: string) => {
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter((g) => g.id !== goalId),
    }));
  }, []);

  const updatePomodoroSettings = useCallback(
    (updates: Partial<PomodoroSettings>) => {
      setState((prev) => {
        const merged: PomodoroSettings = {
          ...prev.pomodoroSettings,
          ...updates,
        };
        return {
          ...prev,
          pomodoroSettings: {
            ...merged,
            focusMinutes: clampDurationMinutes(merged.focusMinutes, 1, 180),
            shortBreakMinutes: clampDurationMinutes(
              merged.shortBreakMinutes,
              1,
              60
            ),
            longBreakMinutes: clampDurationMinutes(
              merged.longBreakMinutes,
              1,
              90
            ),
            longBreakInterval: clampDurationMinutes(
              merged.longBreakInterval,
              2,
              12
            ),
            ambientVolume: Math.min(
              1,
              Math.max(0, Number(merged.ambientVolume) || 0)
            ),
          },
        };
      });
    },
    []
  );

  const recordPomodoroSession = useCallback(
    (input: {
      mode: PomodoroMode;
      durationMinutes: number;
      taskTitle?: string;
    }) => {
      const now = new Date();
      const newSession: PomodoroSessionRecord = {
        id: `pomo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: input.mode,
        durationMinutes: Math.max(1, Math.round(input.durationMinutes)),
        completedAt: now.toISOString(),
        dateKey: getTodayDateKey(now),
        taskTitle: input.taskTitle?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        pomodoroSessions: [newSession, ...prev.pomodoroSessions],
      }));
    },
    []
  );

  const clearPomodoroSessions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pomodoroSessions: [],
    }));
  }, []);

  const updateProfile = useCallback((profile: UserProfile) => {
    setState((prev) => ({
      ...prev,
      profile: {
        name: profile.name.trim(),
        dailyFocusNote: profile.dailyFocusNote.trim(),
      },
    }));
  }, []);

  const cycleQuote = useCallback(() => {
    setState((prev) => ({
      ...prev,
      quoteOffset: prev.quoteOffset + 1,
    }));
  }, []);

  const setCalendarMode = useCallback((mode: CalendarDisplayMode) => {
    setState((prev) => ({
      ...prev,
      calendarMode: mode,
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDayspaceState();
    setState(fresh);
  }, []);

  const importWorkspaceState = useCallback((nextState: DayspaceState) => {
    setState(nextState);
  }, []);

  const clearAllData = useCallback(() => {
    setState((prev) => createEmptyDayspaceState(prev.profile.name));
  }, []);

  return {
    state,
    storageError,
    cloudSyncStatus,
    cloudSyncError,
    lastSyncedAt,
    syncNow,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addHabit,
    updateHabit,
    toggleHabitDate,
    deleteHabit,
    addEvent,
    updateEvent,
    deleteEvent,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    deleteSavingsGoal,
    updatePomodoroSettings,
    recordPomodoroSession,
    clearPomodoroSessions,
    updateProfile,
    cycleQuote,
    setCalendarMode,
    resetDemoData,
    importWorkspaceState,
    clearAllData,
  };
}
