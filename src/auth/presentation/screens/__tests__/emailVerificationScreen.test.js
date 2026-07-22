const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Email verification screen', () => {
  it('registers a typed native-stack route with the pending account identity', () => {
    const routes = read('src/navigation/constants/routes.ts');
    const types = read('src/navigation/types.ts');
    const registry = read('src/navigation/routeRegistry.tsx');
    const authIndex = read('src/auth/index.ts');

    expect(routes).toContain("EMAIL_VERIFICATION: 'EmailVerification'");
    expect(types).toContain('[ROUTES.EMAIL_VERIFICATION]: {');
    expect(types).toContain('userId: string;');
    expect(types).toContain('email: string;');
    expect(authIndex).toContain('EmailVerificationScreen');
    expect(registry).toContain(
      '{ name: ROUTES.EMAIL_VERIFICATION, component: EmailVerificationScreen }',
    );
  });

  it('uses a six-digit native OTP flow with safe-area and keyboard protection', () => {
    const screen = read(
      'src/auth/presentation/screens/EmailVerificationScreen.tsx',
    );

    expect(screen).toContain("keyboardType=\"number-pad\"");
    expect(screen).toContain('textContentType="oneTimeCode"');
    expect(screen).toContain('autoComplete="one-time-code"');
    expect(screen).toContain("replace(/\\D/g, '').slice(0, OTP_LENGTH)");
    expect(screen).toContain('Array.from({ length: OTP_LENGTH })');
    expect(screen).toContain('const OTP_LENGTH = 6;');
    expect(screen).toContain('<SafeAreaView');
    expect(screen).toContain('<KeyboardAvoidingView');
  });

  it('confirms the code, enters Main Tabs and rate-limits resend for 60 seconds', () => {
    const screen = read(
      'src/auth/presentation/screens/EmailVerificationScreen.tsx',
    );

    expect(screen).toContain('repository.confirmAccount({');
    expect(screen).toContain('repository.resendAccountCode(userId)');
    expect(screen).toContain('const RESEND_DELAY_SECONDS = 60;');
    expect(screen).toContain('navigation.reset({');
    expect(screen).toContain('routes: [{ name: ROUTES.MAIN_TABS }]');
    expect(screen).toContain('navigation.reset({\n      index: 0,\n      routes: [{ name: ROUTES.LOGIN }]');
  });

  it('provides complete Vietnamese and English verification copy', () => {
    const copy = read('src/auth/application/i18n/authCopy.ts');

    expect(copy).toContain("emailVerificationTitle: 'Xác minh email'");
    expect(copy).toContain("emailVerificationCode: 'Mã xác minh'");
    expect(copy).toContain("emailVerificationSubmit: 'Xác minh và tiếp tục'");
    expect(copy).toContain("emailVerificationTitle: 'Verify your email'");
    expect(copy).toContain("emailVerificationSubmit: 'Verify and continue'");
  });
});
