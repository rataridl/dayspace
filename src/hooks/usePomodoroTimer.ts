import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientSoundPreset,
  PomodoroMode,
  PomodoroSessionRecord,
  PomodoroSettings,
  TaskItem,
} from '../types/dayspace';
import { ambientAudio } from '../utils/ambientAudio';
import {
  computePomodoroStats,
  getDurationSecondsForMode,
  getNextPomodoroMode,
  getTodayDateKey,
} from '../utils/productivity';

interface UsePomodoroTimerOptions {
  settings: PomodoroSettings;
  sessions: PomodoroSessionRecord[];
  tasks: TaskItem[];
  onUpdateSettings: (updates: Partial<PomodoroSettings>) => void;
  onRecordSession: (input: {
    mode: PomodoroMode;
    durationMinutes: number;
    taskTitle?: string;
  }) => void;
}

export function usePomodoroTimer({
  settings,
  sessions,
  tasks,
  onUpdateSettings,
  onRecordSession,
}: UsePomodoroTimerOptions) {
  const [mode, setMode] = useState<PomodoroMode>(PomodoroMode.Focus);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    getDurationSecondsForMode(PomodoroMode.Focus, settings)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [ambientPlaying, setAmbientPlaying] = useState(false);

  const todayKey = getTodayDateKey();
  const stats = useMemo(
    () => computePomodoroStats(sessions, todayKey),
    [sessions, todayKey]
  );

  const totalDurationSeconds = useMemo(
    () => getDurationSecondsForMode(mode, settings),
    [mode, settings]
  );

  const linkedTaskTitle = useMemo(() => {
    if (!selectedTaskId) return undefined;
    return tasks.find((t) => t.id === selectedTaskId)?.title;
  }, [selectedTaskId, tasks]);

  // Keep prevTotalRef so changing duration in settings while idle updates the clock cleanly
  const prevTotalRef = useRef<number>(totalDurationSeconds);
  useEffect(() => {
    if (prevTotalRef.current !== totalDurationSeconds) {
      if (!isRunning) {
        setRemainingSeconds(totalDurationSeconds);
      }
      prevTotalRef.current = totalDurationSeconds;
    }
  }, [totalDurationSeconds, isRunning]);

  // Sync ambient sound engine
  useEffect(() => {
    if (ambientPlaying && settings.ambientSound !== 'none') {
      ambientAudio.setPreset(settings.ambientSound, settings.ambientVolume);
    } else {
      ambientAudio.stop();
    }
  }, [ambientPlaying, settings.ambientSound, settings.ambientVolume]);

  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  const handlePhaseComplete = useCallback(
    (triggeredByCountdown: boolean) => {
      const durationMinutes = Math.max(
        1,
        Math.round(getDurationSecondsForMode(mode, settings) / 60)
      );

      onRecordSession({
        mode,
        durationMinutes,
        taskTitle: mode === PomodoroMode.Focus ? linkedTaskTitle : undefined,
      });

      if (settings.soundEnabled) {
        ambientAudio.playCompletionChime();
      }

      const nextMode = getNextPomodoroMode(
        mode,
        stats.completedFocusToday,
        settings.longBreakInterval
      );
      const nextSeconds = getDurationSecondsForMode(nextMode, settings);

      setMode(nextMode);
      setRemainingSeconds(nextSeconds);
      prevTotalRef.current = nextSeconds;
      setIsRunning(triggeredByCountdown ? settings.autoStartNext : false);
    },
    [
      mode,
      settings,
      linkedTaskTitle,
      onRecordSession,
      stats.completedFocusToday,
    ]
  );

  // Ref holds latest completion callback so 1s interval stays rock-solid
  const completeRef = useRef(handlePhaseComplete);
  useEffect(() => {
    completeRef.current = handlePhaseComplete;
  }, [handlePhaseComplete]);

  useEffect(() => {
    if (!isRunning) return;
    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => completeRef.current(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const toggleRunning = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    const freshSeconds = getDurationSecondsForMode(mode, settings);
    setRemainingSeconds(freshSeconds);
    prevTotalRef.current = freshSeconds;
  }, [mode, settings]);

  const switchMode = useCallback(
    (nextMode: PomodoroMode) => {
      setIsRunning(false);
      setMode(nextMode);
      const nextSeconds = getDurationSecondsForMode(nextMode, settings);
      setRemainingSeconds(nextSeconds);
      prevTotalRef.current = nextSeconds;
    },
    [settings]
  );

  const completeNow = useCallback(() => {
    handlePhaseComplete(false);
  }, [handlePhaseComplete]);

  const skipToNextMode = useCallback(() => {
    const nextMode = getNextPomodoroMode(
      mode,
      stats.completedFocusToday,
      settings.longBreakInterval
    );
    switchMode(nextMode);
  }, [mode, stats.completedFocusToday, settings.longBreakInterval, switchMode]);

  const selectAmbientPreset = useCallback(
    (preset: AmbientSoundPreset) => {
      onUpdateSettings({ ambientSound: preset });
      if (preset === 'none') {
        setAmbientPlaying(false);
      } else {
        setAmbientPlaying(true);
      }
    },
    [onUpdateSettings]
  );

  const toggleAmbientPlaying = useCallback(() => {
    if (settings.ambientSound === 'none') {
      onUpdateSettings({ ambientSound: 'rain' });
      setAmbientPlaying(true);
      return;
    }
    setAmbientPlaying((prev) => !prev);
  }, [settings.ambientSound, onUpdateSettings]);

  const setAmbientVolume = useCallback(
    (volume: number) => {
      const clamped = Math.min(1, Math.max(0, volume));
      onUpdateSettings({ ambientVolume: clamped });
      ambientAudio.setVolume(clamped);
    },
    [onUpdateSettings]
  );

  return {
    mode,
    remainingSeconds,
    totalDurationSeconds,
    isRunning,
    selectedTaskId,
    setSelectedTaskId,
    linkedTaskTitle,
    ambientPlaying,
    stats,
    toggleRunning,
    resetTimer,
    switchMode,
    completeNow,
    skipToNextMode,
    selectAmbientPreset,
    toggleAmbientPlaying,
    setAmbientVolume,
  };
}
