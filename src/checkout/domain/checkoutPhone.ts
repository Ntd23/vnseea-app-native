const CHECKOUT_PHONE_ALLOWED = /^\+?[\d\s()-]+$/;
const CHECKOUT_PHONE_NORMALIZED = /^\+?\d{8,15}$/;

export function normalizeCheckoutPhone(value: string): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || !CHECKOUT_PHONE_ALLOWED.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.replace(/[\s()-]/g, '');
  return CHECKOUT_PHONE_NORMALIZED.test(normalized) ? normalized : null;
}

export function isValidCheckoutPhone(value: string): boolean {
  return normalizeCheckoutPhone(value) !== null;
}
