import {
  Bell,
  BellOff,
  CheckCircle2,
  CloudRain,
  Coffee,
  Flame,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from 'lucide-react';
import {
  AmbientSoundPreset,
  PomodoroMode,
  PomodoroSettings,
  TaskItem,
} from '../types/dayspace';
import {
  clampDurationMinutes,
  formatTime12Hour,
  formatTimerClock,
  PomodoroStats,
} from '../utils/productivity';

interface PomodoroViewProps {
  mode: PomodoroMode;
  remainingSeconds: number;
  totalDurationSeconds: number;
  isRunning: boolean;
  selectedTaskId: string;
  onSelectTaskId: (taskId: string) => void;
  ambientPlaying: boolean;
  settings: PomodoroSettings;
  stats: PomodoroStats;
  tasks: TaskItem[];
  onToggleRunning: () => void;
  onResetTimer: () => void;
  onSwitchMode: (mode: PomodoroMode) => void;
  onCompleteNow: () => void;
  onSkipToNextMode: () => void;
  onUpdateSettings: (updates: Partial<PomodoroSettings>) => void;
  onSelectAmbientPreset: (preset: AmbientSoundPreset) => void;
  onToggleAmbientPlaying: () => void;
  onSetAmbientVolume: (volume: number) => void;
  onClearSessions: () => void;
}

const MODE_META: Record<
  PomodoroMode,
  {
    label: string;
    subtitle: string;
    accentRing: string;
  }
> = {
  [PomodoroMode.Focus]: {
    label: 'Focus',
    subtitle: 'Deep work sprint',
    accentRing: '#1E3F31',
  },
  [PomodoroMode.ShortBreak]: {
    label: 'Short Break',
    subtitle: 'Step back and breathe',
    accentRing: '#5C7C66',
  },
  [PomodoroMode.LongBreak]: {
    label: 'Long Break',
    subtitle: 'Deep restorative pause',
    accentRing: '#7A9A83',
  },
};

const QUICK_PRESETS: {
  label: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}[] = [
  { label: 'Classic 25 / 5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
  { label: 'Deep 50 / 10', focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20 },
  { label: 'Sprint 15 / 3', focusMinutes: 15, shortBreakMinutes: 3, longBreakMinutes: 10 },
];

const AMBIENT_PRESETS: {
  id: AmbientSoundPreset;
  label: string;
  detail: string;
  icon: typeof CloudRain;
}[] = [
  { id: 'none', label: 'Silent', detail: 'No background audio', icon: VolumeX },
  { id: 'rain', label: 'Soft Rain', detail: 'Gentle filtered rainfall', icon: CloudRain },
  { id: 'forest-wind', label: 'Forest Wind', detail: 'Drifting canopy breeze', icon: Wind },
  { id: 'brown-noise', label: 'Brown Noise', detail: 'Warm low-frequency wash', icon: Waves },
  { id: 'singing-bowl', label: 'Singing Bowl', detail: 'Calm harmonic drone', icon: Sparkles },
];

function formatSessionTimestamp(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return formatTime12Hour(`${hh}:${mm}`);
}

export function PomodoroView({
  mode,
  remainingSeconds,
  totalDurationSeconds,
  isRunning,
  selectedTaskId,
  onSelectTaskId,
  ambientPlaying,
  settings,
  stats,
  tasks,
  onToggleRunning,
  onResetTimer,
  onSwitchMode,
  onCompleteNow,
  onSkipToNextMode,
  onUpdateSettings,
  onSelectAmbientPreset,
  onToggleAmbientPlaying,
  onSetAmbientVolume,
  onClearSessions,
}: PomodoroViewProps) {
  const incompleteTasks = tasks.filter((t) => !t.completed);

  const progressRatio =
    totalDurationSeconds > 0
      ? Math.min(
          1,
          Math.max(0, (totalDurationSeconds - remainingSeconds) / totalDurationSeconds)
        )
      : 0;

  const ringRadius = 112;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - progressRatio);

  const safeInterval = Math.max(2, settings.longBreakInterval);
  const currentCycleIndex = (stats.completedFocusToday % safeInterval) + 1;
  const modeMeta = MODE_META[mode];

  const isAudioActive = ambientPlaying && settings.ambientSound !== 'none';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#58645B]">
            Deep Work &amp; Rhythm
          </p>
          <h1
            className="mt-1 font-serif text-3xl sm:text-[34px] font-semibold tracking-tight text-[#1C241E]"
            style={{ textWrap: 'balance' }}
          >
            Focus Timer
          </h1>
          <p className="mt-1.5 text-sm text-[#58645B]">
            <span className="font-mono tabular-nums font-medium text-[#1C241E]">
              {stats.completedFocusToday}
            </span>{' '}
            focus {stats.completedFocusToday === 1 ? 'session' : 'sessions'} today ·{' '}
            <span className="font-mono tabular-nums font-medium text-[#1C241E]">
              {stats.focusMinutesToday}
            </span>{' '}
            min logged ·{' '}
            <span className="font-mono tabular-nums font-medium text-[#1C241E]">
              {stats.completedFocusTotal}
            </span>{' '}
            all-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ soundEnabled: !settings.soundEnabled })
            }
            aria-pressed={settings.soundEnabled}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
              settings.soundEnabled
                ? 'bg-white border-[#D9D4C8] text-[#1C241E] hover:bg-[#F3EFE6]'
                : 'bg-[#F5F2EA] border-[#E5E1D8] text-[#6A786D] hover:text-[#1C241E]'
            }`}
          >
            {settings.soundEnabled ? (
              <Bell className="w-3.5 h-3.5 text-[#1E3F31]" />
            ) : (
              <BellOff className="w-3.5 h-3.5" />
            )}
            <span>{settings.soundEnabled ? 'Chime on' : 'Chime muted'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleAmbientPlaying}
            aria-pressed={isAudioActive}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
              isAudioActive
                ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                : 'bg-white border-[#D9D4C8] text-[#1C241E] hover:bg-[#F3EFE6]'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>
              {isAudioActive ? 'Ambient playing' : 'Play ambient'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Focus Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Primary Timer Stage + Ambient Sound */}
        <div className="lg:col-span-7 space-y-5">
          <section
            aria-label="Pomodoro countdown timer"
            className="bg-white border border-[#E5E1D8] rounded-2xl p-5 sm:p-7 shadow-[0_1px_2px_rgba(28,36,30,0.04)]"
          >
            {/* Mode Switcher */}
            <div
              role="tablist"
              aria-label="Timer session mode"
              className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-[#F5F2EA] border border-[#EAE6DC]"
            >
              {[
                {
                  id: PomodoroMode.Focus,
                  label: 'Focus',
                  mins: settings.focusMinutes,
                },
                {
                  id: PomodoroMode.ShortBreak,
                  label: 'Short break',
                  mins: settings.shortBreakMinutes,
                },
                {
                  id: PomodoroMode.LongBreak,
                  label: 'Long break',
                  mins: settings.longBreakMinutes,
                },
              ].map((tab) => {
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSwitchMode(tab.id)}
                    className={`px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      active
                        ? 'bg-[#1E3F31] text-white shadow-[0_1px_4px_rgba(30,63,49,0.2)]'
                        : 'text-[#4B574E] hover:text-[#1C241E] hover:bg-white/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        active ? 'text-[#C6DEC9]' : 'text-[#6A786D]'
                      }`}
                    >
                      {tab.mins}m
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Circular Progress Dial */}
            <div className="mt-7 mb-6 flex flex-col items-center">
              <div className="relative w-[248px] h-[248px] sm:w-[268px] sm:h-[268px] flex items-center justify-center">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 260 260"
                  aria-hidden="true"
                >
                  <circle
                    cx="130"
                    cy="130"
                    r={ringRadius}
                    fill="none"
                    stroke="#EFECE4"
                    strokeWidth="10"
                  />
                  <circle
                    cx="130"
                    cy="130"
                    r={ringRadius}
                    fill="none"
                    stroke={modeMeta.accentRing}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringDashOffset}
                    className="transition-[stroke-dashoffset] duration-500 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#58645B]">
                    {modeMeta.label}
                  </span>
                  <div
                    data-testid="pomodoro-clock"
                    className="mt-1 font-mono text-5xl sm:text-[56px] font-semibold tracking-tight text-[#1C241E] tabular-nums leading-none"
                  >
                    {formatTimerClock(remainingSeconds)}
                  </div>
                  <p className="mt-2.5 text-xs text-[#58645B]">
                    {isRunning ? 'Session in progress' : modeMeta.subtitle}
                  </p>
                </div>
              </div>

              {/* Cycle Progress Dots */}
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2" aria-hidden="true">
                  {Array.from({ length: safeInterval }).map((_, index) => {
                    const completedInCycle =
                      stats.completedFocusToday % safeInterval;
                    const isFilled = index < completedInCycle;
                    const isCurrent =
                      index === completedInCycle && mode === PomodoroMode.Focus;
                    return (
                      <span
                        key={index}
                        className={`h-2.5 rounded-full transition-all ${
                          isFilled
                            ? 'w-6 bg-[#1E3F31]'
                            : isCurrent
                            ? 'w-6 bg-[#9EB8A4]'
                            : 'w-2.5 bg-[#E2DDD1]'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-[#58645B]">
                  Cycle{' '}
                  <span className="font-mono tabular-nums font-medium text-[#1C241E]">
                    {currentCycleIndex}
                  </span>{' '}
                  of{' '}
                  <span className="font-mono tabular-nums font-medium text-[#1C241E]">
                    {safeInterval}
                  </span>{' '}
                  before long break
                </p>
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onToggleRunning}
                className="inline-flex items-center justify-center gap-2 min-w-[148px] px-6 py-3 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors shadow-[0_2px_10px_rgba(30,63,49,0.2)]"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>
                      {remainingSeconds < totalDurationSeconds
                        ? 'Resume'
                        : 'Start focus'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onResetTimer}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#D9D4C8] bg-white text-sm font-medium text-[#344038] hover:bg-[#F3EFE6] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={onCompleteNow}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#D9D4C8] bg-white text-sm font-medium text-[#1E3F31] hover:bg-[#EDF3EE] transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete &amp; log</span>
              </button>

              <button
                type="button"
                onClick={onSkipToNextMode}
                aria-label="Skip to next phase"
                className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl border border-transparent text-sm font-medium text-[#58645B] hover:bg-[#F3EFE6] hover:text-[#1C241E] transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip</span>
              </button>
            </div>

            {/* Task Link Selector */}
            <div className="mt-6 pt-5 border-t border-[#EFECE4]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <label
                  htmlFor="focus-task-select"
                  className="text-xs font-medium text-[#4B574E] flex items-center gap-1.5"
                >
                  <Timer className="w-3.5 h-3.5 text-[#5C7C66]" />
                  <span>Focusing on task</span>
                </label>
                <select
                  id="focus-task-select"
                  value={selectedTaskId}
                  onChange={(e) => onSelectTaskId(e.target.value)}
                  className="w-full sm:w-72 rounded-xl border border-[#DDD8CC] bg-[#FBF9F4] px-3 py-2 text-xs sm:text-sm text-[#1C241E] focus:outline-none focus:border-[#1E3F31]"
                >
                  <option value="">Open focus (unlinked)</option>
                  {incompleteTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Ambient Sound Controls */}
          <section
            aria-label="Ambient soundscape controls"
            className="bg-white border border-[#E5E1D8] rounded-2xl p-5 shadow-[0_1px_2px_rgba(28,36,30,0.04)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#1C241E]">
                  Ambient Sound
                </h2>
                <p className="text-xs text-[#6A786D]">
                  Synthesized calm soundscapes generated locally
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={settings.ambientSound === 'none'}
                  onClick={() => onSelectAmbientPreset('none')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    settings.ambientSound === 'none'
                      ? 'bg-[#EDF3EE] border-[#5C7C66] text-[#1E3F31]'
                      : 'bg-[#FBF9F4] border-[#EAE6DC] text-[#58645B] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Silent</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleAmbientPlaying}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isAudioActive
                      ? 'bg-[#1E3F31] text-white'
                      : 'bg-[#F5F2EA] text-[#344038] hover:bg-[#EAE5D8]'
                  }`}
                >
                  {isAudioActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Mute</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AMBIENT_PRESETS.filter((p) => p.id !== 'none').map((preset) => {
                const Icon = preset.icon;
                const isSelected = settings.ambientSound === preset.id;
                const isActivePlaying = isSelected && ambientPlaying;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectAmbientPreset(preset.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#EDF3EE] border-[#5C7C66] text-[#1E3F31]'
                        : 'bg-[#FBF9F4] border-[#EAE6DC] text-[#344038] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActivePlaying
                          ? 'bg-[#1E3F31] text-white'
                          : isSelected
                          ? 'bg-[#DCE6DD] text-[#1E3F31]'
                          : 'bg-white text-[#5C7C66] border border-[#EAE6DC]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold truncate">
                        {preset.label}
                      </span>
                      <span className="block text-[11px] text-[#6A786D] truncate">
                        {isActivePlaying ? 'Playing now' : preset.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#EFECE4] flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-[#5C7C66] shrink-0" />
              <label htmlFor="ambient-volume-slider" className="sr-only">
                Ambient sound volume
              </label>
              <input
                id="ambient-volume-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.ambientVolume * 100)}
                onChange={(e) =>
                  onSetAmbientVolume(Number(e.target.value) / 100)
                }
                className="w-full accent-[#1E3F31] cursor-pointer"
              />
              <span className="font-mono text-xs text-[#4B574E] tabular-nums w-9 text-right shrink-0">
                {Math.round(settings.ambientVolume * 100)}%
              </span>
            </div>
          </section>
        </div>

        {/* Right Column: Stats & Custom Durations */}
        <div className="lg:col-span-5 space-y-5">
          {/* Session Counts & Recent History */}
          <section
            aria-label="Session counts and recent log"
            className="bg-white border border-[#E5E1D8] rounded-2xl p-5 shadow-[0_1px_2px_rgba(28,36,30,0.04)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-[#1C241E]">
                Session Progress
              </h2>
              {stats.recentSessions.length > 0 && (
                <button
                  type="button"
                  onClick={onClearSessions}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6A786D] hover:text-[#9A3B30] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear log</span>
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  Today
                </p>
                <p
                  data-testid="sessions-today-count"
                  className="mt-1 font-mono text-2xl font-semibold text-[#1C241E] tabular-nums"
                >
                  {stats.completedFocusToday}
                </p>
                <p className="text-[11px] text-[#6A786D]">focus rounds</p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  Focused
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1E3F31] tabular-nums">
                  {stats.focusMinutesToday}m
                </p>
                <p className="text-[11px] text-[#6A786D]">logged today</p>
              </div>
              <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-3">
                <p className="text-[11px] font-medium text-[#58645B]">
                  All-time
                </p>
                <p
                  data-testid="sessions-total-count"
                  className="mt-1 font-mono text-2xl font-semibold text-[#1C241E] tabular-nums"
                >
                  {stats.completedFocusTotal}
                </p>
                <p className="text-[11px] text-[#6A786D]">
                  {stats.totalFocusMinutes}m total
                </p>
              </div>
            </div>

            {/* Recent Session Log */}
            <div className="mt-4 pt-4 border-t border-[#EFECE4]">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-[#58645B]">
                Recent Sessions
              </h3>
              {stats.recentSessions.length === 0 ? (
                <p className="mt-2.5 text-xs text-[#6A786D]">
                  No completed sessions yet. Start a focus round or tap Complete
                  &amp; log when finished.
                </p>
              ) : (
                <ul className="mt-2.5 space-y-2 max-h-52 overflow-y-auto pr-1">
                  {stats.recentSessions.slice(0, 6).map((session) => {
                    const isFocus = session.mode === PomodoroMode.Focus;
                    return (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-3 py-1.5 border-b border-[#F3EFE6] last:border-b-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isFocus ? (
                            <Flame className="w-3.5 h-3.5 text-[#1E3F31] shrink-0" />
                          ) : (
                            <Coffee className="w-3.5 h-3.5 text-[#5C7C66] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#1C241E] truncate">
                              {session.taskTitle ||
                                (session.mode === PomodoroMode.Focus
                                  ? 'Focus Session'
                                  : session.mode === PomodoroMode.ShortBreak
                                  ? 'Short Break'
                                  : 'Long Break')}
                            </p>
                            <p className="text-[11px] text-[#6A786D]">
                              {session.dateKey} ·{' '}
                              {formatSessionTimestamp(session.completedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-medium text-[#1E3F31] tabular-nums shrink-0">
                          {session.durationMinutes}m
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Custom Durations & Preferences */}
          <section
            aria-label="Custom timer durations"
            className="bg-white border border-[#E5E1D8] rounded-2xl p-5 shadow-[0_1px_2px_rgba(28,36,30,0.04)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-[#1C241E]">
                Custom Durations
              </h2>
              <span className="text-xs text-[#6A786D]">Minutes</span>
            </div>

            {/* Quick Presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PRESETS.map((preset) => {
                const isSelected =
                  settings.focusMinutes === preset.focusMinutes &&
                  settings.shortBreakMinutes === preset.shortBreakMinutes &&
                  settings.longBreakMinutes === preset.longBreakMinutes;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        focusMinutes: preset.focusMinutes,
                        shortBreakMinutes: preset.shortBreakMinutes,
                        longBreakMinutes: preset.longBreakMinutes,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#E8EFE9] border-[#5C7C66] text-[#1E3F31]'
                        : 'bg-[#FBF9F4] border-[#E5E1D8] text-[#4B574E] hover:bg-[#F1EDE3]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Duration Inputs */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="pomo-focus-mins"
                  className="block text-[11px] font-medium text-[#58645B]"
                >
                  Focus
                </label>
                <input
                  id="pomo-focus-mins"
                  type="number"
                  min={1}
                  max={180}
                  value={settings.focusMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      focusMinutes: clampDurationMinutes(
                        Number(e.target.value),
                        1,
                        180
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#DDD8CC] bg-[#FBF9F4] px-2.5 py-2 font-mono text-sm text-[#1C241E] tabular-nums focus:outline-none focus:border-[#1E3F31]"
                />
              </div>
              <div>
                <label
                  htmlFor="pomo-short-mins"
                  className="block text-[11px] font-medium text-[#58645B]"
                >
                  Short break
                </label>
                <input
                  id="pomo-short-mins"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.shortBreakMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      shortBreakMinutes: clampDurationMinutes(
                        Number(e.target.value),
                        1,
                        60
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#DDD8CC] bg-[#FBF9F4] px-2.5 py-2 font-mono text-sm text-[#1C241E] tabular-nums focus:outline-none focus:border-[#1E3F31]"
                />
              </div>
              <div>
                <label
                  htmlFor="pomo-long-mins"
                  className="block text-[11px] font-medium text-[#58645B]"
                >
                  Long break
                </label>
                <input
                  id="pomo-long-mins"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.longBreakMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      longBreakMinutes: clampDurationMinutes(
                        Number(e.target.value),
                        1,
                        90
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#DDD8CC] bg-[#FBF9F4] px-2.5 py-2 font-mono text-sm text-[#1C241E] tabular-nums focus:outline-none focus:border-[#1E3F31]"
                />
              </div>
              <div>
                <label
                  htmlFor="pomo-cycle-count"
                  className="block text-[11px] font-medium text-[#58645B]"
                >
                  Long every
                </label>
                <input
                  id="pomo-cycle-count"
                  type="number"
                  min={2}
                  max={12}
                  value={settings.longBreakInterval}
                  onChange={(e) =>
                    onUpdateSettings({
                      longBreakInterval: clampDurationMinutes(
                        Number(e.target.value),
                        2,
                        12
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#DDD8CC] bg-[#FBF9F4] px-2.5 py-2 font-mono text-sm text-[#1C241E] tabular-nums focus:outline-none focus:border-[#1E3F31]"
                />
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#EFECE4] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#1C241E]">
                  Auto-start next session
                </p>
                <p className="text-[11px] text-[#6A786D]">
                  Begin breaks and focus rounds automatically
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoStartNext}
                onClick={() =>
                  onUpdateSettings({ autoStartNext: !settings.autoStartNext })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  settings.autoStartNext ? 'bg-[#1E3F31]' : 'bg-[#D6D0C4]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    settings.autoStartNext ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
