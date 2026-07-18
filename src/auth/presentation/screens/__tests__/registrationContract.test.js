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
});
