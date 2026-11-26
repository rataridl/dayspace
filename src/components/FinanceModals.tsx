import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';
import {
  DigitalWallet,
  FinanceTransaction,
  SavingsGoal,
  TransactionType,
  WalletIcon,
  WalletType,
} from '../types/dayspace';
import { APP_CURRENCY_SYMBOL, formatCurrency } from '../utils/currency';
import {
  EXPENSE_CATEGORIES,
  getTodayDateKey,
  INCOME_CATEGORIES,
} from '../utils/productivity';
import {
  createSampleCsvContent,
  parseTransactionsCsv,
  TRANSFER_CATEGORY,
  WALLET_COLOR_PRESETS,
  WALLET_ICON_OPTIONS,
  WALLET_TYPE_META,
  WALLET_TYPE_ORDER,
} from '../utils/wallets';
import { ModalDialog } from './ModalDialog';
import { WalletIconGlyph } from './WalletIconGlyph';

export type FinanceModalKind = 'transaction' | 'goal' | 'wallet' | 'csv' | null;

export interface TransactionFormPayload {
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string;
  walletId?: string;
  destinationWalletId?: string;
  notes?: string;
}

export interface WalletFormPayload {
  name: string;
  type: WalletType;
  balance: number;
  notes?: string;
  color: string;
  icon: WalletIcon;
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
  initialTransactionType?: TransactionType;
  wallets: DigitalWallet[];
  transactions: FinanceTransaction[];
  editingWallet: DigitalWallet | null;
  editingTransaction: FinanceTransaction | null;
  editingGoal: SavingsGoal | null;
  defaultDate?: string;
  defaultWalletId?: string;
  onClose: () => void;
  onAddWallet: (input: WalletFormPayload) => void;
  onUpdateWallet: (id: string, updates: WalletFormPayload) => void;
  onAddTransaction: (input: TransactionFormPayload) => void;
  onUpdateTransaction: (id: string, updates: TransactionFormPayload) => void;
  onImportTransactionsCsv: (transactions: FinanceTransaction[]) => void;
  onAddGoal: (input: GoalFormPayload) => void;
  onUpdateGoal: (id: string, updates: GoalFormPayload) => void;
}

