const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Page hero avatar layout', () => {
  it('uses the same avatar geometry as the Profile hero on Android', () => {
    const page = read(
      'src/pages/presentation/screens/PageDetailScreen.tsx',
    );
    const profile = read(
      'src/profile/presentation/screens/ProfileScreen.tsx',
    );

    expect(profile).toContain('marginTop: -50');
    expect(profile).toContain('paddingTop: 57');
    expect(profile).toContain('width: 100');

    expect(page).toContain('const PAGE_HERO_AVATAR_SIZE = 100;');
    expect(page).toContain('const PAGE_HERO_AVATAR_OVERLAP = 50;');
    expect(page).toContain(
      'const PAGE_HERO_IDENTITY_TOP_PADDING = 57;',
    );
    expect(page).toContain('style={PAGE_HERO_AVATAR_ROW_STYLE}');
    expect(page).toContain('style={PAGE_HERO_IDENTITY_STYLE}');
    expect(page).not.toContain('-mt-[50px]');
    expect(page).not.toContain('pt-[57px]');
  });
});
