const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('forgot password email-only flow', () => {
  it('uses dedicated Vietnamese and English email-only copy', () => {
    const copy = read('src/auth/application/i18n/authCopy.ts');

    expect(copy).toContain("forgotPasswordEmailLabel: 'Email'");
    expect(copy).toContain(
      "forgotPasswordEmailPlaceholder: 'Nhập địa chỉ email'",
    );
    expect(copy).toContain(
      "forgotPasswordEmailInvalid: 'Vui lòng nhập địa chỉ email hợp lệ.'",
    );
    expect(copy).toContain("forgotPasswordEmailPlaceholder: 'Enter your email address'");
    expect(copy).not.toContain("forgotPasswordEmailPlaceholder: 'Email hoặc số điện thoại'");
  });

  it('rejects phone identities before calling the reset API', () => {
    const screen = read(
      'src/auth/presentation/screens/ForgotPasswordScreen.tsx',
    );

    expect(screen).toContain("parseRegistrationIdentity(email)");
    expect(screen).toContain("parsedIdentity?.type !== 'email'");
    expect(screen).toContain('forgotPassword({ email: parsedIdentity.value })');
    expect(screen).toContain('placeholder={copy.forgotPasswordEmailPlaceholder}');
    expect(screen).toContain('{copy.forgotPasswordEmailLabel}');
    expect(screen).toContain('keyboardType="email-address"');
    expect(screen).toContain('textContentType="emailAddress"');
    expect(screen).toContain('autoComplete="email"');
  });
});
