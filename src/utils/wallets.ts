import {
  DigitalWallet,
  FinanceTransaction,
  TransactionType,
  WalletIcon,
  WalletType,
} from '../types/dayspace';

export interface WalletTypeMeta {
  type: WalletType;
  label: string;
  defaultName: string;
  defaultColor: string;
  defaultIcon: WalletIcon;
}

export const WALLET_TYPE_ORDER: WalletType[] = [
  WalletType.Dana,
  WalletType.GoPay,
  WalletType.Ovo,
  WalletType.ShopeePay,
  WalletType.LinkAja,
  WalletType.Bank,
  WalletType.Cash,
  WalletType.Custom,
];

export const WALLET_TYPE_META: Record<WalletType, WalletTypeMeta> = {
  [WalletType.Dana]: {
    type: WalletType.Dana,
    label: 'DANA',
    defaultName: 'DANA',
    defaultColor: '#2E6F95',
    defaultIcon: 'smartphone',
  },
  [WalletType.GoPay]: {
    type: WalletType.GoPay,
    label: 'GoPay',
    defaultName: 'GoPay',
    defaultColor: '#2D6A4F',
    defaultIcon: 'smartphone',
  },
  [WalletType.Ovo]: {
    type: WalletType.Ovo,
    label: 'OVO',
    defaultName: 'OVO',
    defaultColor: '#5B4B8A',
    defaultIcon: 'smartphone',
  },
  [WalletType.ShopeePay]: {
    type: WalletType.ShopeePay,
    label: 'ShopeePay',
    defaultName: 'ShopeePay',
    defaultColor: '#B85D3B',
    defaultIcon: 'wallet',
  },
  [WalletType.LinkAja]: {
    type: WalletType.LinkAja,
    label: 'LinkAja',
    defaultName: 'LinkAja',
    defaultColor: '#9A3B30',
    defaultIcon: 'smartphone',
  },
  [WalletType.Bank]: {
    type: WalletType.Bank,
    label: 'Bank Account',
    defaultName: 'Bank Account',
    defaultColor: '#1E3F31',
    defaultIcon: 'landmark',
  },
  [WalletType.Cash]: {
    type: WalletType.Cash,
    label: 'Cash',
    defaultName: 'Cash',
    defaultColor: '#7A9A83',
    defaultIcon: 'banknote',
  },
  [WalletType.Custom]: {
    type: WalletType.Custom,
    label: 'Custom Wallet',
    defaultName: 'Custom Wallet',
    defaultColor: '#B9853B',
    defaultIcon: 'sparkles',
  },
};

export const WALLET_COLOR_PRESETS: Array<{ label: string; hex: string }> = [
  { label: 'Forest Green', hex: '#1E3F31' },
  { label: 'Sage Pine', hex: '#2D6A4F' },
  { label: 'Muted Sage', hex: '#5C7C66' },
  { label: 'Meadow Leaf', hex: '#7A9A83' },
  { label: 'River Blue', hex: '#2E6F95' },
  { label: 'Iris Plum', hex: '#5B4B8A' },
  { label: 'Warm Ochre', hex: '#B9853B' },
  { label: 'Terracotta', hex: '#B85D3B' },
  { label: 'Crimson Clay', hex: '#9A3B30' },
  { label: 'Warm Stone', hex: '#6E675F' },
];

export const WALLET_ICON_OPTIONS: Array<{ id: WalletIcon; label: string }> = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'smartphone', label: 'E-Wallet' },
  { id: 'landmark', label: 'Bank' },
  { id: 'banknote', label: 'Cash' },
  { id: 'credit-card', label: 'Card' },
  { id: 'coins', label: 'Savings' },
  { id: 'sparkles', label: 'Custom' },
];

export const TRANSFER_CATEGORY = 'Transfer';

export function computeTotalWalletBalance(wallets: DigitalWallet[]): number {
  let total = 0;
  for (const wallet of wallets) {
    if (Number.isFinite(wallet.balance)) {
      total += wallet.balance;
    }
  }
  return total;
}

