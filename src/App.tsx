import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
import { DayspaceMark } from './components/DayspaceMark';
import { FinanceView } from './components/FinanceView';
import { HabitsView } from './components/HabitsView';
import { JournalView } from './components/JournalView';
import { QuickAddModals, QuickModalKind } from './components/QuickAddModals';
import { PomodoroView } from './components/PomodoroView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TasksView } from './components/TasksView';
import { WorkspaceMigrationView } from './components/WorkspaceMigrationView';
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
import { deriveProfileNameFromUser } from './utils/authValidation';
import { formatTimerClock, getDailyQuote } from './utils/productivity';

export default function App() {
  const auth = useSupabaseAuth();
  const activeUserId = auth.user?.id ?? null;
  const defaultProfileName = auth.user
    ? deriveProfileNameFromUser(
        auth.user.email,
        auth.user.user_metadata as Record<string, unknown> | null
      )
    : undefined;

  const {
    state,
    storageError,
    cloudSyncStatus,
    cloudSyncError,
    lastSyncedAt,
    hydrationPhase,
    hydrationError,
    canContinueOffline,
    migrationCandidate,
    migrationSubmitting,
    retryCloudHydration,
    continueOfflineWithCache,
    confirmImportMigration,
    confirmStartFreshMigration,
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
    addWallet,
    updateWallet,
    deleteWallet,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactionsCsv,
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
  } = useDayspaceStore(activeUserId, defaultProfileName);

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

  // Reset UI view & modals whenever the authenticated account changes or signs out
  useEffect(() => {
    setActiveView(NavigationView.Dashboard);
    setMobileMenuOpen(false);
    setQuickModal(null);
    setEditingTask(null);
    setEditingHabit(null);
    setEditingEvent(null);
    setModalInitialDate(undefined);
  }, [activeUserId]);

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

  // Gate 1: Checking initial auth session
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] text-[#1C241E] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <DayspaceMark className="w-10 h-10 mx-auto" />
          <div className="inline-flex items-center gap-2 text-sm text-[#58645B]">
            <Loader2 className="w-4 h-4 animate-spin text-[#1E3F31]" />
            <span>Checking your session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Mandatory authentication landing page (or password recovery completion)
  if (!auth.user || auth.isPasswordRecovery) {
    return (
      <AuthView
        configured={auth.configured}
        envDiagnostic={auth.envDiagnostic}
        submitting={auth.submitting}
        authError={auth.authError}
        authNotice={auth.authNotice}
        pendingVerificationEmail={auth.pendingVerificationEmail}
        isPasswordRecovery={auth.isPasswordRecovery}
        recoveryEmail={auth.user?.email ?? null}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onResendVerification={auth.resendVerificationEmail}
        onRequestPasswordReset={auth.requestPasswordReset}
        onUpdatePassword={auth.updatePassword}
        onDismissRecovery={auth.dismissRecoveryMode}
        onClearMessages={auth.clearAuthMessages}
        onClearPendingVerification={auth.clearPendingVerification}
      />
    );
  }

  // Gate 3: Safe cloud hydration, explicit local migration prompt, or retry error
  if (hydrationPhase !== 'ready') {
    const visibleMigrationPhase =
      hydrationPhase === 'idle' ? 'loading' : hydrationPhase;
    return (
      <WorkspaceMigrationView
        userEmail={auth.user.email || 'Authenticated user'}
        phase={visibleMigrationPhase}
        error={hydrationError}
        canContinueOffline={canContinueOffline}
        candidate={migrationCandidate}
        submitting={migrationSubmitting}
        onRetry={retryCloudHydration}
        onContinueOffline={continueOfflineWithCache}
        onConfirmImport={confirmImportMigration}
        onConfirmStartFresh={confirmStartFreshMigration}
        onSignOut={auth.signOut}
      />
    );
  }

  const remainingTaskCount = state.tasks.filter((t) => !t.completed).length;
  const currentQuote = getDailyQuote(DAILY_QUOTES, new Date(), state.quoteOffset);

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1C241E] overflow-x-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        userName={state.profile.name}
        userEmail={auth.user.email}
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
              wallets={state.wallets}
              transactions={state.transactions}
              savingsGoals={state.savingsGoals}
              onAddWallet={addWallet}
              onUpdateWallet={updateWallet}
              onDeleteWallet={deleteWallet}
              onAddTransaction={addTransaction}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
              onImportTransactionsCsv={importTransactionsCsv}
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
                submitting: auth.submitting,
                onSignOut: auth.signOut,
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
