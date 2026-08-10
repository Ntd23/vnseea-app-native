const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/navigation/MainTabNavigator.tsx'),
  'utf8',
);

describe('Android main-tab lazy mounting', () => {
  it('does not mount the Reels screen before the user opens the tab', () => {
    expect(source).toContain('options={{ lazy: true }}');
    expect(source).not.toContain('lazy: name !== ROUTES.REELS');
  });
});
