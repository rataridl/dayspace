import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDayspaceState } from '../data/seed';
import {
  JournalMood,
  PomodoroMode,
  TaskCategory,
  TaskPriority,
  TransactionType,
} from '../types/dayspace';
import {
  clearDayspaceStorage,
  createEmptyDayspaceState,
  DAYSPACE_STORAGE_KEY,
  exportDayspaceBackup,
  loadDayspaceState,
  parseDayspaceBackup,
  saveDayspaceState,
} from './storage';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

test('loadDayspaceState handles missing and corrupted LocalStorage gracefully', () => {
  const emptyStorage = createMemoryStorage();
  const initial = loadDayspaceState(emptyStorage);
  assert.ok(initial.tasks.length > 0);
  assert.equal(initial.profile.name, 'Clara');

  const corruptedStorage = createMemoryStorage({
    [DAYSPACE_STORAGE_KEY]: '{not valid json!!!',
  });
  const recovered = loadDayspaceState(corruptedStorage);
  assert.equal(recovered.profile.name, 'Clara');
  assert.ok(recovered.habits.length > 0);

  const arrayStorage = createMemoryStorage({
    [DAYSPACE_STORAGE_KEY]: '["unexpected", "array"]',
  });
  const recoveredFromArray = loadDayspaceState(arrayStorage);
  assert.equal(recoveredFromArray.profile.name, 'Clara');
});

test('saveDayspaceState and loadDayspaceState round-trip all workspace domains and preserve empty arrays', () => {
  const storage = createMemoryStorage();
  const state = createInitialDayspaceState();

  state.profile = { name: 'Maya', dailyFocusNote: 'Stay calm and steady' };
  state.tasks = [
    {
      id: 't-custom',
      title: 'Verify storage backup',
      category: TaskCategory.Work,
      priority: TaskPriority.High,
      dueDate: '2026-11-25',
      completed: false,
      createdAt: '2026-11-25T08:00:00Z',
    },
  ];
  state.habits = []; // Intentional empty list must NOT revert to seed habits
  state.journalEntries = [
    {
      id: 'j-custom',
      date: '2026-11-25',
      title: 'Evening gratitude',
      mood: JournalMood.Grateful,
      gratitude: ['Warm tea'],
      body: 'Quiet productive afternoon.',
      tags: ['Calm'],
      createdAt: '2026-11-25T18:00:00Z',
      updatedAt: '2026-11-25T18:00:00Z',
    },
  ];
  state.transactions = [
    {
      id: 'tx-custom',
      type: TransactionType.Income,
      title: 'Design sprint',
      amount: 1200,
      category: 'Freelance',
      date: '2026-11-25',
      createdAt: '2026-11-25T12:00:00Z',
    },
  ];
  state.pomodoroSettings = {
    ...state.pomodoroSettings,
    focusMinutes: 45,
    ambientSound: 'rain',
    ambientVolume: 0.6,
  };
  state.pomodoroSessions = [
    {
      id: 'p-custom',
      mode: PomodoroMode.Focus,
      durationMinutes: 45,
      completedAt: '2026-11-25T10:45:00Z',
      dateKey: '2026-11-25',
      taskTitle: 'Verify storage backup',
    },
  ];

  const saveResult = saveDayspaceState(state, storage);
  assert.equal(saveResult.ok, true);

  const loaded = loadDayspaceState(storage);
  assert.equal(loaded.profile.name, 'Maya');
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].id, 't-custom');
  assert.equal(loaded.habits.length, 0);
  assert.equal(loaded.journalEntries[0].mood, JournalMood.Grateful);
  assert.equal(loaded.transactions[0].amount, 1200);
  assert.equal(loaded.pomodoroSettings.focusMinutes, 45);
  assert.equal(loaded.pomodoroSettings.ambientSound, 'rain');
  assert.equal(loaded.pomodoroSessions[0].durationMinutes, 45);
});

test('exportDayspaceBackup and parseDayspaceBackup validate, sanitize, and reject invalid files', () => {
  const original = createInitialDayspaceState();
  original.profile.name = 'Elena';

  const json = exportDayspaceBackup(original);
  const parsed = parseDayspaceBackup(json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.state.profile.name, 'Elena');
    assert.equal(parsed.state.tasks.length, original.tasks.length);
  }

  // Raw partial state without envelope should still import safely
  const partialResult = parseDayspaceBackup(
    JSON.stringify({
      tasks: [
        {
          id: 'imp-1',
          title: 'Imported task',
          category: 'Work',
          priority: 'high',
          dueDate: '2026-11-25',
          completed: true,
        },
      ],
    })
  );
  assert.equal(partialResult.ok, true);
  if (partialResult.ok) {
    assert.equal(partialResult.state.tasks.length, 1);
    assert.equal(partialResult.state.tasks[0].completed, true);
    assert.equal(partialResult.state.habits.length, 0);
  }

  // Reject malformed / unrelated JSON
  assert.equal(parseDayspaceBackup('').ok, false);
  assert.equal(parseDayspaceBackup('{bad json').ok, false);
  assert.equal(parseDayspaceBackup('{"foo": "bar"}').ok, false);
  assert.equal(
    parseDayspaceBackup('{"schema": "dayspace-backup", "data": "invalid"}').ok,
    false
  );
});

test('createEmptyDayspaceState, clearDayspaceStorage, and failing storage handle errors cleanly', () => {
  const emptyState = createEmptyDayspaceState('Clara');
  assert.equal(emptyState.tasks.length, 0);
  assert.equal(emptyState.habits.length, 0);
  assert.equal(emptyState.events.length, 0);
  assert.equal(emptyState.journalEntries.length, 0);
  assert.equal(emptyState.transactions.length, 0);
  assert.equal(emptyState.savingsGoals.length, 0);
  assert.equal(emptyState.pomodoroSessions.length, 0);

  const storage = createMemoryStorage({ [DAYSPACE_STORAGE_KEY]: '{}' });
  assert.equal(clearDayspaceStorage(storage).ok, true);
  assert.equal(storage.getItem(DAYSPACE_STORAGE_KEY), null);

  const failingStorage = {
    ...createMemoryStorage(),
    setItem() {
      throw new Error('QuotaExceededError');
    },
  } as Storage;
  const result = saveDayspaceState(emptyState, failingStorage);
  assert.equal(result.ok, false);
  assert.match(result.error || '', /QuotaExceededError/);
});
