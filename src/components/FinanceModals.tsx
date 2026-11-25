import { FormEvent, useEffect, useState } from 'react';
import {
  FinanceTransaction,
  SavingsGoal,
  TransactionType,
} from '../types/dayspace';
import { APP_CURRENCY_SYMBOL } from '../utils/currency';
import {
  EXPENSE_CATEGORIES,
  getTodayDateKey,
  INCOME_CATEGORIES,
} from '../utils/productivity';
import { ModalDialog } from './ModalDialog';

export type FinanceModalKind = 'transaction' | 'goal' | null;

export interface TransactionFormPayload {
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export interface GoalFormPayload {
  name: string;
  category: string;
  currentAmount: number;
  targetAmount: number;
  targetDate?: string;
}

interface FinanceModalsProps {
  activeModal: FinanceModalKind;
  editingTransaction: FinanceTransaction | null;
  editingGoal: SavingsGoal | null;
  defaultDate?: string;
  onClose: () => void;
  onAddTransaction: (input: TransactionFormPayload) => void;
  onUpdateTransaction: (id: string, updates: TransactionFormPayload) => void;
  onAddGoal: (input: GoalFormPayload) => void;
  onUpdateGoal: (id: string, updates: GoalFormPayload) => void;
}

export function FinanceModals({
  activeModal,
  editingTransaction,
  editingGoal,
  defaultDate,
  onClose,
  onAddTransaction,
  onUpdateTransaction,
  onAddGoal,
  onUpdateGoal,
}: FinanceModalsProps) {
  const today = getTodayDateKey();

  // Transaction state
  const [txType, setTxType] = useState<TransactionType>(TransactionType.Expense);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [txDate, setTxDate] = useState(today);
  const [txNotes, setTxNotes] = useState('');
  const [txError, setTxError] = useState('');

  // Savings goal state
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState('Safety Net');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalTarget, setGoalTarget] = useState('1000');
  const [goalDate, setGoalDate] = useState('');
  const [goalError, setGoalError] = useState('');

  useEffect(() => {
    if (activeModal === 'transaction') {
      if (editingTransaction) {
        setTxType(editingTransaction.type);
        setTxTitle(editingTransaction.title);
        setTxAmount(String(editingTransaction.amount));
        setTxCategory(editingTransaction.category);
        setTxDate(editingTransaction.date);
        setTxNotes(editingTransaction.notes || '');
      } else {
        setTxType(TransactionType.Expense);
        setTxTitle('');
        setTxAmount('');
        setTxCategory(EXPENSE_CATEGORIES[1]); // Groceries default
        setTxDate(defaultDate || today);
        setTxNotes('');
      }
      setTxError('');
    } else if (activeModal === 'goal') {
      if (editingGoal) {
        setGoalName(editingGoal.name);
        setGoalCategory(editingGoal.category);
        setGoalCurrent(String(editingGoal.currentAmount));
        setGoalTarget(String(editingGoal.targetAmount));
        setGoalDate(editingGoal.targetDate || '');
      } else {
        setGoalName('');
        setGoalCategory('Savings');
        setGoalCurrent('0');
        setGoalTarget('1500');
        setGoalDate('');
      }
      setGoalError('');
    }
  }, [activeModal, editingTransaction, editingGoal, defaultDate, today]);

  const availableCategories =
    txType === TransactionType.Income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeSwitch = (nextType: TransactionType) => {
    setTxType(nextType);
    const nextList =
      nextType === TransactionType.Income
        ? INCOME_CATEGORIES
        : EXPENSE_CATEGORIES;
    if (!(nextList as readonly string[]).includes(txCategory)) {
      setTxCategory(nextList[0]);
    }
  };

