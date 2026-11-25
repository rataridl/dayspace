import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  FinanceTransaction,
  SavingsGoal,
  TransactionType,
} from '../types/dayspace';
import {
  computeCategorySpending,
  computeMonthlyFinanceSummary,
  computeMultiMonthCashflow,
  computeSavingsGoalsSummary,
  EXPENSE_CATEGORIES,
  filterTransactions,
  formatCurrency,
  formatMonthKeyLabel,
  formatShortDateLabel,
  getMonthKeyFromDateKey,
  getTodayDateKey,
  INCOME_CATEGORIES,
  shiftMonthKey,
} from '../utils/productivity';
import {
  FinanceModalKind,
  FinanceModals,
  GoalFormPayload,
  TransactionFormPayload,
} from './FinanceModals';

interface FinanceViewProps {
  transactions: FinanceTransaction[];
  savingsGoals: SavingsGoal[];
  onAddTransaction: (input: TransactionFormPayload) => void;
  onUpdateTransaction: (id: string, updates: TransactionFormPayload) => void;
  onDeleteTransaction: (id: string) => void;
  onAddGoal: (input: GoalFormPayload) => void;
  onUpdateGoal: (id: string, updates: GoalFormPayload) => void;
  onContributeGoal: (goalId: string, deltaAmount: number) => void;
  onDeleteGoal: (goalId: string) => void;
}

const CATEGORY_BAR_SHADES = [
  'bg-[#1E3F31]',
  'bg-[#3E6452]',
  'bg-[#5C7C66]',
  'bg-[#7A9A83]',
  'bg-[#9AB3A0]',
  'bg-[#B8CBB9]',
  'bg-[#CDD9CE]',
];