/**
 * Applies (`direction = 1`) or reverts (`direction = -1`) a transaction's effect
 * on matching wallet balances cleanly and immutably.
 */
export function applyTransactionBalanceDelta(
  wallets: DigitalWallet[],
  tx: Pick<
    FinanceTransaction,
    'type' | 'amount' | 'walletId' | 'destinationWalletId'
  >,
  direction: 1 | -1 = 1
): DigitalWallet[] {
  const amount = Number.isFinite(tx.amount) ? Math.max(0, tx.amount) : 0;
  if (amount === 0 || wallets.length === 0) return wallets;

  const nowIso = new Date().toISOString();

  if (tx.type === TransactionType.Transfer) {
    if (!tx.walletId && !tx.destinationWalletId) return wallets;
    if (tx.walletId && tx.walletId === tx.destinationWalletId) return wallets;

    return wallets.map((wallet) => {
      if (wallet.id === tx.walletId) {
        return {
          ...wallet,
          balance: wallet.balance - amount * direction,
          updatedAt: nowIso,
        };
      }
      if (wallet.id === tx.destinationWalletId) {
        return {
          ...wallet,
          balance: wallet.balance + amount * direction,
          updatedAt: nowIso,
        };
      }
      return wallet;
    });
  }

  if (!tx.walletId) return wallets;

  const sign = tx.type === TransactionType.Income ? 1 : -1;
  return wallets.map((wallet) => {
    if (wallet.id !== tx.walletId) return wallet;
    return {
      ...wallet,
      balance: wallet.balance + amount * sign * direction,
      updatedAt: nowIso,
    };
  });
}

export function reconcileWalletsForTransactionChange(
  wallets: DigitalWallet[],
  previousTx: FinanceTransaction,
  nextTx: FinanceTransaction
): DigitalWallet[] {
  const afterRevert = applyTransactionBalanceDelta(wallets, previousTx, -1);
  return applyTransactionBalanceDelta(afterRevert, nextTx, 1);
}

/**
 * Builds a deterministic fingerprint for duplicate detection across CSV imports and sync.
 */
export function buildTransactionSignature(
  tx: Pick<
    FinanceTransaction,
    'date' | 'type' | 'amount' | 'title' | 'walletId' | 'destinationWalletId'
  >
): string {
  const normalizedTitle = tx.title.trim().replace(/\s+/g, ' ').toLowerCase();
  const normalizedAmount = Number.isFinite(tx.amount)
    ? Math.round(tx.amount * 100) / 100
    : 0;
  return [
    tx.date.trim(),
    tx.type,
    String(normalizedAmount),
    normalizedTitle,
    tx.walletId || '',
    tx.destinationWalletId || '',
  ].join('|');
}

/**
 * Prevents duplicate transactions by ID (and optionally by exact content signature
 * when `deduplicateBySignature` is enabled, e.g., during sync or batch imports).
 */
export function deduplicateTransactions(
  transactions: FinanceTransaction[],
  options: { deduplicateBySignature?: boolean } = {}
): FinanceTransaction[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: FinanceTransaction[] = [];

  for (const tx of transactions) {
    if (!tx.id || seenIds.has(tx.id)) {
      continue;
    }
    if (options.deduplicateBySignature) {
      const sig = buildTransactionSignature(tx);
      if (seenSignatures.has(sig)) {
        continue;
      }
      seenSignatures.add(sig);
    }
    seenIds.add(tx.id);
    result.push(tx);
  }

  return result;
}

export interface CsvImportRowError {
  lineNumber: number;
  message: string;
}

export interface CsvImportResult {
  transactions: FinanceTransaction[];
  skippedDuplicates: number;
  errors: CsvImportRowError[];
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function sanitizeCsvTextCell(value: string): string {
  // Neutralize spreadsheet formula prefixes and control characters cleanly
  return value.replace(/[\r\n\t]+/g, ' ').replace(/^[=+\-@]+(?=\S)/, '').trim();
}

function parseCsvAmount(raw: string): number {
  const cleaned = raw
    .replace(/rp/gi, '')
    .replace(/idr/gi, '')
    .replace(/\s+/g, '')
    .trim();

  if (!cleaned) return NaN;

  // Handle Indonesian thousands separators like "1.500.000" vs standard decimals "1500.50"
  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ''));
  }
  if (/^-?\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/,/g, ''));
  }
  return Number(cleaned.replace(/,/g, ''));
}

function normalizeDateKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function findWalletByNameOrId(
  rawValue: string,
  wallets: DigitalWallet[]
): DigitalWallet | undefined {
  const needle = rawValue.trim().toLowerCase();
  if (!needle) return undefined;
  return wallets.find(
    (w) =>
      w.id.toLowerCase() === needle ||
      w.name.trim().toLowerCase() === needle ||
      WALLET_TYPE_META[w.type]?.label.toLowerCase() === needle
  );
}

/**
 * Parses manual CSV rows into validated, deduplicated FinanceTransaction items.
 * Expected columns (case-insensitive header, or positional Date,Type,Description,Amount,Category,Wallet,Notes):
 *   date, type (income|expense|transfer), description/title, amount, category, wallet, destination_wallet, notes
 */
export function parseTransactionsCsv(
  csvText: string,
  wallets: DigitalWallet[],
  defaultWalletId: string | undefined,
  existingTransactions: FinanceTransaction[],
  fallbackDateKey: string
): CsvImportResult {
  const rawLines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length === 0) {
    return {
      transactions: [],
      skippedDuplicates: 0,
      errors: [{ lineNumber: 1, message: 'CSV content is empty.' }],
    };
  }

  const firstCells = splitCsvLine(rawLines[0]).map((c) => c.toLowerCase());
  const hasHeader =
    firstCells.some((c) =>
      ['date', 'tanggal', 'type', 'description', 'title', 'amount', 'nominal'].includes(
        c
      )
    );

  const colIndex = {
    date: 0,
    type: 1,
    title: 2,
    amount: 3,
    category: 4,
    wallet: 5,
    destinationWallet: -1,
    notes: 6,
  };

  let startRow = 0;
  if (hasHeader) {
    startRow = 1;
    colIndex.date = firstCells.findIndex((c) => c === 'date' || c === 'tanggal');
    colIndex.type = firstCells.findIndex((c) => c === 'type' || c === 'jenis');
    colIndex.title = firstCells.findIndex((c) =>
      ['description', 'title', 'deskripsi', 'memo', 'name'].includes(c)
    );
    colIndex.amount = firstCells.findIndex((c) =>
      ['amount', 'nominal', 'jumlah', 'value'].includes(c)
    );
    colIndex.category = firstCells.findIndex((c) =>
      ['category', 'kategori'].includes(c)
    );
    colIndex.wallet = firstCells.findIndex((c) =>
      ['wallet', 'source_wallet', 'source', 'dompet', 'account'].includes(c)
    );
    colIndex.destinationWallet = firstCells.findIndex((c) =>
      [
        'destination_wallet',
        'destination',
        'to_wallet',
        'tujuan',
      ].includes(c)
    );
    colIndex.notes = firstCells.findIndex((c) =>
      ['notes', 'note', 'catatan'].includes(c)
    );
  }

  const existingSignatures = new Set(
    existingTransactions.map((tx) => buildTransactionSignature(tx))
  );

  const transactions: FinanceTransaction[] = [];
  const errors: CsvImportRowError[] = [];
  let skippedDuplicates = 0;

  for (let rowIdx = startRow; rowIdx < rawLines.length; rowIdx += 1) {
    const lineNumber = rowIdx + 1;
    const cells = splitCsvLine(rawLines[rowIdx]);

    const getCell = (idx: number): string =>
      idx >= 0 && idx < cells.length ? cells[idx] : '';

    const rawDate = getCell(colIndex.date);
    const dateKey = rawDate ? normalizeDateKey(rawDate) : fallbackDateKey;
    if (!dateKey) {
      errors.push({
        lineNumber,
        message: `Invalid date "${rawDate}". Use YYYY-MM-DD (e.g. 2026-11-26).`,
      });
      continue;
    }

    const rawType = getCell(colIndex.type).toLowerCase();
    let txType: TransactionType = TransactionType.Expense;
    if (['income', 'masuk', 'credit', 'deposit'].includes(rawType)) {
      txType = TransactionType.Income;
    } else if (['transfer', 'move', 'kirim'].includes(rawType)) {
      txType = TransactionType.Transfer;
    } else if (
      !rawType ||
      ['expense', 'keluar', 'debit', 'spend'].includes(rawType)
    ) {
      txType = TransactionType.Expense;
    } else {
      errors.push({
        lineNumber,
        message: `Unsupported type "${rawType}". Use income, expense, or transfer.`,
      });
      continue;
    }

    const title = sanitizeCsvTextCell(getCell(colIndex.title));
    if (!title) {
      errors.push({
        lineNumber,
        message: 'Missing transaction description.',
      });
      continue;
    }

    const parsedAmount = parseCsvAmount(getCell(colIndex.amount));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.push({
        lineNumber,
        message: `Invalid amount "${getCell(colIndex.amount)}".`,
      });
      continue;
    }

    const rawCategory = sanitizeCsvTextCell(getCell(colIndex.category));
    const category =
      rawCategory ||
      (txType === TransactionType.Transfer
        ? TRANSFER_CATEGORY
        : txType === TransactionType.Income
        ? 'Other Income'
        : 'Other');

    const rawWallet = getCell(colIndex.wallet);
    const matchedWallet = rawWallet
      ? findWalletByNameOrId(rawWallet, wallets)
      : undefined;
    const resolvedWalletId =
      matchedWallet?.id ||
      (defaultWalletId && wallets.some((w) => w.id === defaultWalletId)
        ? defaultWalletId
        : wallets[0]?.id);

    let resolvedDestWalletId: string | undefined;
    if (txType === TransactionType.Transfer) {
      const rawDest = getCell(colIndex.destinationWallet);
      const matchedDest = rawDest
        ? findWalletByNameOrId(rawDest, wallets)
        : undefined;
      if (!matchedDest) {
        errors.push({
          lineNumber,
          message: `Transfer requires a valid destination_wallet matching an existing wallet.`,
        });
        continue;
      }
      if (matchedDest.id === resolvedWalletId) {
        errors.push({
          lineNumber,
          message: 'Transfer source and destination wallets must be different.',
        });
        continue;
      }
      resolvedDestWalletId = matchedDest.id;
    }

    const rawNotes = sanitizeCsvTextCell(getCell(colIndex.notes));
    const nowIso = new Date().toISOString();
    const candidate: FinanceTransaction = {
      id: `tx-csv-${Date.now()}-${rowIdx}-${Math.random().toString(36).slice(2, 6)}`,
      type: txType,
      title,
      amount: Math.round(parsedAmount),
      category,
      date: dateKey,
      ...(resolvedWalletId ? { walletId: resolvedWalletId } : {}),
      ...(resolvedDestWalletId
        ? { destinationWalletId: resolvedDestWalletId }
        : {}),
      ...(rawNotes ? { notes: rawNotes } : {}),
      createdAt: nowIso,
    };

    const sig = buildTransactionSignature(candidate);
    if (existingSignatures.has(sig)) {
      skippedDuplicates += 1;
      continue;
    }
    existingSignatures.add(sig);
    transactions.push(candidate);
  }

  return { transactions, skippedDuplicates, errors };
}

export function createSampleCsvContent(
  wallets: DigitalWallet[],
  dateKey: string
): string {
  const firstWallet = wallets[0]?.name || 'Bank Account';
  const secondWallet = wallets[1]?.name || 'DANA';
  return [
    'date,type,description,amount,category,wallet,destination_wallet,notes',
    `${dateKey},expense,Morning coffee & pastry,45000,Dining,${secondWallet},,Manual sample entry`,
    `${dateKey},income,Freelance mini retainer,750000,Freelance,${firstWallet},,Client deposit`,
    `${dateKey},transfer,Top up e-wallet,250000,Transfer,${firstWallet},${secondWallet},Weekly allowance`,
  ].join('\n');
}
