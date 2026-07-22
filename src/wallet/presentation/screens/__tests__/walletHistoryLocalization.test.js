const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('wallet history localization', () => {
  it('translates the signup bonus transaction key in Vietnamese and English', () => {
    const screen = read('src/wallet/presentation/screens/MyBalanceScreen.tsx');

    expect(screen).toContain("signupBonusHistoryTitle: 'Thưởng đăng ký'");
    expect(screen).toContain("signupBonusHistoryTitle: 'Registration bonus'");
    expect(screen).toContain("pointType === 'signup_bonus'");
    expect(screen).toContain('copy.signupBonusHistoryTitle');
  });
});
