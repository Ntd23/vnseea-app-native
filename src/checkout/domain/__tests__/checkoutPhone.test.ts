import {
  isValidCheckoutPhone,
  normalizeCheckoutPhone,
} from '../checkoutPhone';

describe('checkout phone validation', () => {
  it.each([
    ['0901234567', '0901234567'],
    ['090 123 4567', '0901234567'],
    ['090-123-4567', '0901234567'],
    ['(090) 123-4567', '0901234567'],
    ['+84 901 234 567', '+84901234567'],
  ])('normalizes supported international formatting for %s', (input, expected) => {
    expect(normalizeCheckoutPhone(input)).toBe(expected);
    expect(isValidCheckoutPhone(input)).toBe(true);
  });

  it.each([
    '1234567',
    '1234567890123456',
    '09012abc67',
    '84+901234567',
    '++84901234567',
    '() - ',
  ])('rejects an invalid checkout phone: %s', input => {
    expect(normalizeCheckoutPhone(input)).toBeNull();
    expect(isValidCheckoutPhone(input)).toBe(false);
  });
});