export function FinanceModals({
  activeModal,
  initialTransactionType,
  wallets,
  transactions,
  editingWallet,
  editingTransaction,
  editingGoal,
  defaultDate,
  defaultWalletId,
  onClose,
  onAddWallet,
  onUpdateWallet,
  onAddTransaction,
  onUpdateTransaction,
  onImportTransactionsCsv,
  onAddGoal,
  onUpdateGoal,
}: FinanceModalsProps) {
  const today = getTodayDateKey();

  // Wallet state
  const [walletType, setWalletType] = useState<WalletType>(WalletType.Dana);
  const [walletName, setWalletName] = useState('DANA');
  const [walletNameTouched, setWalletNameTouched] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0');
  const [walletColor, setWalletColor] = useState(
    WALLET_TYPE_META[WalletType.Dana].defaultColor
  );
  const [walletIcon, setWalletIcon] = useState<WalletIcon>(
    WALLET_TYPE_META[WalletType.Dana].defaultIcon
  );
  const [walletNotes, setWalletNotes] = useState('');
  const [walletError, setWalletError] = useState('');

  // Transaction state
  const [txType, setTxType] = useState<TransactionType>(TransactionType.Expense);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [txDate, setTxDate] = useState(today);
  const [txWalletId, setTxWalletId] = useState('');
  const [txDestWalletId, setTxDestWalletId] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txError, setTxError] = useState('');

  // Savings goal state
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState('Safety Net');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalTarget, setGoalTarget] = useState('1000000');
  const [goalDate, setGoalDate] = useState('');
  const [goalError, setGoalError] = useState('');

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [csvDefaultWalletId, setCsvDefaultWalletId] = useState('');
  const [csvError, setCsvError] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeModal === 'wallet') {
      if (editingWallet) {
        setWalletType(editingWallet.type);
        setWalletName(editingWallet.name);
        setWalletNameTouched(true);
        setWalletBalance(String(editingWallet.balance));
        setWalletColor(editingWallet.color);
        setWalletIcon(editingWallet.icon);
        setWalletNotes(editingWallet.notes || '');
      } else {
        const preset = WALLET_TYPE_META[WalletType.Dana];
        setWalletType(WalletType.Dana);
        setWalletName(preset.defaultName);
        setWalletNameTouched(false);
        setWalletBalance('0');
        setWalletColor(preset.defaultColor);
        setWalletIcon(preset.defaultIcon);
        setWalletNotes('');
      }
      setWalletError('');
    } else if (activeModal === 'transaction') {
      const firstWalletId = defaultWalletId || wallets[0]?.id || '';
      const secondWalletId =
        wallets.find((w) => w.id !== firstWalletId)?.id || '';

      if (editingTransaction) {
        setTxType(editingTransaction.type);
        setTxTitle(editingTransaction.title);
        setTxAmount(String(editingTransaction.amount));
        setTxCategory(editingTransaction.category);
        setTxDate(editingTransaction.date);
        setTxWalletId(editingTransaction.walletId || firstWalletId);
        setTxDestWalletId(
          editingTransaction.destinationWalletId || secondWalletId
        );
        setTxNotes(editingTransaction.notes || '');
      } else {
        const nextType = initialTransactionType || TransactionType.Expense;
        setTxType(nextType);
        setTxTitle('');
        setTxAmount('');
        setTxCategory(
          nextType === TransactionType.Transfer
            ? TRANSFER_CATEGORY
            : nextType === TransactionType.Income
            ? INCOME_CATEGORIES[0]
            : EXPENSE_CATEGORIES[1]
        );
        setTxDate(defaultDate || today);
        setTxWalletId(firstWalletId);
        setTxDestWalletId(secondWalletId);
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
        setGoalTarget('1500000');
        setGoalDate('');
      }
      setGoalError('');
    } else if (activeModal === 'csv') {
      setCsvText('');
      setCsvDefaultWalletId(defaultWalletId || wallets[0]?.id || '');
      setCsvError('');
    }
  }, [
    activeModal,
    initialTransactionType,
    editingWallet,
    editingTransaction,
    editingGoal,
    defaultDate,
    defaultWalletId,
    today,
    wallets,
  ]);

  const availableCategories =
    txType === TransactionType.Income
      ? INCOME_CATEGORIES
      : txType === TransactionType.Transfer
      ? ([TRANSFER_CATEGORY, 'Top Up', 'Savings', 'Other'] as const)
      : EXPENSE_CATEGORIES;

  const handleWalletTypeSelect = (nextType: WalletType) => {
    setWalletType(nextType);
    const preset = WALLET_TYPE_META[nextType];
    if (!editingWallet && !walletNameTouched) {
      setWalletName(preset.defaultName);
    }
    setWalletColor(preset.defaultColor);
    setWalletIcon(preset.defaultIcon);
  };

  const handleWalletSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) {
      setWalletError('Please enter a name for this wallet.');
      return;
    }
    const parsedBalance = Number(walletBalance);
    if (walletBalance === '' || Number.isNaN(parsedBalance)) {
      setWalletError('Please enter a valid numeric balance (0 or higher).');
      return;
    }

    const payload: WalletFormPayload = {
      name: walletName.trim(),
      type: walletType,
      balance: parsedBalance,
      notes: walletNotes.trim() || undefined,
      color: walletColor,
      icon: walletIcon,
    };

    if (editingWallet) {
      onUpdateWallet(editingWallet.id, payload);
    } else {
      onAddWallet(payload);
    }
    onClose();
  };

  const handleTypeSwitch = (nextType: TransactionType) => {
    setTxType(nextType);
    setTxError('');
    const nextList: readonly string[] =
      nextType === TransactionType.Income
        ? INCOME_CATEGORIES
        : nextType === TransactionType.Transfer
        ? [TRANSFER_CATEGORY, 'Top Up', 'Savings', 'Other']
        : EXPENSE_CATEGORIES;
    if (!nextList.includes(txCategory)) {
      setTxCategory(nextList[0]);
    }
    if (nextType === TransactionType.Transfer && wallets.length >= 2) {
      const source = txWalletId || wallets[0].id;
      setTxWalletId(source);
      if (!txDestWalletId || txDestWalletId === source) {
        const alt = wallets.find((w) => w.id !== source);
        if (alt) setTxDestWalletId(alt.id);
      }
    }
  };

  const handleTxSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(txAmount);
    if (!txAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxError('Please enter a valid amount greater than 0.');
      return;
    }

    if (txType === TransactionType.Transfer) {
      if (wallets.length < 2) {
        setTxError('Create at least two wallets to transfer money between them.');
        return;
      }
      if (!txWalletId || !txDestWalletId) {
        setTxError('Select both source and destination wallets.');
        return;
      }
      if (txWalletId === txDestWalletId) {
        setTxError('Source and destination wallets must be different.');
        return;
      }
    }

    const sourceWalletName = wallets.find((w) => w.id === txWalletId)?.name;
    const destWalletName = wallets.find((w) => w.id === txDestWalletId)?.name;
    const resolvedTitle =
      txTitle.trim() ||
      (txType === TransactionType.Transfer && sourceWalletName && destWalletName
        ? `Transfer ${sourceWalletName} to ${destWalletName}`
        : '');

    if (!resolvedTitle) {
      setTxError('Please enter a description for this transaction.');
      return;
    }

    const payload: TransactionFormPayload = {
      type: txType,
      title: resolvedTitle,
      amount: parsedAmount,
      category: txCategory,
      date: txDate || today,
      walletId: txWalletId || undefined,
      destinationWalletId:
        txType === TransactionType.Transfer ? txDestWalletId : undefined,
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

  const csvPreview = useMemo(() => {
    if (activeModal !== 'csv' || !csvText.trim()) return null;
    return parseTransactionsCsv(
      csvText,
      wallets,
      csvDefaultWalletId || wallets[0]?.id,
      transactions,
      defaultDate || today
    );
  }, [activeModal, csvText, wallets, csvDefaultWalletId, transactions, defaultDate, today]);

  const handleCsvFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const content = await file.text();
      setCsvText(content);
      setCsvError('');
    } catch {
      setCsvError('Could not read the selected CSV file.');
    }
  };

  const handleDownloadSampleCsv = () => {
    const csv = createSampleCsvContent(wallets, defaultDate || today);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dayspace-transactions-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmCsvImport = () => {
    if (!csvPreview || csvPreview.transactions.length === 0) {
      setCsvError(
        csvPreview?.errors[0]?.message ||
          'Paste or upload valid CSV rows before importing.'
      );
      return;
    }
    onImportTransactionsCsv(csvPreview.transactions);
    onClose();
  };

  return (
    <>
      {/* Add / Edit Digital Wallet Modal */}
      <ModalDialog
        isOpen={activeModal === 'wallet'}
        title={editingWallet ? 'Edit wallet' : 'Add digital wallet'}
        description={
          editingWallet
            ? 'Update wallet name, type, balance, appearance, or notes.'
            : 'Track balances across DANA, GoPay, OVO, ShopeePay, LinkAja, bank accounts, or cash.'
        }
        onClose={onClose}
      >
        <form onSubmit={handleWalletSubmit} className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-[#1C241E] mb-1.5">
              Wallet type
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {WALLET_TYPE_ORDER.map((typeKey) => {
                const meta = WALLET_TYPE_META[typeKey];
                const selected = walletType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => handleWalletTypeSelect(typeKey)}
                    aria-pressed={selected}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap truncate ${
                      selected
                        ? 'bg-[#EEF4EF] border-[#1E3F31] text-[#1E3F31]'
                        : 'bg-[#FBF9F4] border-[#DDD8CD] text-[#4B574E] hover:border-[#7A9A83]'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="wallet-name-input"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Wallet name
              </label>
              <input
                id="wallet-name-input"
                type="text"
                value={walletName}
                onChange={(e) => {
                  setWalletName(e.target.value);
                  setWalletNameTouched(true);
                  if (walletError) setWalletError('');
                }}
                placeholder="e.g. DANA Daily, BCA Main"
                autoFocus
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="wallet-balance-input"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Current balance ({APP_CURRENCY_SYMBOL})
              </label>
              <input
                id="wallet-balance-input"
                type="number"
                step="any"
                value={walletBalance}
                onChange={(e) => {
                  setWalletBalance(e.target.value);
                  if (walletError) setWalletError('');
                }}
                placeholder="0"
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium text-[#1C241E] mb-1.5">
                Accent color
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {WALLET_COLOR_PRESETS.map((preset) => {
                  const selected =
                    walletColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setWalletColor(preset.hex)}
                      aria-label={`Select color ${preset.label}`}
                      aria-pressed={selected}
                      className={`h-7 w-7 rounded-lg transition-transform ${
                        selected
                          ? 'ring-2 ring-offset-2 ring-[#1E3F31] scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-[#1C241E] mb-1.5">
                Icon
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {WALLET_ICON_OPTIONS.map((opt) => {
                  const selected = walletIcon === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWalletIcon(opt.id)}
                      aria-label={`Select icon ${opt.label}`}
                      aria-pressed={selected}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                        selected
                          ? 'bg-[#1E3F31] border-[#1E3F31] text-white'
                          : 'bg-[#FBF9F4] border-[#DDD8CD] text-[#4B574E] hover:border-[#7A9A83]'
                      }`}
                    >
                      <WalletIconGlyph icon={opt.id} className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="wallet-notes-input"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Notes (optional)
            </label>
            <input
              id="wallet-notes-input"
              type="text"
              value={walletNotes}
              onChange={(e) => setWalletNotes(e.target.value)}
              placeholder="e.g. Daily QRIS & transport budget (never store PINs or OTPs)"
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] placeholder:text-[#7D8880] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          {walletError && (
            <p role="alert" className="text-xs text-[#B42318]">
              {walletError}
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
              {editingWallet ? 'Update wallet' : 'Save wallet'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Add / Edit Transaction (Income, Expense, or Wallet Transfer) Modal */}
      <ModalDialog
        isOpen={activeModal === 'transaction'}
        title={editingTransaction ? 'Edit transaction' : 'Add transaction'}
        description={
          editingTransaction
            ? 'Adjust amount, wallet, category, or date.'
            : 'Record manual income, expenses, or transfers between wallets.'
        }
        onClose={onClose}
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-[#1C241E] mb-1.5">
              Transaction type
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#EFECE4]">
              <button
                type="button"
                onClick={() => handleTypeSwitch(TransactionType.Expense)}
                aria-pressed={txType === TransactionType.Expense}
                className={`py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
                className={`py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  txType === TransactionType.Income
                    ? 'bg-[#1E3F31] text-white shadow-xs'
                    : 'text-[#58645B] hover:text-[#1C241E]'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeSwitch(TransactionType.Transfer)}
                aria-pressed={txType === TransactionType.Transfer}
                className={`py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  txType === TransactionType.Transfer
                    ? 'bg-[#2E6F95] text-white shadow-xs'
                    : 'text-[#58645B] hover:text-[#1C241E]'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {txType === TransactionType.Transfer ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="finance-tx-source-wallet"
                  className="block text-sm font-medium text-[#1C241E] mb-1.5"
                >
                  From wallet
                </label>
                <select
                  id="finance-tx-source-wallet"
                  value={txWalletId}
                  onChange={(e) => {
                    setTxWalletId(e.target.value);
                    if (txError) setTxError('');
                  }}
                  className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                >
                  {wallets.length === 0 ? (
                    <option value="">No wallets yet</option>
                  ) : (
                    wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="finance-tx-dest-wallet"
                  className="block text-sm font-medium text-[#1C241E] mb-1.5"
                >
                  To wallet
                </label>
                <select
                  id="finance-tx-dest-wallet"
                  value={txDestWalletId}
                  onChange={(e) => {
                    setTxDestWalletId(e.target.value);
                    if (txError) setTxError('');
                  }}
                  className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                >
                  {wallets.length < 2 ? (
                    <option value="">Need 2+ wallets</option>
                  ) : (
                    wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatCurrency(w.balance)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="finance-tx-wallet"
                className="block text-sm font-medium text-[#1C241E] mb-1.5"
              >
                Wallet
              </label>
              <select
                id="finance-tx-wallet"
                value={txWalletId}
                onChange={(e) => setTxWalletId(e.target.value)}
                className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
              >
                <option value="">Unassigned (no wallet balance change)</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatCurrency(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

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
                txType === TransactionType.Transfer
                  ? 'e.g. Top up DANA for weekly groceries'
                  : txType === TransactionType.Income
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
              {editingTransaction
                ? 'Update transaction'
                : txType === TransactionType.Transfer
                ? 'Confirm transfer'
                : 'Save transaction'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* CSV Import Modal */}
      <ModalDialog
        isOpen={activeModal === 'csv'}
        title="Import transactions via CSV"
        description="Upload or paste manual transaction records. Duplicate entries are automatically skipped."
        onClose={onClose}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-[#F4F8F4] border border-[#DCE5DC] p-3 flex items-start gap-2.5 text-xs text-[#2D5A43]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Manual entry &amp; CSV import only — DAYSPACE stays offline-first
              and never requests wallet PINs, OTPs, passwords, or bank
              credentials.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-xs font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-[#5C7C66]" />
                <span>Choose CSV file</span>
              </button>
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                aria-label="Upload CSV transactions file"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DDD8CD] bg-white text-xs font-medium text-[#58645B] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample CSV</span>
              </button>
            </div>

            {wallets.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="csv-default-wallet"
                  className="text-xs font-medium text-[#58645B]"
                >
                  Fallback wallet:
                </label>
                <select
                  id="csv-default-wallet"
                  value={csvDefaultWalletId}
                  onChange={(e) => setCsvDefaultWalletId(e.target.value)}
                  className="rounded-lg border border-[#DDD8CD] bg-white px-2.5 py-1.5 text-xs text-[#1C241E] focus:border-[#1E3F31] focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="csv-raw-textarea"
              className="block text-xs font-medium text-[#58645B] mb-1.5"
            >
              Columns: date, type, description, amount, category, wallet,
              destination_wallet, notes
            </label>
            <textarea
              id="csv-raw-textarea"
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                if (csvError) setCsvError('');
              }}
              placeholder={
                'date,type,description,amount,category,wallet,destination_wallet,notes\n2026-11-26,expense,Coffee,35000,Dining,GoPay,,Morning latte'
              }
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2.5 text-xs font-mono text-[#1C241E] placeholder:text-[#8E9890] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          {csvPreview && (
            <div className="rounded-xl border border-[#E5E1D8] bg-[#FAF8F3] p-3 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 font-medium text-[#1C241E]">
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#5C7C66]" />
                  <span>
                    {csvPreview.transactions.length} ready to import
                  </span>
                </span>
                <span className="text-[#58645B] tabular-nums">
                  {csvPreview.skippedDuplicates} duplicates skipped ·{' '}
                  {csvPreview.errors.length} errors
                </span>
              </div>

              {csvPreview.errors.length > 0 && (
                <ul className="space-y-1 text-[#B42318]">
                  {csvPreview.errors.slice(0, 3).map((err) => (
                    <li key={err.lineNumber}>
                      Line {err.lineNumber}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {csvError && (
            <p role="alert" className="text-xs text-[#B42318]">
              {csvError}
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
              type="button"
              onClick={handleConfirmCsvImport}
              disabled={!csvPreview || csvPreview.transactions.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-[#1E3F31] rounded-xl hover:bg-[#152E24] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              Import{' '}
              {csvPreview?.transactions.length
                ? `${csvPreview.transactions.length} transactions`
                : 'CSV'}
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Savings Goal Modal */}
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
