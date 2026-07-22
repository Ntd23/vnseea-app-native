import type {
  CheckoutCurrencyTotal,
  CheckoutItem,
  CheckoutSummary,
} from './types/checkout.types';

function normalizeCurrencyCode(item: CheckoutItem) {
  const code = item.currencyCode.trim().toUpperCase();
  return code || item.currencySymbol.trim().toUpperCase() || 'VND';
}

export function getCheckoutCurrencyTotals(
  items: CheckoutItem[],
): CheckoutCurrencyTotal[] {
  const totals = new Map<string, CheckoutCurrencyTotal>();

  items.forEach(item => {
    const currencyCode = normalizeCurrencyCode(item);
    const current = totals.get(currencyCode);
    if (current) {
      current.amount += item.total;
      return;
    }

    totals.set(currencyCode, {
      currencyCode,
      currencySymbol: item.currencySymbol || currencyCode,
      amount: item.total,
    });
  });

  return Array.from(totals.values());
}

export function createCheckoutSummary(
  items: CheckoutItem[],
  shipping = 0,
): CheckoutSummary {
  const currencyTotals = getCheckoutCurrencyTotals(items);
  const singleCurrencyTotal =
    currencyTotals.length === 1 ? currencyTotals[0] : undefined;
  const subtotal = singleCurrencyTotal?.amount ?? 0;
  const safeShipping = singleCurrencyTotal ? shipping : 0;

  return {
    items,
    subtotal,
    shipping: safeShipping,
    total: subtotal + safeShipping,
    currencyCode: singleCurrencyTotal?.currencyCode ?? '',
    currencySymbol: singleCurrencyTotal?.currencySymbol ?? '',
    currencyTotals,
  };
}
