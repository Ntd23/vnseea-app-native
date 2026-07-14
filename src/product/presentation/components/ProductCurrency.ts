// Description: Formats product prices from backend currency codes, symbols, and formatting rules.
import type { ProductItem } from '../../domain/types/product.types';

function decodeCurrencyText(value: unknown) {
  let decoded = String(value ?? '');

  for (let pass = 0; pass < 2; pass += 1) {
    decoded = decoded
      .replace(/&amp;/gi, '&')
      .replace(/&#x([0-9a-f]+);?/gi, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16)),
      )
      .replace(/&#(\d+);?/g, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 10)),
      )
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  return decoded.trim();
}

function formatWithRule(
  value: string,
  rule?: ProductItem['currency_rule'],
) {
  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numericValue)) return value;

  const decimals = Math.max(0, Number(rule?.decimals ?? 0));
  const decimalSeparator = rule?.decimal_sep ?? ',';
  const thousandSeparator = rule?.thousand_sep ?? '.';
  const [integerPart, fractionPart = ''] = Math.abs(numericValue)
    .toFixed(decimals)
    .split('.');
  const groupedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousandSeparator,
  );
  const sign = numericValue < 0 ? '-' : '';

  return decimals > 0
    ? `${sign}${groupedInteger}${decimalSeparator}${fractionPart}`
    : `${sign}${groupedInteger}`;
}

export function formatProductPrice(product: ProductItem) {
  const formattedPrice = product.price_format
    ? decodeCurrencyText(product.price_format)
    : formatWithRule(product.price, product.currency_rule);
  const symbol = decodeCurrencyText(product.currency_symbol);
  const rawCode = decodeCurrencyText(product.currency_code);
  const rawCurrency = decodeCurrencyText(product.currency);
  const code = (rawCode || (/^\d+$/.test(rawCurrency) ? '' : rawCurrency)).toUpperCase();

  if (symbol && code && symbol.toUpperCase() !== code) {
    return `${symbol}${formattedPrice} (${code})`;
  }
  if (symbol && !code) {
    return `${symbol}${formattedPrice}`;
  }
  if (code) {
    return `${formattedPrice} ${code}`;
  }

  return formattedPrice;
}