  const handleTxSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim()) {
      setTxError('Please enter a description for this transaction.');
      return;
    }
    const parsedAmount = Number(txAmount);
    if (!txAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxError('Please enter a valid amount greater than 0.');
      return;
    }
    const payload: TransactionFormPayload = {
      type: txType,
      title: txTitle.trim(),
      amount: parsedAmount,
      category: txCategory,
      date: txDate || today,
      notes: txNotes.trim() || undefined,
    };

    if (editingTransaction) {
      onUpdateTransaction(editingTransaction.id, payload);
    } else {
      onAddTransaction(payload);
    }
    onClose();
  };

  const handleGoalSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) {
      setGoalError('Please enter a name for your savings goal.');
      return;
    }
    const parsedCurrent = Number(goalCurrent);
    const parsedTarget = Number(goalTarget);
    if (Number.isNaN(parsedCurrent) || parsedCurrent < 0) {
      setGoalError('Current saved amount must be 0 or higher.');
      return;
    }
    if (Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      setGoalError('Target amount must be greater than 0.');
      return;
    }
    const payload: GoalFormPayload = {
      name: goalName.trim(),
      category: goalCategory.trim() || 'Savings',
      currentAmount: parsedCurrent,
      targetAmount: parsedTarget,
      targetDate: goalDate || undefined,
    };
    if (editingGoal) {
      onUpdateGoal(editingGoal.id, payload);
    } else {
      onAddGoal(payload);
    }
    onClose();
  };

  return (
    <>
      <ModalDialog
        isOpen={activeModal === 'transaction'}
        title={editingTransaction ? 'Edit transaction' : 'Add transaction'}
        description={
          editingTransaction
            ? 'Adjust amount, category, or date.'
            : 'Record fictional income or expenses in your monthly ledger.'
        }
        onClose={onClose}
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-[#1C241E] mb-1.5">
              Transaction type
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EFECE4]">
              <button
                type="button"
                onClick={() => handleTypeSwitch(TransactionType.Expense)}
                aria-pressed={txType === TransactionType.Expense}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  txType === TransactionType.Expense
                    ? 'bg-white text-[#1C241E] shadow-xs'
                    : 'text-[#58645B] hover:text-[#1C241E]'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeSwitch(TransactionType.Income)}
                aria-pressed={txType === TransactionType.Income}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  txType === TransactionType.Income
                    ? 'bg-[#1E3F31] text-white shadow-xs'
                    : 'text-[#58645B] hover:text-[#1C241E]'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="finance-tx-title"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Description
            </label>
            <input
              id="finance-tx-title"
              type="text"
              value={txTitle}
              onChange={(e) => {
                setTxTitle(e.target.value);
                if (txError) setTxError('');
              }}
              placeholder={
                txType === TransactionType.Income
                  ? 'e.g. Monthly consulting deposit'
                  : 'e.g. Neighborhood market groceries'
              }
              autoFocus
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="finance-tx-amount"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Amount ({APP_CURRENCY_SYMBOL})
              </label>
              <input
                id="finance-tx-amount"
                type="number"
                min="0.01"
                step="any"
                value={txAmount}
                onChange={(e) => {
                  setTxAmount(e.target.value);
                  if (txError) setTxError('');
                }}
                placeholder="0"
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="finance-tx-date"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Date
              </label>
              <input
                id="finance-tx-date"
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="finance-tx-category"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Category
            </label>
            <select
              id="finance-tx-category"
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="finance-tx-notes"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Notes (optional)
            </label>
            <input
              id="finance-tx-notes"
              type="text"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Optional reference or memo..."
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          {txError && (
            <p role="alert" className="text-xs text-[#B42318]">
              {txError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#58645B] rounded-xl hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
            >
              {editingTransaction ? 'Update transaction' : 'Save transaction'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        isOpen={activeModal === 'goal'}
        title={editingGoal ? 'Edit savings goal' : 'Create savings goal'}
        description={
          editingGoal
            ? 'Adjust target amount, saved balance, or timeline.'
            : 'Set a clear target for an upcoming milestone or reserve.'
        }
        onClose={onClose}
      >
        <form onSubmit={handleGoalSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="finance-goal-name"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Goal name
            </label>
            <input
              id="finance-goal-name"
              type="text"
              value={goalName}
              onChange={(e) => {
                setGoalName(e.target.value);
                if (goalError) setGoalError('');
              }}
              placeholder="e.g. Summer coastal getaway"
              autoFocus
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="finance-goal-category"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Category
              </label>
              <select
                id="finance-goal-category"
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                <option value="Safety Net">Safety Net</option>
                <option value="Savings">Savings</option>
                <option value="Travel">Travel</option>
                <option value="Workspace">Workspace</option>
                <option value="Home">Home</option>
                <option value="Education">Education</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="finance-goal-date"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Target date (optional)
              </label>
              <input
                id="finance-goal-date"
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="finance-goal-current"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Saved so far ({APP_CURRENCY_SYMBOL})
              </label>
              <input
                id="finance-goal-current"
                type="number"
                min="0"
                step="any"
                value={goalCurrent}
                onChange={(e) => {
                  setGoalCurrent(e.target.value);
                  if (goalError) setGoalError('');
                }}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="finance-goal-target"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Target amount ({APP_CURRENCY_SYMBOL})
              </label>
              <input
                id="finance-goal-target"
                type="number"
                min="1"
                step="any"
                value={goalTarget}
                onChange={(e) => {
                  setGoalTarget(e.target.value);
                  if (goalError) setGoalError('');
                }}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {goalError && (
            <p role="alert" className="text-xs text-[#B42318]">
              {goalError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#58645B] rounded-xl hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
            >
              {editingGoal ? 'Update goal' : 'Create goal'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}
