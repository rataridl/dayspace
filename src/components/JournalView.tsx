import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CloudMoon,
  CloudRain,
  Flame,
  Heart,
  Leaf,
  Moon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { JournalEntry, JournalMood } from '../types/dayspace';
import {
  computeJournalMetrics,
  filterJournalEntries,
  formatLongDateFromKey,
  formatShortDateLabel,
  getRecentGratitudes,
  getTodayDateKey,
  JOURNAL_MOOD_LABELS,
  JOURNAL_MOOD_ORDER,
} from '../utils/productivity';

export interface JournalFormPayload {
  date: string;
  title: string;
  mood: JournalMood;
  gratitude: string[];
  body: string;
  tags: string[];
}

interface JournalViewProps {
  entries: JournalEntry[];
  onAddEntry: (input: JournalFormPayload) => string;
  onUpdateEntry: (entryId: string, updates: JournalFormPayload) => void;
  onDeleteEntry: (entryId: string) => void;
}

const MOOD_VISUALS: Record<
  JournalMood,
  {
    icon: typeof Leaf;
    accentText: string;
    barColor: string;
    activeButton: string;
  }
> = {
  [JournalMood.Calm]: {
    icon: Leaf,
    accentText: 'text-[#2D5A43]',
    barColor: 'bg-[#5C7C66]',
    activeButton: 'bg-[#E8EFE9] border-[#5C7C66] text-[#1E3F31]',
  },
  [JournalMood.Grateful]: {
    icon: Heart,
    accentText: 'text-[#1E3F31]',
    barColor: 'bg-[#1E3F31]',
    activeButton: 'bg-[#E4EDE6] border-[#1E3F31] text-[#1E3F31]',
  },
  [JournalMood.Energized]: {
    icon: Sun,
    accentText: 'text-[#8A5A19]',
    barColor: 'bg-[#B9853B]',
    activeButton: 'bg-[#F8F1E3] border-[#B9853B] text-[#6B4310]',
  },
  [JournalMood.Reflective]: {
    icon: CloudMoon,
    accentText: 'text-[#4A5E56]',
    barColor: 'bg-[#7A9A83]',
    activeButton: 'bg-[#EDF2EE] border-[#7A9A83] text-[#2F453B]',
  },
  [JournalMood.Tired]: {
    icon: Moon,
    accentText: 'text-[#5A5F69]',
    barColor: 'bg-[#8D939E]',
    activeButton: 'bg-[#EFF1F4] border-[#8D939E] text-[#3B4049]',
  },
  [JournalMood.Stressed]: {
    icon: CloudRain,
    accentText: 'text-[#9A3B30]',
    barColor: 'bg-[#C26D62]',
    activeButton: 'bg-[#FBF0EE] border-[#C26D62] text-[#7F2E24]',
  },
};

type ComposerMode = 'read' | 'create' | 'edit';

