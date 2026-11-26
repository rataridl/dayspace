import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DigitalWallet,
  FinanceTransaction,
  TransactionType,
  WalletType,
} from '../types/dayspace';
import {
  computeMonthlyFinanceSummary,
  filterTransactions,
} from './productivity';
import {
  applyTransactionBalanceDelta,
  buildTransactionSignature,
  computeTotalWalletBalance,
  createSampleCsvContent,
  deduplicateTransactions,
  parseTransactionsCsv,
  reconcileWalletsForTransactionChange,
} from './wallets';

function createSampleWallets(): DigitalWallet[] {
  return [
    {
      id: 'w-bank',
      name: 'BCA Main',
      type: WalletType.Bank,
      balance: 10_000_000,
      color: '#1E3F31',
      icon: 'landmark',
      notes: 'Primary account',
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 'w-dana',
      name: 'DANA',
      type: WalletType.Dana,
      balance: 500_000,
      color: '#2E6F95',
      icon: 'smartphone',
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 'w-gopay',
      name: 'GoPay',
      type: WalletType.GoPay,
      balance: 300_000,
      color: '#2D6A4F',
      icon: 'smartphone',
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
    },
  ];
}

test('computeTotalWalletBalance sums valid wallet balances accurately', () => {
  const wallets = createSampleWallets();
  assert.equal(computeTotalWalletBalance(wallets), 10_800_000);
  assert.equal(computeTotalWalletBalance([]), 0);
});

test('applyTransactionBalanceDelta updates and reverts income, expense, and transfers cleanly', () => {
  const initial = createSampleWallets();

  // Income adds to selected wallet
  const incomeTx: FinanceTransaction = {
    id: 'tx-1',
    type: TransactionType.Income,
    title: 'Client invoice',
    amount: 2_000_000,
    category: 'Freelance',
    date: '2026-11-25',
    walletId: 'w-bank',
    createdAt: '2026-11-25T09:00:00Z',
  };
  const afterIncome = applyTransactionBalanceDelta(initial, incomeTx, 1);
  assert.equal(afterIncome.find((w) => w.id === 'w-bank')?.balance, 12_000_000);
  assert.equal(computeTotalWalletBalance(afterIncome), 12_800_000);

  // Expense deducts from selected wallet
  const expenseTx: FinanceTransaction = {
    id: 'tx-2',
    type: TransactionType.Expense,
    title: 'Coffee & lunch',
    amount: 150_000,
    category: 'Dining',
    date: '2026-11-25',
    walletId: 'w-dana',
    createdAt: '2026-11-25T12:00:00Z',
  };
  const afterExpense = applyTransactionBalanceDelta(afterIncome, expenseTx, 1);
  assert.equal(afterExpense.find((w) => w.id === 'w-dana')?.balance, 350_000);
  assert.equal(computeTotalWalletBalance(afterExpense), 12_650_000);

  // Transfer deducts source wallet and adds to destination wallet while preserving total balance
  const transferTx: FinanceTransaction = {
    id: 'tx-3',
    type: TransactionType.Transfer,
    title: 'Top up GoPay',
    amount: 400_000,
    category: 'Transfer',
    date: '2026-11-25',
    walletId: 'w-bank',
    destinationWalletId: 'w-gopay',
    createdAt: '2026-11-25T13:00:00Z',
  };
  const afterTransfer = applyTransactionBalanceDelta(afterExpense, transferTx, 1);
  assert.equal(afterTransfer.find((w) => w.id === 'w-bank')?.balance, 11_600_000);
  assert.equal(afterTransfer.find((w) => w.id === 'w-gopay')?.balance, 700_000);
  assert.equal(computeTotalWalletBalance(afterTransfer), 12_650_000);

  // Reverting transfer (e.g., on transaction delete) restores exact balances
  const afterRevertTransfer = applyTransactionBalanceDelta(
    afterTransfer,
    transferTx,
    -1
  );
  assert.equal(
    afterRevertTransfer.find((w) => w.id === 'w-bank')?.balance,
    12_000_000
  );
  assert.equal(
    afterRevertTransfer.find((w) => w.id === 'w-gopay')?.balance,
    300_000
  );
});

test('reconcileWalletsForTransactionChange updates balances across edits', () => {
  const wallets = createSampleWallets();
  const originalTx: FinanceTransaction = {
    id: 'tx-edit',
    type: TransactionType.Expense,
    title: 'Groceries',
    amount: 200_000,
    category: 'Groceries',
    date: '2026-11-25',
    walletId: 'w-dana',
    createdAt: '2026-11-25T10:00:00Z',
  };
  const withOriginalApplied = applyTransactionBalanceDelta(
    wallets,
    originalTx,
    1
  );
  assert.equal(
    withOriginalApplied.find((w) => w.id === 'w-dana')?.balance,
    300_000
  );

  // Edit transaction: change amount to 100_000 and switch wallet to w-gopay
  const updatedTx: FinanceTransaction = {
    ...originalTx,
    amount: 100_000,
    walletId: 'w-gopay',
  };
  const reconciled = reconcileWalletsForTransactionChange(
    withOriginalApplied,
    originalTx,
    updatedTx
  );
  assert.equal(reconciled.find((w) => w.id === 'w-dana')?.balance, 500_000);
  assert.equal(reconciled.find((w) => w.id === 'w-gopay')?.balance, 200_000);
  assert.equal(computeTotalWalletBalance(reconciled), 10_700_000);
});

