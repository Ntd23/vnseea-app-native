// Description: Formats monetary values consistently across application screens.

type CurrencyFormatOptions = {
  locale?: string;
  showCodeWhenNoSymbol?: boolean;
};

function normalizedCurrency(value: string) {
  return value.trim().toUpperCase();
}

function isVnd(currency: string, symbol: string) {
  const code = normalizedCurrency(currency);
  const normalizedSymbol = symbol.trim();
  return (
    code === 'VND' ||
    normalizedSymbol === '\u20ab' ||
    normalizedSymbol === '\u0111'
  );
}

function currencySuffix(
  currency: string,
  symbol: string,
  showCodeWhenNoSymbol: boolean,
) {
  if (isVnd(currency, symbol)) {
    return '\u0111';
  }

  const trimmedSymbol = symbol.trim();
  if (trimmedSymbol) {
    return trimmedSymbol;
  }

  return showCodeWhenNoSymbol ? normalizedCurrency(currency) : '';
}

export function formatCurrency(
  amount: number,
  currency = 'VND',
  currencySymbol = '',
  options: CurrencyFormatOptions = {},
) {
  const locale = options.locale || 'vi-VN';
  const showCodeWhenNoSymbol = options.showCodeWhenNoSymbol ?? true;
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const suffix = currencySuffix(currency, currencySymbol, showCodeWhenNoSymbol);

  if (isVnd(currency, currencySymbol)) {
    const value = Math.round(safeAmount).toLocaleString(locale);
    return suffix ? `${value} ${suffix}` : value;
  }

  const formattedAmount = safeAmount.toLocaleString(locale, {
    minimumFractionDigits: safeAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  if (currencySymbol.trim() === '$') {
    return `$${formattedAmount}`;
  }

  return suffix ? `${formattedAmount} ${suffix}` : formattedAmount;
}

export const format_currency = formatCurrency;
