export const APP_CURRENCY_CODE = 'IDR';
export const APP_CURRENCY_LOCALE = 'id-ID';
export const APP_CURRENCY_SYMBOL = 'Rp';

const defaultIdrFormatter = new Intl.NumberFormat(APP_CURRENCY_LOCALE, {
  style: 'currency',
  currency: APP_CURRENCY_CODE,
  maximumFractionDigits: 0,
});

export function formatCurrency(
  amount: number,
  options: { decimals?: number } = {}
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedZero = Object.is(safeAmount, -0) ? 0 : safeAmount;

  const formatted =
    options.decimals === undefined || options.decimals === 0
      ? defaultIdrFormatter.format(normalizedZero)
      : new Intl.NumberFormat(APP_CURRENCY_LOCALE, {
          style: 'currency',
          currency: APP_CURRENCY_CODE,
          minimumFractionDigits: options.decimals,
          maximumFractionDigits: options.decimals,
        }).format(normalizedZero);

  // Normalize ICU spacing after "Rp" (e.g., "Rp\u00A01.500.000" -> "Rp1.500.000")
  return formatted.replace(/^(-?)Rp[\s\u00A0]+/, '$1Rp');
}
