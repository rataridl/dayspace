import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  CloudMoon,
  CloudRain,
  Flame,
  Heart,
  Image as ImageIcon,
  Leaf,
  Loader2,
  Maximize2,
  Moon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { JournalEntry, JournalMood, JournalPhoto } from '../types/dayspace';
import {
  compressJournalImageFile,
  formatStorageQuotaMessage,
  isSupportedJournalImageFile,
  MAX_JOURNAL_PHOTOS,
} from '../utils/journalPhotos';
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
  photos?: JournalPhoto[];
}

export interface JournalSaveResult {
  ok: boolean;
  entryId?: string;
  error?: string;
}

interface JournalViewProps {
  entries: JournalEntry[];
  storageError?: string | null;
  onAddEntry: (input: JournalFormPayload) => JournalSaveResult;
  onUpdateEntry: (entryId: string, updates: JournalFormPayload) => JournalSaveResult;
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
  storageError,
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
  const [formPhotos, setFormPhotos] = useState<JournalPhoto[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [readerNoticeError, setReaderNoticeError] = useState('');
  const [formError, setFormError] = useState('');

  // Lightbox preview state
  const [lightboxState, setLightboxState] = useState<{
    photos: JournalPhoto[];
    index: number;
    title: string;
    date: string;
  } | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!lightboxState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxState(null);
      } else if (e.key === 'ArrowRight' && lightboxState.photos.length > 1) {
        setLightboxState((prev) =>
          prev
            ? { ...prev, index: (prev.index + 1) % prev.photos.length }
            : null
        );
      } else if (e.key === 'ArrowLeft' && lightboxState.photos.length > 1) {
        setLightboxState((prev) =>
          prev
            ? {
                ...prev,
                index:
                  (prev.index - 1 + prev.photos.length) % prev.photos.length,
              }
            : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState]);

  const openCreateComposer = () => {
    setFormDate(todayKey);
    setFormTitle('');
    setFormMood(JournalMood.Calm);
    setFormGratitude(['', '', '']);
    setFormBody('');
    setFormTags('');
    setFormPhotos([]);
    setPhotoUploading(false);
    setPhotoError('');
    setReaderNoticeError('');
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
    setFormPhotos(entry.photos ? [...entry.photos] : []);
    setPhotoUploading(false);
    setPhotoError('');
    setReaderNoticeError('');
    setFormError('');
    setComposerMode('edit');
    setMobileDetailOpen(true);
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    setReaderNoticeError('');
    setComposerMode('read');
    setMobileDetailOpen(true);
  };

  const handleCancelComposer = () => {
    setFormError('');
    setPhotoError('');
    setPhotoUploading(false);
    setComposerMode('read');
    if (filteredEntries.length === 0) {
      setMobileDetailOpen(false);
    }
  };

  const handlePhotoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (fileList.length === 0) return;

    const remainingSlots = MAX_JOURNAL_PHOTOS - formPhotos.length;
    if (remainingSlots <= 0) {
      setPhotoError(
        `Maximum ${MAX_JOURNAL_PHOTOS} photos per journal entry. Remove a photo before adding another.`
      );
      return;
    }

    const filesToProcess = fileList.slice(0, remainingSlots);
    const notices: string[] = [];
    if (fileList.length > remainingSlots) {
      notices.push(
        `Only ${remainingSlots} photo${remainingSlots === 1 ? '' : 's'} added (maximum ${MAX_JOURNAL_PHOTOS} per entry).`
      );
    }

    setPhotoUploading(true);
    setPhotoError('');
    const newlyAdded: JournalPhoto[] = [];

    for (const file of filesToProcess) {
      if (!isSupportedJournalImageFile(file)) {
        notices.push(
          `"${file.name}" skipped — supported formats are JPG, JPEG, PNG, and WEBP.`
        );
        continue;
      }
      try {
        const compressed = await compressJournalImageFile(file);
        newlyAdded.push(compressed);
      } catch (err) {
        notices.push(
          err instanceof Error
            ? err.message
            : `Could not attach "${file.name}".`
        );
      }
    }

