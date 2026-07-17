const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const helperPath = path.join(
  projectRoot,
  'src/profile/application/utils/profileOwnership.ts',
);

describe('profile ownership', () => {
  it('uses the authenticated and resolved target user IDs', () => {
    expect(fs.existsSync(helperPath)).toBe(true);
    if (!fs.existsSync(helperPath)) return;

    const { resolveProfileOwnership } = require('../profileOwnership');

    expect(
      resolveProfileOwnership({
        currentUserId: '10',
        routeUserId: undefined,
        loadedProfileId: undefined,
      }),
    ).toBe(true);
    expect(
      resolveProfileOwnership({
        currentUserId: '10',
        routeUserId: '10',
        loadedProfileId: '10',
      }),
    ).toBe(true);
    expect(
      resolveProfileOwnership({
        currentUserId: '10',
        routeUserId: '11',
        loadedProfileId: '11',
      }),
    ).toBe(false);
    expect(
      resolveProfileOwnership({
        currentUserId: '10',
        routeUserId: undefined,
        loadedProfileId: '11',
      }),
    ).toBe(false);
    expect(
      resolveProfileOwnership({
        currentUserId: undefined,
        routeUserId: undefined,
        loadedProfileId: undefined,
      }),
    ).toBe(false);
  });
});
