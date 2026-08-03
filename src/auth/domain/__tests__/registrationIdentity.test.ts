import {
  buildRegistrationApiIdentity,
  parseRegistrationIdentity,
} from '../registrationIdentity';

describe('parseRegistrationIdentity', () => {
  it('normalizes email addresses', () => {
    expect(parseRegistrationIdentity(' User@Example.COM ')).toEqual({
      type: 'email',
      value: 'user@example.com',
    });
  });

  it.each([
    ['090 123 4567', '+84901234567'],
    ['090-123-4567', '+84901234567'],
    ['(+84) 90 123 4567', '+84901234567'],
    ['0084901234567', '+84901234567'],
    ['+84901234567', '+84901234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(parseRegistrationIdentity(input)).toEqual({
      type: 'phone',
      value: expected,
    });
  });

  it('rejects malformed identities', () => {
    expect(parseRegistrationIdentity('not-an-email')).toBeNull();
    expect(parseRegistrationIdentity('12345')).toBeNull();
    expect(parseRegistrationIdentity('090abc1234')).toBeNull();
  });
});

describe('buildRegistrationApiIdentity', () => {
  it('keeps a real email in the backend email field', () => {
    expect(buildRegistrationApiIdentity(' User@Example.COM ')).toEqual({
      identity: { type: 'email', value: 'user@example.com' },
      email: 'user@example.com',
    });
  });

  it('matches the Nuxt phone compatibility payload', () => {
    expect(buildRegistrationApiIdentity('090 123 4567')).toEqual({
      identity: { type: 'phone', value: '+84901234567' },
      email: 'phone_0901234567@vnseea.invalid',
      phoneNumber: '0901234567',
    });
  });
});
