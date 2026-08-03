// Description: Normalizes registration identities before they cross the API boundary.

export type RegistrationIdentity =
  | { type: 'email'; value: string }
  | { type: 'phone'; value: string };

export type RegistrationApiIdentity = {
  identity: RegistrationIdentity;
  email: string;
  phoneNumber?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_INPUT_PATTERN = /^[+\d\s().-]+$/;

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !PHONE_INPUT_PATTERN.test(trimmed)) return null;

  let compact = trimmed.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) {
    compact = `+${compact.slice(2)}`;
  }

  if (!/^\+?\d+$/.test(compact)) return null;

  const digits = compact.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;

  if (compact.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+84${digits.slice(1)}`;
  }

  if (digits.length === 9 && !digits.startsWith('84')) {
    return `+84${digits}`;
  }

  return `+${digits}`;
}

export function parseRegistrationIdentity(
  input: string,
): RegistrationIdentity | null {
  const value = input.trim();
  if (!value) return null;

  if (value.includes('@')) {
    const email = value.toLowerCase();
    return EMAIL_PATTERN.test(email) ? { type: 'email', value: email } : null;
  }

  const phone = normalizePhoneNumber(value);
  return phone ? { type: 'phone', value: phone } : null;
}

export function buildRegistrationApiIdentity(
  input: string,
): RegistrationApiIdentity | null {
  const identity = parseRegistrationIdentity(input);
  if (!identity) return null;

  if (identity.type === 'email') {
    return { identity, email: identity.value };
  }

  const phoneNumber = input.replace(/\D/g, '');
  return {
    identity,
    email: `phone_${phoneNumber}@vnseea.invalid`,
    phoneNumber,
  };
}