export function JournalView({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: JournalViewProps) {
  const todayKey = getTodayDateKey();

  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<JournalMood | 'all'>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<ComposerMode>('read');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Composer form fields
  const [formDate, setFormDate] = useState(todayKey);
  const [formTitle, setFormTitle] = useState('');
  const [formMood, setFormMood] = useState<JournalMood>(JournalMood.Calm);
  const [formGratitude, setFormGratitude] = useState<string[]>(['', '', '']);
  const [formBody, setFormBody] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formError, setFormError] = useState('');

  const metrics = useMemo(
    () => computeJournalMetrics(entries, todayKey),
    [entries, todayKey]
  );

  const recentGratitudes = useMemo(
    () => getRecentGratitudes(entries, 5),
    [entries]
  );

  const filteredEntries = useMemo(
    () => filterJournalEntries(entries, searchQuery, moodFilter),
    [entries, searchQuery, moodFilter]
  );

  // Ensure a valid entry is selected whenever filtered entries change in read mode
  useEffect(() => {
    if (composerMode !== 'read') return;
    if (filteredEntries.length === 0) {
      setSelectedEntryId(null);
      return;
    }
    const stillVisible = filteredEntries.some((e) => e.id === selectedEntryId);
    if (!stillVisible) {
      setSelectedEntryId(filteredEntries[0].id);
    }
  }, [filteredEntries, selectedEntryId, composerMode]);

  const activeEntry = useMemo(
    () =>
      filteredEntries.find((e) => e.id === selectedEntryId) ||
      entries.find((e) => e.id === selectedEntryId) ||
      null,
    [filteredEntries, entries, selectedEntryId]
  );

  const openCreateComposer = () => {
    setFormDate(todayKey);
    setFormTitle('');
    setFormMood(JournalMood.Calm);
    setFormGratitude(['', '', '']);
    setFormBody('');
    setFormTags('');
    setFormError('');
    setComposerMode('create');
    setMobileDetailOpen(true);
  };

  const openEditComposer = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setFormDate(entry.date);
    setFormTitle(entry.title);
    setFormMood(entry.mood);
    setFormGratitude(
      entry.gratitude.length >= 3
        ? [...entry.gratitude]
        : [
            ...entry.gratitude,
            ...Array.from({ length: 3 - entry.gratitude.length }, () => ''),
          ]
    );
    setFormBody(entry.body);
    setFormTags(entry.tags.join(', '));
    setFormError('');
    setComposerMode('edit');
    setMobileDetailOpen(true);
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    setComposerMode('read');
    setMobileDetailOpen(true);
  };

  const handleCancelComposer = () => {
    setFormError('');
    setComposerMode('read');
    if (filteredEntries.length === 0) {
      setMobileDetailOpen(false);
    }
  };

  const handleSubmitEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please add a title for your journal entry.');
      return;
    }
    if (!formBody.trim()) {
      setFormError('Please write a short reflection in your diary entry.');
      return;
    }

    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: JournalFormPayload = {
      date: formDate || todayKey,
      title: formTitle.trim(),
      mood: formMood,
      gratitude: formGratitude.map((g) => g.trim()).filter(Boolean),
      body: formBody.trim(),
      tags: parsedTags,
    };

    if (composerMode === 'edit' && selectedEntryId) {
      onUpdateEntry(selectedEntryId, payload);
      setComposerMode('read');
    } else {
      const createdId = onAddEntry(payload);
      setSelectedEntryId(createdId);
      setSearchQuery('');
      setMoodFilter('all');
      setComposerMode('read');
    }
    setFormError('');
    setMobileDetailOpen(true);
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    onDeleteEntry(entry.id);
    if (selectedEntryId === entry.id) {
      setSelectedEntryId(null);
      setComposerMode('read');
      setMobileDetailOpen(false);
    }
  };

  const handleGratitudeChange = (index: number, value: string) => {
    setFormGratitude((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleAddGratitudeLine = () => {
    setFormGratitude((prev) => [...prev, '']);
  };

  const handleRemoveGratitudeLine = (index: number) => {
    setFormGratitude((prev) => prev.filter((_, i) => i !== index));
  };

  const maxMoodCount = Math.max(
    1,
    ...JOURNAL_MOOD_ORDER.map((m) => metrics.moodCounts[m] || 0)
  );

  const hasActiveFilters = searchQuery.trim().length > 0 || moodFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
            Personal Journal
          </h1>
          <p className="mt-1 text-sm text-[#58645B] tabular-nums">
            {metrics.totalEntries}{' '}
            {metrics.totalEntries === 1 ? 'entry' : 'entries'} ·{' '}
            {metrics.currentStreak}d writing streak · {metrics.totalGratitudes}{' '}
            gratitude notes
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateComposer}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New entry</span>
        </button>
      </header>

      {/* Summary Metrics Strip */}
      <section aria-label="Journal summary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <span className="text-sm font-medium text-[#58645B]">
              Entries written
            </span>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {metrics.totalEntries}
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {metrics.entriesThisWeek} written in the last 7 days
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">
                Writing streak
              </span>
              <Flame className="w-4 h-4 text-[#5C7C66]" aria-hidden="true" />
            </div>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1E3F31] tabular-nums">
              {metrics.currentStreak}d
            </p>
            <p className="mt-1 text-xs text-[#58645B]">
              {metrics.currentStreak > 0
                ? 'Consecutive days with a reflection'
                : 'Write an entry today to begin'}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">
                Prevailing mood
              </span>
              <Sparkles className="w-4 h-4 text-[#5C7C66]" aria-hidden="true" />
            </div>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1C241E]">
              {metrics.topMood ? JOURNAL_MOOD_LABELS[metrics.topMood] : 'None yet'}
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {metrics.totalGratitudes} gratitude moments recorded
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section
        aria-label="Search and filter journal entries"
        className="rounded-2xl bg-white border border-[#E5E1D8] p-4 shadow-[0_2px_12px_rgba(28,36,30,0.03)] space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="journal-search" className="sr-only">
              Search journal entries
            </label>
            <Search
              className="w-4 h-4 text-[#6A786D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="journal-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, diary notes, gratitude, moods, or tags..."
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-10 pr-9 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear journal search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#EFECE4] hover:text-[#1C241E]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-[#58645B] tabular-nums whitespace-nowrap shrink-0 px-1">
            Showing {filteredEntries.length} of {entries.length}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EFECE4]"
          role="tablist"
          aria-label="Filter journal entries by mood"
        >
          <button
            type="button"
            role="tab"
            aria-selected={moodFilter === 'all'}
            onClick={() => setMoodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              moodFilter === 'all'
                ? 'bg-white text-[#1C241E] shadow-xs'
                : 'text-[#58645B] hover:text-[#1C241E]'
            }`}
          >
            All moods
          </button>
          {JOURNAL_MOOD_ORDER.map((mood) => {
            const active = moodFilter === mood;
            return (
              <button
                key={mood}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMoodFilter(mood)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#1C241E] shadow-xs'
                    : 'text-[#58645B] hover:text-[#1C241E]'
                }`}
              >
                {JOURNAL_MOOD_LABELS[mood]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split Workspace: Entry List + Reader / Editor */}
      <section
        aria-label="Diary entries workspace"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Left: Entry List */}
        <div
          className={`lg:col-span-5 rounded-2xl bg-white border border-[#E5E1D8] overflow-hidden shadow-[0_2px_14px_rgba(28,36,30,0.03)] ${
            mobileDetailOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="px-5 py-3.5 border-b border-[#EFECE4] bg-[#FAF8F3] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1C241E]">
              Diary entries
            </h2>
            <span className="text-xs text-[#58645B] tabular-nums">
              {filteredEntries.length}{' '}
              {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-base font-medium text-[#1C241E]">
                {entries.length === 0
                  ? 'Your journal is ready'
                  : 'No matching entries found'}
              </p>
              <p className="mt-1 text-sm text-[#58645B]">
                {entries.length === 0
                  ? 'Capture your mood, gratitude notes, and daily reflections.'
                  : 'Try another search phrase or clear your mood filter.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setMoodFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl border border-[#DDD8CD] bg-white text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={openCreateComposer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write entry</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#F2EFE8]">
              {filteredEntries.map((entry) => {
                const isSelected =
                  composerMode === 'read' && activeEntry?.id === entry.id;
                const visual = MOOD_VISUALS[entry.mood];
                const MoodIcon = visual.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectEntry(entry.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      isSelected
                        ? 'bg-[#EEF4EF]'
                        : 'bg-white hover:bg-[#FCFBF8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-[#58645B]">
                      <span className="inline-flex items-center gap-1.5">
                        <MoodIcon
                          className={`w-3.5 h-3.5 ${visual.accentText}`}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-[#1C241E]">
                          {JOURNAL_MOOD_LABELS[entry.mood]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatShortDateLabel(entry.date, todayKey)}</span>
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-[#6A786D]">
                        {entry.gratitude.length} gratitude
                      </span>
                    </div>

                    <p
                      className={`mt-1.5 text-sm font-semibold leading-snug ${
                        isSelected ? 'text-[#1E3F31]' : 'text-[#1C241E]'
                      }`}
                    >
                      {entry.title}
                    </p>
                    <p className="mt-1 text-xs text-[#4B574E] line-clamp-2 leading-relaxed">
                      {entry.body}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Entry Reader or Composer */}
        <div
          className={`lg:col-span-7 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] ${
            mobileDetailOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {composerMode !== 'read' ? (
            <form onSubmit={handleSubmitEntry} className="space-y-5">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCancelComposer();
                      setMobileDetailOpen(false);
                    }}
                    className="lg:hidden inline-flex items-center gap-1.5 text-xs font-medium text-[#58645B] hover:text-[#1C241E] mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All entries</span>
                  </button>
                  <h2 className="font-serif text-2xl font-medium text-[#1C241E]">
                    {composerMode === 'edit'
                      ? 'Edit journal entry'
                      : 'Write a new entry'}
                  </h2>
                  <p className="text-xs text-[#58645B] mt-0.5">
                    Record how you feel, what you appreciate, and thoughts from your day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelComposer}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#58645B] hover:bg-[#F3EFE6] whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FEF3F2] border border-[#FECDCA] px-3.5 py-2.5 text-xs font-medium text-[#B42318]"
                >
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="journal-entry-title"
                    className="block text-sm font-medium text-[#1C241E] mb-1.5"
                  >
                    Entry title
                  </label>
                  <input
                    id="journal-entry-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="e.g. Quiet morning tea and studio reset"
                    autoFocus
                    className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="journal-entry-date"
                    className="block text-sm font-medium text-[#1C241E] mb-1.5"
                  >
                    Date
                  </label>
                  <input
                    id="journal-entry-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Mood Picker */}
              <div>
                <span className="block text-sm font-medium text-[#1C241E] mb-2">
                  How are you feeling?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {JOURNAL_MOOD_ORDER.map((mood) => {
                    const visual = MOOD_VISUALS[mood];
                    const MoodIcon = visual.icon;
                    const selected = formMood === mood;
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setFormMood(mood)}
                        aria-pressed={selected}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap ${
                          selected
                            ? visual.activeButton
                            : 'bg-[#FBF9F4] border-[#DDD8CD] text-[#4B574E] hover:border-[#B6C7B9]'
                        }`}
                      >
                        <MoodIcon
                          className={`w-4 h-4 shrink-0 ${visual.accentText}`}
                          aria-hidden="true"
                        />
                        <span>{JOURNAL_MOOD_LABELS[mood]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gratitude Inputs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#1C241E]">
                    Gratitude notes
                  </span>
                  <button
                    type="button"
                    onClick={handleAddGratitudeLine}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3F31] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add gratitude line</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {formGratitude.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <label
                        htmlFor={`journal-gratitude-${index}`}
                        className="sr-only"
                      >
                        Gratitude item {index + 1}
                      </label>
                      <input
                        id={`journal-gratitude-${index}`}
                        type="text"
                        value={line}
                        onChange={(e) =>
                          handleGratitudeChange(index, e.target.value)
                        }
                        placeholder={
                          index === 0
                            ? '1. Something that brought ease or warmth...'
                            : index === 1
                            ? '2. Someone or something you appreciate...'
                            : `${index + 1}. A quiet win or moment to remember...`
                        }
                        className="flex-1 min-w-0 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                      />
                      {formGratitude.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGratitudeLine(index)}
                          aria-label={`Remove gratitude line ${index + 1}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Diary Reflection Body */}
              <div>
                <label
                  htmlFor="journal-entry-body"
                  className="block text-sm font-medium text-[#1C241E] mb-1.5"
                >
                  Diary reflection
                </label>
                <textarea
                  id="journal-entry-body"
                  rows={6}
                  value={formBody}
                  onChange={(e) => {
                    setFormBody(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Write freely about your day, thoughts, lessons, or intentions..."
                  className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-3 text-sm leading-relaxed text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="journal-entry-tags"
                  className="block text-sm font-medium text-[#1C241E] mb-1.5"
                >
                  Themes or tags (comma-separated, optional)
                </label>
                <input
                  id="journal-entry-tags"
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. Morning pages, Studio, Rest"
                  className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#EFECE4]">
                <button
                  type="button"
                  onClick={handleCancelComposer}
                  className="px-4 py-2 text-sm font-medium text-[#58645B] rounded-xl hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
                >
                  {composerMode === 'edit' ? 'Update entry' : 'Save entry'}
                </button>
              </div>
            </form>
          ) : activeEntry ? (
            <article className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#EFECE4]">
                <div className="space-y-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="lg:hidden inline-flex items-center gap-1.5 text-xs font-medium text-[#58645B] hover:text-[#1C241E] mb-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All entries</span>
                  </button>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#58645B]">
                    <span className="font-medium text-[#5C7C66]">
                      {formatLongDateFromKey(activeEntry.date)}
                    </span>
                    <span aria-hidden="true">·</span>
                    {(() => {
                      const visual = MOOD_VISUALS[activeEntry.mood];
                      const MoodIcon = visual.icon;
                      return (
                        <span className="inline-flex items-center gap-1 font-medium text-[#1C241E]">
                          <MoodIcon
                            className={`w-3.5 h-3.5 ${visual.accentText}`}
                            aria-hidden="true"
                          />
                          <span>Mood: {JOURNAL_MOOD_LABELS[activeEntry.mood]}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <h2 className="font-serif text-2xl font-medium text-[#1C241E] leading-snug">
                    {activeEntry.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditComposer(activeEntry)}
                    aria-label={`Edit entry "${activeEntry.title}"`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-xs font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#5C7C66]" />
                    <span>Edit entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(activeEntry)}
                    aria-label={`Delete entry "${activeEntry.title}"`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#DDD8CD] bg-white text-[#6A786D] hover:bg-[#FEF3F2] hover:border-[#FECDCA] hover:text-[#B42318] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Gratitude List */}
              {activeEntry.gratitude.length > 0 && (
                <div className="rounded-xl bg-[#F4F8F4] border border-[#DCE5DC] p-4">
                  <h3 className="text-xs font-semibold tracking-wide text-[#2D5A43] mb-2.5">
                    Grateful for
                  </h3>
                  <ul className="space-y-1.5">
                    {activeEntry.gratitude.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-[#1C241E]"
                      >
                        <Heart
                          className="w-3.5 h-3.5 text-[#5C7C66] mt-1 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Diary Narrative */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-[#58645B]">
                  Reflection
                </h3>
                <p className="text-[15px] leading-relaxed text-[#263029] whitespace-pre-line">
                  {activeEntry.body}
                </p>
              </div>

              {/* Quiet Unboxed Tags & Date Footer */}
              <div className="pt-4 border-t border-[#EFECE4] flex flex-wrap items-center justify-between gap-2 text-xs text-[#58645B]">
                <span>
                  {activeEntry.tags.length > 0
                    ? `Themes: ${activeEntry.tags.join(' · ')}`
                    : 'Personal reflection'}
                </span>
                <span className="font-mono tabular-nums text-[#7D8880]">
                  {activeEntry.date}
                </span>
              </div>
            </article>
          ) : (
            <div className="py-16 text-center">
              <BookOpen
                className="w-8 h-8 text-[#7A9A83] mx-auto mb-3"
                aria-hidden="true"
              />
              <p className="text-base font-medium text-[#1C241E]">
                Select an entry or start writing
              </p>
              <p className="mt-1 text-sm text-[#58645B]">
                Choose a reflection from the list or log how today feels.
              </p>
              <button
                type="button"
                onClick={openCreateComposer}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New entry</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Mood Tracking & Recent Gratitude Row */}
      <section
        aria-label="Mood tracking and gratitude moments"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        {/* Mood Distribution */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                Mood tracking
              </h2>
              <p className="text-xs text-[#58645B] mt-0.5">
                Click any mood to filter your diary entries
              </p>
            </div>
            {moodFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setMoodFilter('all')}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap shrink-0"
              >
                Show all moods
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 flex-1 content-start">
            {JOURNAL_MOOD_ORDER.map((mood) => {
              const count = metrics.moodCounts[mood] || 0;
              const visual = MOOD_VISUALS[mood];
              const Icon = visual.icon;
              const isActive = moodFilter === mood;
              const barPct =
                metrics.totalEntries === 0
                  ? 0
                  : Math.round((count / maxMoodCount) * 100);

              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() =>
                    setMoodFilter((prev) => (prev === mood ? 'all' : mood))
                  }
                  aria-pressed={isActive}
                  className={`text-left rounded-xl px-3 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-[#EEF4EF] ring-1 ring-[#7A9A83]'
                      : 'bg-[#FAF8F3] hover:bg-[#F2EFE8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 font-medium text-[#1C241E]">
                      <Icon className={`w-3.5 h-3.5 ${visual.accentText}`} />
                      <span>{JOURNAL_MOOD_LABELS[mood]}</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#58645B]">
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#E5E1D8] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${visual.barColor}`}
                      style={{ width: `${count > 0 ? Math.max(12, barPct) : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gratitude Highlights */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col">
          <div className="pb-4 border-b border-[#EFECE4]">
            <h2 className="font-serif text-xl font-medium text-[#1C241E]">
              Recent gratitude
            </h2>
            <p className="text-xs text-[#58645B] mt-0.5">
              Appreciations captured across your entries
            </p>
          </div>

          {recentGratitudes.length === 0 ? (
            <div className="py-8 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-sm text-[#58645B]">
                No gratitude notes recorded yet.
              </p>
              <button
                type="button"
                onClick={openCreateComposer}
                className="mt-2 text-xs font-medium text-[#1E3F31] hover:underline"
              >
                Add your first reflection
              </button>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[#F2EFE8]">
              {recentGratitudes.map((item, idx) => (
                <li key={`${item.entryId}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectEntry(item.entryId)}
                    className="w-full py-2.5 text-left group flex items-start gap-2.5 hover:bg-[#FAF8F3] rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <Heart
                      className="w-3.5 h-3.5 text-[#5C7C66] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-[#1C241E] group-hover:text-[#1E3F31] leading-snug">
                        {item.text}
                      </span>
                      <span className="block text-xs text-[#58645B] mt-0.5">
                        {formatShortDateLabel(item.date, todayKey)} ·{' '}
                        {item.entryTitle}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