test('computeMonthlyFinanceSummary excludes transfers and filterTransactions supports wallet, date, and search filters', () => {
  const wallets = createSampleWallets();
  const walletNamesById = Object.fromEntries(wallets.map((w) => [w.id, w.name]));

  const transactions: FinanceTransaction[] = [
    {
      id: 'f1',
      type: TransactionType.Income,
      title: 'Monthly salary',
      amount: 8_000_000,
      category: 'Salary',
      date: '2026-11-01',
      walletId: 'w-bank',
      createdAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 'f2',
      type: TransactionType.Expense,
      title: 'Electricity bill',
      amount: 450_000,
      category: 'Utilities',
      date: '2026-11-12',
      walletId: 'w-dana',
      createdAt: '2026-11-12T08:00:00Z',
    },
    {
      id: 'f3',
      type: TransactionType.Transfer,
      title: 'Top up DANA',
      amount: 1_000_000,
      category: 'Transfer',
      date: '2026-11-12',
      walletId: 'w-bank',
      destinationWalletId: 'w-dana',
      createdAt: '2026-11-12T09:00:00Z',
    },
  ];

  // Transfer should NOT distort monthly income or expenses
  const summary = computeMonthlyFinanceSummary(transactions, '2026-11');
  assert.equal(summary.income, 8_000_000);
  assert.equal(summary.expenses, 450_000);
  assert.equal(summary.netSavings, 7_550_000);
  assert.equal(summary.transactionCount, 3);

  // Filtering by destination wallet matches transfers arriving in that wallet
  const danaActivity = filterTransactions(
    transactions,
    '2026-11',
    'all',
    'All',
    '',
    'w-dana',
    '',
    walletNamesById
  );
  assert.equal(danaActivity.length, 2);
  assert.deepEqual(
    danaActivity.map((tx) => tx.id),
    ['f3', 'f2']
  );

  // Date filter
  const nov12Only = filterTransactions(
    transactions,
    'all',
    'all',
    'All',
    '',
    'all',
    '2026-11-12',
    walletNamesById
  );
  assert.equal(nov12Only.length, 2);

  // Search by wallet name
  const bankSearch = filterTransactions(
    transactions,
    '2026-11',
    'all',
    'All',
    'BCA Main',
    'all',
    '',
    walletNamesById
  );
  assert.equal(bankSearch.length, 2);
});

test('deduplicateTransactions removes duplicate IDs and optional content signatures', () => {
  const t1: FinanceTransaction = {
    id: 'a1',
    type: TransactionType.Expense,
    title: 'Coffee',
    amount: 35_000,
    category: 'Dining',
    date: '2026-11-25',
    walletId: 'w-dana',
    createdAt: '2026-11-25T09:00:00Z',
  };
  const sameId: FinanceTransaction = { ...t1, title: 'Coffee updated' };
  const differentIdSameSig: FinanceTransaction = {
    ...t1,
    id: 'a2',
    title: '  coffee  ',
  };

  assert.equal(
    buildTransactionSignature(t1),
    buildTransactionSignature(differentIdSameSig)
  );
  assert.equal(deduplicateTransactions([t1, sameId, differentIdSameSig]).length, 2);
  assert.equal(
    deduplicateTransactions([t1, sameId, differentIdSameSig], {
      deduplicateBySignature: true,
    }).length,
    1
  );
});

test('parseTransactionsCsv validates rows, handles Indonesian numbers, neutralizes formulas, skips duplicates, and reports errors', () => {
  const wallets = createSampleWallets();
  const existing: FinanceTransaction[] = [
    {
      id: 'existing-1',
      type: TransactionType.Expense,
      title: 'Morning coffee & pastry',
      amount: 45_000,
      category: 'Dining',
      date: '2026-11-26',
      walletId: 'w-dana',
      createdAt: '2026-11-26T08:00:00Z',
    },
  ];

  const csv = [
    'date,type,description,amount,category,wallet,destination_wallet,notes',
    '2026-11-26,expense,Morning coffee & pastry,45000,Dining,DANA,,Duplicate row',
    '2026-11-26,income,=Bonus payment,Rp1.500.000,Freelance,BCA Main,,Clean note',
    '26/11/2026,transfer,"Transfer to, GoPay",250.000,Transfer,BCA Main,GoPay,Top up',
    'bad-date,expense,Invalid row,50000,Dining,DANA,,Bad date',
    '2026-11-26,transfer,Self transfer,100000,Transfer,DANA,DANA,Invalid same wallet',
  ].join('\n');

  const result = parseTransactionsCsv(
    csv,
    wallets,
    'w-bank',
    existing,
    '2026-11-26'
  );

  assert.equal(result.skippedDuplicates, 1);
  assert.equal(result.errors.length, 2);
  assert.equal(result.transactions.length, 2);

  assert.equal(result.transactions[0].title, 'Bonus payment'); // '=' formula prefix stripped
  assert.equal(result.transactions[0].amount, 1_500_000);
  assert.equal(result.transactions[0].walletId, 'w-bank');

  assert.equal(result.transactions[1].date, '2026-11-26');
  assert.equal(result.transactions[1].type, TransactionType.Transfer);
  assert.equal(result.transactions[1].title, 'Transfer to, GoPay');
  assert.equal(result.transactions[1].amount, 250_000);
  assert.equal(result.transactions[1].walletId, 'w-bank');
  assert.equal(result.transactions[1].destinationWalletId, 'w-gopay');

  const sample = createSampleCsvContent(wallets, '2026-11-26');
  assert.match(sample, /Morning coffee & pastry/);
});