    if (newlyAdded.length > 0) {
      setFormPhotos((prev) =>
        [...prev, ...newlyAdded].slice(0, MAX_JOURNAL_PHOTOS)
      );
    }
    if (notices.length > 0) {
      setPhotoError(notices.join(' '));
    }
    setPhotoUploading(false);
  };

  const handleRemoveComposerPhoto = (photoId: string) => {
    setFormPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setPhotoError('');
    if (formError) setFormError('');
  };

  const handleRemoveEntryPhoto = (entry: JournalEntry, photoId: string) => {
    const remainingPhotos = (entry.photos || []).filter((p) => p.id !== photoId);
    const res = onUpdateEntry(entry.id, {
      date: entry.date,
      title: entry.title,
      mood: entry.mood,
      gratitude: entry.gratitude,
      body: entry.body,
      tags: entry.tags,
      photos: remainingPhotos,
    });
    if (!res.ok) {
      setReaderNoticeError(formatStorageQuotaMessage(res.error));
    } else {
      setReaderNoticeError('');
    }
  };

  const handleSubmitEntry = (e: FormEvent) => {
    e.preventDefault();
    if (photoUploading) {
      setFormError('Please wait for your photos to finish processing.');
      return;
    }
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
      photos: formPhotos,
    };

    if (composerMode === 'edit' && selectedEntryId) {
      const saveRes = onUpdateEntry(selectedEntryId, payload);
      if (!saveRes.ok) {
        setFormError(formatStorageQuotaMessage(saveRes.error));
        return;
      }
      setComposerMode('read');
    } else {
      const saveRes = onAddEntry(payload);
      if (!saveRes.ok || !saveRes.entryId) {
        setFormError(formatStorageQuotaMessage(saveRes.error));
        return;
      }
      setSelectedEntryId(saveRes.entryId);
      setSearchQuery('');
      setMoodFilter('all');
      setComposerMode('read');
    }
    setFormError('');
    setPhotoError('');
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
                      <span className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums text-[#6A786D]">
                        {(entry.photos?.length || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[#2D5A43]">
                            <Camera className="w-3 h-3" aria-hidden="true" />
                            <span>{entry.photos!.length}</span>
                          </span>
                        )}
                        <span>{entry.gratitude.length} gratitude</span>
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

              {/* Photo Memories Upload & Previews */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="block text-sm font-medium text-[#1C241E]">
                      Photos &amp; memories
                    </span>
                    <span className="block text-xs text-[#58645B] tabular-nums">
                      JPG, JPEG, PNG, or WEBP · {formPhotos.length}/
                      {MAX_JOURNAL_PHOTOS} attached
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={
                      photoUploading || formPhotos.length >= MAX_JOURNAL_PHOTOS
                    }
                    aria-label="Add photo to journal entry"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-xs font-medium text-[#1E3F31] hover:bg-[#EEF4EF] hover:border-[#7A9A83] disabled:opacity-50 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
                  >
                    {photoUploading ? (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>Add Photo</span>
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple
                    aria-label="Upload photos for journal entry"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </div>

                {photoUploading && (
                  <div
                    role="status"
                    className="mb-3 flex items-center gap-2 rounded-xl border border-[#C6DEC9] bg-[#EDF3EE] px-3.5 py-2 text-xs font-medium text-[#1E3F31]"
                  >
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    <span>Optimizing and preparing your photo memories...</span>
                  </div>
                )}

                {photoError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-2 text-xs text-[#B42318]"
                  >
                    {photoError}
                  </p>
                )}

                {formPhotos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    aria-label="Choose photos to attach to this journal entry"
                    className="w-full rounded-2xl border border-dashed border-[#D5CFC2] bg-[#FCFBF8] px-4 py-6 text-center hover:border-[#7A9A83] hover:bg-[#F5F8F4] transition-colors"
                  >
                    <ImageIcon
                      className="w-6 h-6 text-[#7A9A83] mx-auto mb-2"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-medium text-[#1C241E]">
                      No photo attached yet
                    </p>
                    <p className="mt-1 text-[11px] text-[#58645B]">
                      Click Add Photo to attach up to {MAX_JOURNAL_PHOTOS} snapshots from your device.
                    </p>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="group relative rounded-2xl bg-[#FBF9F4] p-1.5 pb-2 border border-[#E5E1D8] shadow-[0_2px_10px_rgba(28,36,30,0.05)]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxState({
                              photos: formPhotos,
                              index: idx,
                              title: formTitle.trim() || 'Draft memory',
                              date: formDate || todayKey,
                            })
                          }
                          aria-label={`Preview photo ${idx + 1}${photo.name ? `: ${photo.name}` : ''}`}
                          className="block w-full aspect-[4/3] overflow-hidden rounded-xl bg-[#EFECE4] focus:outline-none focus:ring-2 focus:ring-[#1E3F31]"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.name || `Journal memory ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveComposerPhoto(photo.id)}
                          aria-label={`Remove photo ${idx + 1}${photo.name ? ` (${photo.name})` : ''}`}
                          className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1C241E]/75 text-white hover:bg-[#9A3B30] transition-colors shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <p className="mt-1.5 px-1 truncate text-[11px] font-medium text-[#58645B]">
                          {photo.name || `Memory ${idx + 1}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={photoUploading}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
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

              {(readerNoticeError || storageError) && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-2.5 text-xs text-[#B42318]"
                >
                  {readerNoticeError || storageError}
                </p>
              )}

              {/* Scrapbook Photo Gallery */}
              {activeEntry.photos && activeEntry.photos.length > 0 ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold tracking-wide text-[#58645B]">
                      Memories ({activeEntry.photos.length}/
                      {MAX_JOURNAL_PHOTOS})
                    </h3>
                    {activeEntry.photos.length < MAX_JOURNAL_PHOTOS && (
                      <button
                        type="button"
                        onClick={() => openEditComposer(activeEntry)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3F31] hover:underline"
                      >
                        <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Add photo</span>
                      </button>
                    )}
                  </div>

                  <div
                    className={
                      activeEntry.photos.length === 1
                        ? 'grid grid-cols-1 max-w-md gap-3'
                        : activeEntry.photos.length === 2
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                        : activeEntry.photos.length === 3
                        ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
                        : activeEntry.photos.length === 4
                        ? 'grid grid-cols-2 gap-3.5'
                        : 'grid grid-cols-2 sm:grid-cols-6 gap-3'
                    }
                  >
                    {activeEntry.photos.map((photo, idx) => {
                      const count = activeEntry.photos!.length;
                      const spanClass =
                        count === 3 && idx === 0
                          ? 'col-span-2 sm:col-span-1'
                          : count === 5 && idx < 2
                          ? 'sm:col-span-3'
                          : count === 5 && idx >= 2
                          ? idx === 4
                            ? 'col-span-2 sm:col-span-2'
                            : 'sm:col-span-2'
                          : '';

                      return (
                        <figure
                          key={photo.id}
                          className={`group relative rounded-2xl bg-[#FBF9F4] p-2 pb-2.5 border border-[#E5E1D8] shadow-[0_3px_12px_rgba(28,36,30,0.06)] ${spanClass}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxState({
                                photos: activeEntry.photos!,
                                index: idx,
                                title: activeEntry.title,
                                date: activeEntry.date,
                              })
                            }
                            aria-label={`View photo ${idx + 1} of ${count} from "${activeEntry.title}" in larger preview`}
                            className={`relative block w-full overflow-hidden rounded-xl bg-[#EFECE4] focus:outline-none focus:ring-2 focus:ring-[#1E3F31] ${
                              count === 1 ? 'aspect-[4/3]' : 'aspect-[4/3]'
                            }`}
                          >
                            <img
                              src={photo.dataUrl}
                              alt={
                                photo.name ||
                                `${activeEntry.title} memory ${idx + 1}`
                              }
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                            <span
                              aria-hidden="true"
                              className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1C241E]/65 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveEntryPhoto(activeEntry, photo.id)
                            }
                            aria-label={`Remove photo ${idx + 1} from "${activeEntry.title}"`}
                            className="absolute top-3.5 right-3.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1C241E]/70 text-white opacity-85 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:bg-[#9A3B30] transition-all shadow-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <figcaption className="mt-2 px-1 flex items-center justify-between gap-2 text-[11px] text-[#58645B]">
                            <span className="truncate">
                              {photo.name || `Memory ${idx + 1}`}
                            </span>
                            <span className="font-mono text-[10px] text-[#7D8880] shrink-0">
                              #{idx + 1}
                            </span>
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#E2DDD2] bg-[#FCFBF8] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-[#58645B]">
                    <ImageIcon
                      className="w-4 h-4 text-[#7A9A83] shrink-0"
                      aria-hidden="true"
                    />
                    <span>No photos attached to this entry yet.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditComposer(activeEntry)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add photo</span>
                  </button>
                </div>
              )}

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

      {/* Photo Lightbox Modal */}
      {lightboxState && lightboxState.photos[lightboxState.index] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo preview for ${lightboxState.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141C16]/85 backdrop-blur-xs p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxState(null);
          }}
        >
          <div className="relative w-full max-w-4xl rounded-2xl bg-[#FBF9F4] border border-[#DDD8CD] p-3 sm:p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EAE6DC]">
              <div className="min-w-0">
                <p className="font-serif text-lg font-medium text-[#1C241E] truncate">
                  {lightboxState.title}
                </p>
                <p className="text-xs text-[#58645B] font-mono tabular-nums">
                  {formatLongDateFromKey(lightboxState.date)} · Photo{' '}
                  {lightboxState.index + 1} of {lightboxState.photos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                aria-label="Close photo preview"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD8CD] bg-white text-[#1C241E] hover:bg-[#F3EFE6] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mt-3 flex items-center justify-center rounded-xl bg-[#1C241E]/5 overflow-hidden">
              <img
                src={lightboxState.photos[lightboxState.index].dataUrl}
                alt={
                  lightboxState.photos[lightboxState.index].name ||
                  `${lightboxState.title} photo ${lightboxState.index + 1}`
                }
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />

              {lightboxState.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState((prev) =>
                        prev
                          ? {
                              ...prev,
                              index:
                                (prev.index - 1 + prev.photos.length) %
                                prev.photos.length,
                            }
                          : null
                      )
                    }
                    aria-label="Previous photo"
                    className="absolute left-2 sm:left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1C241E] border border-[#DDD8CD] shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index + 1) % prev.photos.length,
                            }
                          : null
                      )
                    }
                    aria-label="Next photo"
                    className="absolute right-2 sm:right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1C241E] border border-[#DDD8CD] shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {lightboxState.photos[lightboxState.index].name && (
              <p className="mt-2.5 text-center text-xs text-[#58645B]">
                {lightboxState.photos[lightboxState.index].name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