export function FinanceView({
  transactions,
  savingsGoals,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddGoal,
  onUpdateGoal,
  onContributeGoal,
  onDeleteGoal,
}: FinanceViewProps) {
  const todayKey = getTodayDateKey();
  const currentMonthKey = getMonthKeyFromDateKey(todayKey);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [activeModal, setActiveModal] = useState<FinanceModalKind>(null);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Custom inline deposit per goal
  const [activeDepositGoalId, setActiveDepositGoalId] = useState<string | null>(
    null
  );
  const [depositAmountInput, setDepositAmountInput] = useState('');

  const monthlySummary = useMemo(
    () => computeMonthlyFinanceSummary(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const categorySpending = useMemo(
    () => computeCategorySpending(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const cashflowSeries = useMemo(
    () => computeMultiMonthCashflow(transactions, currentMonthKey, 6),
    [transactions, currentMonthKey]
  );

  const maxCashflowValue = useMemo(() => {
    let maxVal = 100;
    for (const pt of cashflowSeries) {
      if (pt.income > maxVal) maxVal = pt.income;
      if (pt.expenses > maxVal) maxVal = pt.expenses;
    }
    return maxVal;
  }, [cashflowSeries]);

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(
        transactions,
        selectedMonth,
        typeFilter,
        categoryFilter,
        searchQuery
      ),
    [transactions, selectedMonth, typeFilter, categoryFilter, searchQuery]
  );

  const goalsSummary = useMemo(
    () => computeSavingsGoalsSummary(savingsGoals),
    [savingsGoals]
  );

  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]);
    for (const tx of transactions) {
      set.add(tx.category);
    }
    return ['All', ...Array.from(set)];
  }, [transactions]);

  const incomeTxCount = useMemo(
    () =>
      transactions.filter(
        (t) =>
          getMonthKeyFromDateKey(t.date) === selectedMonth &&
          t.type === TransactionType.Income
      ).length,
    [transactions, selectedMonth]
  );

  const expenseTxCount = useMemo(
    () =>
      transactions.filter(
        (t) =>
          getMonthKeyFromDateKey(t.date) === selectedMonth &&
          t.type === TransactionType.Expense
      ).length,
    [transactions, selectedMonth]
  );

  const openNewTransactionModal = () => {
    setEditingTx(null);
    setEditingGoal(null);
    setActiveModal('transaction');
  };

  const openEditTransactionModal = (tx: FinanceTransaction) => {
    setEditingGoal(null);
    setEditingTx(tx);
    setActiveModal('transaction');
  };

  const openNewGoalModal = () => {
    setEditingTx(null);
    setEditingGoal(null);
    setActiveModal('goal');
  };

  const openEditGoalModal = (goal: SavingsGoal) => {
    setEditingTx(null);
    setEditingGoal(goal);
    setActiveModal('goal');
  };

  const handleCustomDepositSubmit = (e: FormEvent, goalId: string) => {
    e.preventDefault();
    const val = Number(depositAmountInput);
    if (!Number.isNaN(val) && val > 0) {
      onContributeGoal(goalId, val);
    }
    setActiveDepositGoalId(null);
    setDepositAmountInput('');
  };

  const selectedMonthLabel = formatMonthKeyLabel(selectedMonth);
  const defaultTxDate =
    selectedMonth === currentMonthKey ? todayKey : `${selectedMonth}-15`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
            Personal Finance
          </h1>
          <p className="mt-1 text-sm text-[#58645B] tabular-nums">
            Fictional sample data · {monthlySummary.transactionCount}{' '}
            {monthlySummary.transactionCount === 1
              ? 'transaction'
              : 'transactions'}{' '}
            in {selectedMonthLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={openNewGoalModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#DDD8CD] bg-white text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
          >
            <PiggyBank className="w-4 h-4 text-[#5C7C66]" />
            <span>New goal</span>
          </button>
          <button
            type="button"
            onClick={openNewTransactionModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add transaction</span>
          </button>
        </div>
      </header>

      {/* Month Switcher & Monthly Summary Strip */}
      <section aria-label="Monthly financial summary" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-[#E5E1D8] px-5 py-3.5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedMonth((prev) => shiftMonthKey(prev, -1))
              }
              aria-label="Previous month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD8CD] bg-[#FBF9F4] text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-serif text-lg font-medium text-[#1C241E] min-w-[150px] text-center">
              {selectedMonthLabel}
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, 1))}
              aria-label="Next month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDD8CD] bg-[#FBF9F4] text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedMonth !== currentMonthKey && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="px-3 py-1.5 rounded-lg border border-[#DDD8CD] bg-[#FBF9F4] text-xs font-medium text-[#1E3F31] hover:bg-[#EEF4EF] transition-colors whitespace-nowrap"
              >
                Current month
              </button>
            )}
            <span className="text-xs text-[#58645B] tabular-nums">
              {goalsSummary.completedCount} of {savingsGoals.length} goals funded
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">
                Monthly income
              </span>
              <ArrowDownLeft
                className="w-4 h-4 text-[#1E3F31]"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1E3F31] tabular-nums">
              {formatCurrency(monthlySummary.income)}
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {incomeTxCount} {incomeTxCount === 1 ? 'deposit' : 'deposits'}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#58645B]">
                Monthly expenses
              </span>
              <ArrowUpRight
                className="w-4 h-4 text-[#58645B]"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {formatCurrency(monthlySummary.expenses)}
            </p>
            <p className="mt-1 text-xs text-[#58645B] tabular-nums">
              {expenseTxCount} {expenseTxCount === 1 ? 'outlay' : 'outlays'} across{' '}
              {categorySpending.length} categories
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <span className="text-sm font-medium text-[#58645B]">
              Net cash flow
            </span>
            <p
              className={`mt-2.5 font-serif text-3xl font-medium tabular-nums ${
                monthlySummary.netSavings >= 0
                  ? 'text-[#1E3F31]'
                  : 'text-[#B42318]'
              }`}
            >
              {monthlySummary.netSavings > 0 ? '+' : ''}
              {formatCurrency(monthlySummary.netSavings)}
            </p>
            <p className="mt-1 text-xs text-[#58645B]">
              {monthlySummary.netSavings >= 0
                ? 'Surplus retained this month'
                : 'Expenses exceeded income'}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <span className="text-sm font-medium text-[#58645B]">
              Savings rate
            </span>
            <p className="mt-2.5 font-serif text-3xl font-medium text-[#1C241E] tabular-nums">
              {monthlySummary.savingsRate}%
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#EFECE4] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1E3F31] transition-all duration-300"
                style={{
                  width: `${Math.min(100, monthlySummary.savingsRate)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Spending & Cash Flow Charts Row */}
      <section
        aria-label="Spending and cash flow charts"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        {/* 6-Month Cash Flow Grouped Bar Chart */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                6-month income vs. expenses
              </h2>
              <p className="text-xs text-[#58645B] mt-0.5">
                Click any month column to inspect its breakdown
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#58645B]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#1E3F31]" />
                <span>Income</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#8FA895]" />
                <span>Expenses</span>
              </span>
            </div>
          </div>

          <div
            className="mt-6 grid grid-cols-6 gap-1.5 sm:gap-3 items-end pt-2"
            role="group"
            aria-label="Six month income and expenses comparison chart"
          >
            {cashflowSeries.map((pt) => {
              const isSelected = pt.monthKey === selectedMonth;
              const incomeHeight =
                pt.income > 0
                  ? Math.max(8, Math.round((pt.income / maxCashflowValue) * 100))
                  : 2;
              const expenseHeight =
                pt.expenses > 0
                  ? Math.max(
                      8,
                      Math.round((pt.expenses / maxCashflowValue) * 100)
                    )
                  : 2;

              return (
                <button
                  key={pt.monthKey}
                  type="button"
                  onClick={() => setSelectedMonth(pt.monthKey)}
                  aria-pressed={isSelected}
                  title={`${formatMonthKeyLabel(pt.monthKey)}: Income ${formatCurrency(
                    pt.income
                  )}, Expenses ${formatCurrency(pt.expenses)}`}
                  className={`flex flex-col items-center justify-end gap-2 rounded-xl px-1 py-2 transition-colors ${
                    isSelected
                      ? 'bg-[#EEF4EF]'
                      : 'hover:bg-[#FAF8F3]'
                  }`}
                >
                  <div className="w-full h-36 sm:h-44 flex items-end justify-center gap-1 sm:gap-1.5 px-0.5">
                    <div
                      className={`w-3 sm:w-5 rounded-t-md transition-all duration-300 ${
                        pt.income > 0 ? 'bg-[#1E3F31]' : 'bg-[#E5E1D8]'
                      }`}
                      style={{ height: `${incomeHeight}%` }}
                    />
                    <div
                      className={`w-3 sm:w-5 rounded-t-md transition-all duration-300 ${
                        pt.expenses > 0 ? 'bg-[#8FA895]' : 'bg-[#E5E1D8]'
                      }`}
                      style={{ height: `${expenseHeight}%` }}
                    />
                  </div>
                  <div className="text-center leading-tight">
                    <span
                      className={`block text-xs ${
                        isSelected
                          ? 'font-semibold text-[#1E3F31]'
                          : 'font-medium text-[#58645B]'
                      }`}
                    >
                      {pt.shortLabel}
                    </span>
                    <span className="block font-mono text-[10px] text-[#7D8880] tabular-nums">
                      {pt.net >= 0 ? '+' : ''}
                      {formatCurrency(pt.net, { decimals: 0 })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Spending Breakdown Chart */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)] flex flex-col">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EFECE4]">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                Spending by category
              </h2>
              <p className="text-xs text-[#58645B] mt-0.5">
                {selectedMonthLabel} · click a category to filter
              </p>
            </div>
            {categoryFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap shrink-0"
              >
                Show all
              </button>
            )}
          </div>

          {categorySpending.length === 0 ? (
            <div className="py-10 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-[#1C241E]">
                No expenses logged in {selectedMonthLabel}
              </p>
              <p className="mt-1 text-xs text-[#58645B]">
                Add an expense transaction to visualize category spending.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 flex-1">
              {categorySpending.map((item, idx) => {
                const isSelected = categoryFilter === item.category;
                const barClass =
                  CATEGORY_BAR_SHADES[idx % CATEGORY_BAR_SHADES.length];
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev === item.category ? 'All' : item.category
                      )
                    }
                    aria-pressed={isSelected}
                    className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${
                      isSelected
                        ? 'bg-[#EEF4EF] ring-1 ring-[#7A9A83]'
                        : 'hover:bg-[#FAF8F3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#1C241E]">
                        {item.category}
                      </span>
                      <span className="font-mono tabular-nums text-[#58645B]">
                        {formatCurrency(item.amount)} · {item.percentage}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-[#EFECE4] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barClass}`}
                        style={{ width: `${Math.max(4, item.percentage)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Savings Goals Section */}
      <section aria-label="Savings goals" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#1C241E]">
              Savings goals
            </h2>
            <p className="text-xs text-[#58645B] mt-0.5 tabular-nums">
              {formatCurrency(goalsSummary.totalSaved)} saved toward{' '}
              {formatCurrency(goalsSummary.totalTarget)} total target (
              {goalsSummary.overallPercentage}%)
            </p>
          </div>
          <button
            type="button"
            onClick={openNewGoalModal}
            className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
          >
            + Add savings goal
          </button>
        </div>

        {savingsGoals.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E1D8] p-10 text-center shadow-[0_2px_12px_rgba(28,36,30,0.03)]">
            <p className="text-base font-medium text-[#1C241E]">
              No savings goals set yet
            </p>
            <p className="mt-1 text-sm text-[#58645B]">
              Create a goal to track progress toward an emergency reserve, trip, or milestone.
            </p>
            <button
              type="button"
              onClick={openNewGoalModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create goal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savingsGoals.map((goal) => {
              const pct =
                goal.targetAmount <= 0
                  ? 0
                  : Math.min(
                      100,
                      Math.round((goal.currentAmount / goal.targetAmount) * 100)
                    );
              const remaining = Math.max(
                0,
                goal.targetAmount - goal.currentAmount
              );
              const isCustomDepositOpen = activeDepositGoalId === goal.id;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl bg-white border border-[#E5E1D8] p-5 shadow-[0_2px_12px_rgba(28,36,30,0.03)] flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-[#58645B]">
                          {goal.category}
                          {goal.targetDate
                            ? ` · Target ${formatShortDateLabel(
                                goal.targetDate,
                                todayKey
                              )}`
                            : ''}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-[#1C241E] truncate">
                          {goal.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditGoalModal(goal)}
                          aria-label={`Edit goal "${goal.name}"`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGoal(goal.id)}
                          aria-label={`Delete goal "${goal.name}"`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between gap-2">
                      <span className="font-serif text-2xl font-medium text-[#1E3F31] tabular-nums">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                      <span className="font-mono text-xs text-[#58645B] tabular-nums">
                        of {formatCurrency(goal.targetAmount)} · {pct}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full rounded-full bg-[#EFECE4] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 100 ? 'bg-[#1E3F31]' : 'bg-[#5C7C66]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-[#58645B] tabular-nums">
                      {remaining === 0
                        ? 'Goal reached'
                        : `${formatCurrency(remaining)} remaining`}
                    </p>
                  </div>

                  {/* Quick Contribution Controls */}
                  <div className="pt-3 border-t border-[#EFECE4]">
                    {isCustomDepositOpen ? (
                      <form
                        onSubmit={(e) => handleCustomDepositSubmit(e, goal.id)}
                        className="flex items-center gap-2"
                      >
                        <label
                          htmlFor={`goal-deposit-${goal.id}`}
                          className="sr-only"
                        >
                          Deposit amount for {goal.name}
                        </label>
                        <input
                          id={`goal-deposit-${goal.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={depositAmountInput}
                          onChange={(e) =>
                            setDepositAmountInput(e.target.value)
                          }
                          placeholder="Amount ($)"
                          autoFocus
                          className="w-full min-w-0 rounded-lg border border-[#DDD8CD] bg-[#FBF9F4] px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24] whitespace-nowrap shrink-0"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDepositGoalId(null);
                            setDepositAmountInput('');
                          }}
                          aria-label="Cancel deposit"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#58645B] hover:bg-[#F3EFE6] shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onContributeGoal(goal.id, 50)}
                            aria-label={`Add $50 to "${goal.name}"`}
                            className="px-2.5 py-1 rounded-lg bg-[#FBF9F4] border border-[#DDD8CD] text-xs font-mono font-medium text-[#1C241E] hover:bg-[#EEF4EF] hover:border-[#7A9A83] transition-colors whitespace-nowrap"
                          >
                            +$50
                          </button>
                          <button
                            type="button"
                            onClick={() => onContributeGoal(goal.id, 100)}
                            aria-label={`Add $100 to "${goal.name}"`}
                            className="px-2.5 py-1 rounded-lg bg-[#FBF9F4] border border-[#DDD8CD] text-xs font-mono font-medium text-[#1C241E] hover:bg-[#EEF4EF] hover:border-[#7A9A83] transition-colors whitespace-nowrap"
                          >
                            +$100
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDepositGoalId(goal.id);
                            setDepositAmountInput('');
                          }}
                          className="text-xs font-medium text-[#1E3F31] hover:underline whitespace-nowrap"
                        >
                          Custom deposit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Transactions Ledger */}
      <section
        aria-label="Monthly transactions ledger"
        className="rounded-2xl bg-white border border-[#E5E1D8] overflow-hidden shadow-[0_2px_14px_rgba(28,36,30,0.03)]"
      >
        <div className="p-5 border-b border-[#EFECE4] bg-[#FAF8F3] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                Transactions
              </h2>
              <p className="text-xs text-[#58645B] mt-0.5 tabular-nums">
                {filteredTransactions.length}{' '}
                {filteredTransactions.length === 1
                  ? 'transaction'
                  : 'transactions'}{' '}
                shown for {selectedMonthLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EFECE4]"
                role="tablist"
                aria-label="Filter transactions by type"
              >
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: TransactionType.Income, label: 'Income' },
                    { id: TransactionType.Expense, label: 'Expenses' },
                  ] as const
                ).map((tab) => {
                  const active = typeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTypeFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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

              <label htmlFor="finance-category-filter" className="sr-only">
                Filter transactions by category
              </label>
              <select
                id="finance-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-[#DDD8CD] bg-white px-3 py-1.5 text-xs font-medium text-[#1C241E] focus:border-[#1E3F31] focus:outline-none"
              >
                {allCategoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All categories' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <label htmlFor="finance-search" className="sr-only">
              Search transactions
            </label>
            <Search
              className="w-4 h-4 text-[#6A786D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="finance-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions by description, category, or notes..."
              className="w-full rounded-xl border border-[#DDD8CD] bg-white pl-10 pr-9 py-2 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear transaction search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#EFECE4] hover:text-[#1C241E]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-[#1C241E]">
              No matching transactions in {selectedMonthLabel}
            </p>
            <p className="mt-1 text-sm text-[#58645B]">
              Try adjusting your filters or add a new income or expense entry.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {(typeFilter !== 'all' ||
                categoryFilter !== 'All' ||
                searchQuery.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setCategoryFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl border border-[#DDD8CD] bg-white text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={openNewTransactionModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E8EFE9] text-[#1E3F31] text-sm font-medium hover:bg-[#D8E5DA] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add transaction</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFECE4] bg-[#FCFBF8] text-xs font-semibold text-[#58645B]">
                    <th className="py-3 pl-6 pr-3">Date</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 pl-2 pr-6 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE8]">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === TransactionType.Income;
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-[#FCFBF8] transition-colors"
                      >
                        <td className="py-3.5 pl-6 pr-3 font-mono text-xs text-[#58645B] tabular-nums whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="text-sm font-medium text-[#1C241E]">
                            {tx.title}
                          </p>
                          {tx.notes && (
                            <p className="text-xs text-[#58645B] mt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-xs text-[#58645B] whitespace-nowrap">
                          {tx.category}
                        </td>
                        <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                          <span
                            className={
                              isIncome
                                ? 'font-medium text-[#1E3F31]'
                                : 'text-[#58645B]'
                            }
                          >
                            {isIncome ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-3 text-right font-mono text-sm font-medium tabular-nums whitespace-nowrap ${
                            isIncome ? 'text-[#1E3F31]' : 'text-[#1C241E]'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3.5 pl-2 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTransactionModal(tx)}
                              aria-label={`Edit transaction "${tx.title}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#1E3F31] transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx.id)}
                              aria-label={`Delete transaction "${tx.title}"`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6A786D] hover:bg-[#F3EFE6] hover:text-[#B42318] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-[#F2EFE8]">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === TransactionType.Income;
                return (
                  <div key={tx.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1C241E]">
                          {tx.title}
                        </p>
                        <p className="text-xs text-[#58645B] mt-0.5">
                          {tx.category} · {isIncome ? 'Income' : 'Expense'} ·{' '}
                          {tx.date}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                          isIncome ? 'text-[#1E3F31]' : 'text-[#1C241E]'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-xs text-[#58645B]">{tx.notes}</p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditTransactionModal(tx)}
                        aria-label={`Edit transaction "${tx.title}"`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDD8CD] text-xs font-medium text-[#1C241E]"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        aria-label={`Delete transaction "${tx.title}"`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DDD8CD] text-xs font-medium text-[#B42318]"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <FinanceModals
        activeModal={activeModal}
        editingTransaction={editingTx}
        editingGoal={editingGoal}
        defaultDate={defaultTxDate}
        onClose={() => {
          setActiveModal(null);
          setEditingTx(null);
          setEditingGoal(null);
        }}
        onAddTransaction={onAddTransaction}
        onUpdateTransaction={onUpdateTransaction}
        onAddGoal={onAddGoal}
        onUpdateGoal={onUpdateGoal}
      />
    </div>
  );
}
