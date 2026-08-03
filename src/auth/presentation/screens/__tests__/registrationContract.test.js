const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('registration identity contract', () => {
  it('keeps the username selected by the user and validates it before submit', () => {
    const screen = read('src/auth/presentation/screens/RegisterScreen.tsx');
    const repository = read(
      'src/auth/infrastructure/repositories/ApiAuthRepository.ts',
    );

    expect(screen).toContain('const REGISTER_USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;');
    expect(screen).toContain(
      'normalizedUsername.length < 5 || normalizedUsername.length > 32',
    );
    expect(screen).toContain(
      '!REGISTER_USERNAME_PATTERN.test(normalizedUsername)',
    );
    expect(repository).toContain('username: input.username.trim()');
    expect(repository).toContain('email: apiIdentity.email');
    expect(repository).toContain('phone_num: apiIdentity.phoneNumber');
  });

  it('does not let the API mirror overwrite explicit usernames with random values', () => {
    const endpoint = read('phtml/api/v2/endpoints/create-account.php');

    expect(endpoint).not.toMatch(
      /\$_POST\['username'\]\s*=\s*time\(\)\s*\.\s*rand/,
    );
    expect(endpoint).not.toContain("$username = $username . \"_\" . $registered_user_id;");
  });

  it('accepts an optional ISO birthday and stores valid values on account creation', () => {
    const endpoint = read('phtml/api/v2/endpoints/create-account.php');
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(endpoint).toMatch(/\$birthday\s*=\s*'';/);
    expect(endpoint).toContain("preg_match('/^(\\d{4})-(\\d{2})-(\\d{2})$/'");
    expect(endpoint).toContain('checkdate($birthday_month, $birthday_day, $birthday_year)');
    expect(endpoint).toContain("$account_data['birthday'] = Wo_Secure($birthday, 0);");
    expect(profile).toContain("text === '0000-00-00'");
  });

  it('moves verification-required registrations into the native OTP screen', () => {
    const screen = read('src/auth/presentation/screens/RegisterScreen.tsx');
    const verificationBranch = screen.slice(
      screen.indexOf("if (result.status === 'authenticated')"),
      screen.indexOf('    } catch {', screen.indexOf("if (result.status === 'authenticated')")),
    );

    expect(verificationBranch).toContain(
      'navigation.replace(ROUTES.EMAIL_VERIFICATION, {',
    );
    expect(verificationBranch).toContain('userId: result.userId');
    expect(verificationBranch).toContain(
      'identity: result.identity || registrationIdentity.value',
    );
    expect(verificationBranch).toContain(
      "registrationIdentity.type === 'phone' ? 'sms' : 'email'",
    );
    expect(verificationBranch).not.toContain(
      'Alert.alert(copy.verificationTitle, result.message)',
    );
  });

  it('keeps the API mirror aligned with the six-digit email OTP contract', () => {
    const createAccount = read('phtml/api/v2/endpoints/create-account.php');
    const confirmAccount = read(
      'phtml/api/v2/endpoints/active_account_sms.php',
    );
    const router = read('phtml/api-v2.php');
    const resendPath = path.join(
      projectRoot,
      'phtml/api/v2/endpoints/resend-activation-code.php',
    );
    const wowonderTemplatePath = path.join(
      projectRoot,
      'phtml/themes/wowonder/layout/emails/activate_code.phtml',
    );
    const sunshineTemplatePath = path.join(
      projectRoot,
      'phtml/themes/sunshine/layout/emails/activate_code.phtml',
    );

    expect(createAccount).toContain('random_int(100000, 999999)');
    expect(createAccount).toContain("$account_data['sms_code'] = $activation_code;");
    expect(createAccount).toContain("Wo_LoadPage('emails/activate_code')");
    expect(confirmAccount).toContain("->where('user_id', $user_id)");
    expect(confirmAccount).toContain("->where('active', '0')");
    expect(confirmAccount).toContain("preg_match('/^\\d{6}$/', $confirm_code)");
    expect(confirmAccount).toContain('md5($confirm_code)');
    expect(confirmAccount).toContain('`platform_details`');
    expect(router.match(/'resend-activation-code'/g)).toHaveLength(2);
    expect(fs.existsSync(resendPath)).toBe(true);
    expect(fs.existsSync(wowonderTemplatePath)).toBe(true);
    expect(fs.existsSync(sunshineTemplatePath)).toBe(true);

    const resend = fs.readFileSync(resendPath, 'utf8');
    expect(resend).toContain("$user->time_code_sent > (time() - 60)");
    expect(resend).toContain('random_int(100000, 999999)');
    expect(resend).toContain("Wo_LoadPage('emails/activate_code')");
  });
});
