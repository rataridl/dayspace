import { useState } from 'react';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
import { FinanceView } from './components/FinanceView';
import { HabitsView } from './components/HabitsView';
import { JournalView } from './components/JournalView';
import { QuickAddModals, QuickModalKind } from './components/QuickAddModals';
import { PomodoroView } from './components/PomodoroView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TasksView } from './components/TasksView';
import { DAILY_QUOTES } from './data/seed';
import { useDayspaceStore } from './hooks/useDayspaceStore';
import { usePomodoroTimer } from './hooks/usePomodoroTimer';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import {
  CalendarEvent,
  HabitItem,
  NavigationView,
  TaskItem,
} from './types/dayspace';
import { formatTimerClock, getDailyQuote } from './utils/productivity';

export default function App() {
  const auth = useSupabaseAuth();

  const {
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
  } = useDayspaceStore(auth.user?.id ?? null);

  const pomodoro = usePomodoroTimer({
    settings: state.pomodoroSettings,
    sessions: state.pomodoroSessions,
    tasks: state.tasks,
    onUpdateSettings: updatePomodoroSettings,
    onRecordSession: recordPomodoroSession,
  });

  const [activeView, setActiveView] = useState<NavigationView>(
    NavigationView.Dashboard
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickModal, setQuickModal] = useState<QuickModalKind>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(
    undefined
  );

  const openCreateModal = (kind: QuickModalKind, initialDate?: string) => {
    setEditingTask(null);
    setEditingHabit(null);
    setEditingEvent(null);
    setModalInitialDate(initialDate);
    setQuickModal(kind);
  };

  const openEditTask = (task: TaskItem) => {
    setEditingHabit(null);
    setEditingEvent(null);
    setEditingTask(task);
    setModalInitialDate(undefined);
    setQuickModal('task');
  };

  const openEditHabit = (habit: HabitItem) => {
    setEditingTask(null);
    setEditingEvent(null);
    setEditingHabit(habit);
    setModalInitialDate(undefined);
    setQuickModal('habit');
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEditingTask(null);
    setEditingHabit(null);
    setEditingEvent(event);
    setModalInitialDate(undefined);
    setQuickModal('event');
  };

  const closeModals = () => {
    setQuickModal(null);
    setEditingTask(null);
    setEditingHabit(null);
    setEditingEvent(null);
    setModalInitialDate(undefined);
  };

  const remainingTaskCount = state.tasks.filter((t) => !t.completed).length;
  const currentQuote = getDailyQuote(DAILY_QUOTES, new Date(), state.quoteOffset);

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1C241E] overflow-x-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        userName={state.profile.name}
        taskCountRemaining={remainingTaskCount}
        activeTimerLabel={
          pomodoro.isRunning
            ? formatTimerClock(pomodoro.remainingSeconds)
            : undefined
        }
        mobileOpen={mobileMenuOpen}
        onSetMobileOpen={setMobileMenuOpen}
        onQuickAddTask={() => openCreateModal('task')}
      />

      <main className="lg:pl-[272px] min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-7">
          {activeView === NavigationView.Dashboard && (
            <DashboardView
              profile={state.profile}
              tasks={state.tasks}
              habits={state.habits}
              events={state.events}
              pomodoroSessions={state.pomodoroSessions}
              quote={currentQuote}
              onOpenQuickModal={(kind) => openCreateModal(kind)}
              onNavigate={setActiveView}
              onToggleTask={toggleTask}
              onAddQuickTask={addTask}
              onEditTask={openEditTask}
              onDeleteTask={deleteTask}
              onToggleHabitToday={toggleHabitDate}
              onEditEvent={openEditEvent}
              onDeleteEvent={deleteEvent}
              onCycleQuote={cycleQuote}
            />
          )}

          {activeView === NavigationView.Tasks && (
            <TasksView
              tasks={state.tasks}
              onToggleTask={toggleTask}
              onEditTask={openEditTask}
              onDeleteTask={deleteTask}
              onOpenNewTask={() => openCreateModal('task')}
            />
          )}

          {activeView === NavigationView.Habits && (
            <HabitsView
              habits={state.habits}
              onToggleHabitDate={toggleHabitDate}
              onEditHabit={openEditHabit}
              onDeleteHabit={deleteHabit}
              onOpenNewHabit={() => openCreateModal('habit')}
            />
          )}

          {activeView === NavigationView.Focus && (
            <PomodoroView
              mode={pomodoro.mode}
              remainingSeconds={pomodoro.remainingSeconds}
              totalDurationSeconds={pomodoro.totalDurationSeconds}
              isRunning={pomodoro.isRunning}
              selectedTaskId={pomodoro.selectedTaskId}
              onSelectTaskId={pomodoro.setSelectedTaskId}
              ambientPlaying={pomodoro.ambientPlaying}
              settings={state.pomodoroSettings}
              stats={pomodoro.stats}
              tasks={state.tasks}
              onToggleRunning={pomodoro.toggleRunning}
              onResetTimer={pomodoro.resetTimer}
              onSwitchMode={pomodoro.switchMode}
              onCompleteNow={pomodoro.completeNow}
              onSkipToNextMode={pomodoro.skipToNextMode}
              onUpdateSettings={updatePomodoroSettings}
              onSelectAmbientPreset={pomodoro.selectAmbientPreset}
              onToggleAmbientPlaying={pomodoro.toggleAmbientPlaying}
              onSetAmbientVolume={pomodoro.setAmbientVolume}
              onClearSessions={clearPomodoroSessions}
            />
          )}

          {activeView === NavigationView.Journal && (
            <JournalView
              entries={state.journalEntries}
              storageError={storageError}
              onAddEntry={addJournalEntry}
              onUpdateEntry={updateJournalEntry}
              onDeleteEntry={deleteJournalEntry}
            />
          )}

          {activeView === NavigationView.Finance && (
            <FinanceView
              transactions={state.transactions}
              savingsGoals={state.savingsGoals}
              onAddTransaction={addTransaction}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
              onAddGoal={addSavingsGoal}
              onUpdateGoal={updateSavingsGoal}
              onContributeGoal={contributeToSavingsGoal}
              onDeleteGoal={deleteSavingsGoal}
            />
          )}

          {activeView === NavigationView.Calendar && (
            <CalendarView
              events={state.events}
              tasks={state.tasks}
              calendarMode={state.calendarMode}
              onChangeCalendarMode={setCalendarMode}
              onOpenNewEvent={(date) => openCreateModal('event', date)}
              onEditEvent={openEditEvent}
              onDeleteEvent={deleteEvent}
              onOpenNewTask={(date) => openCreateModal('task', date)}
              onEditTask={openEditTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
            />
          )}

          {activeView === NavigationView.Settings && (
            <SettingsView
              workspaceState={state}
              storageError={storageError}
              onSaveProfile={updateProfile}
              onResetDemoData={resetDemoData}
              onImportWorkspaceState={importWorkspaceState}
              onClearAllData={clearAllData}
              supabaseAuth={{
                user: auth.user,
                loading: auth.loading,
                submitting: auth.submitting,
                configured: auth.configured,
                envDiagnostic: auth.envDiagnostic,
                authError: auth.authError,
                authNotice: auth.authNotice,
                onSignIn: auth.signIn,
                onSignUp: auth.signUp,
                onSignOut: auth.signOut,
                onClearMessages: auth.clearAuthMessages,
              }}
              cloudSync={{
                status: cloudSyncStatus,
                error: cloudSyncError,
                lastSyncedAt,
                onSyncNow: syncNow,
              }}
            />
          )}
        </div>
      </main>

      <QuickAddModals
        activeModal={quickModal}
        editingTask={editingTask}
        editingHabit={editingHabit}
        editingEvent={editingEvent}
        initialDate={modalInitialDate}
        onClose={closeModals}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onAddHabit={addHabit}
        onUpdateHabit={updateHabit}
        onAddEvent={addEvent}
        onUpdateEvent={updateEvent}
      />
    </div>
  );
}
