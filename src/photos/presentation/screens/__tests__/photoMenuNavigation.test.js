const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('post photos menu navigation', () => {
  it('routes the App Bar Tập ảnh item to photos extracted from posts', () => {
    const drawer = read(
      'src/feed/presentation/components/HeaderProfileDrawer.tsx',
    );

    expect(drawer).toMatch(
      /case 'albums':[\s\S]*navigation\.navigate\(ROUTES\.MY_PHOTOS\);[\s\S]*return;/,
    );
    expect(drawer).not.toMatch(
      /case 'albums':[\s\S]{0,120}navigation\.navigate\(ROUTES\.ALBUMS\)/,
    );
  });

  it('keeps the Settings board Tập ảnh and Watch destinations distinct', () => {
    const viewModel = read(
      'src/settings/application/view-models/useSettingsViewModel.ts',
    );
    const screen = read(
      'src/settings/presentation/screens/SettingsScreen.tsx',
    );

    expect(viewModel).toContain(
      "{ id: 'post-photos', label: 'Tập ảnh', iconKey: 'Images' }",
    );
    expect(viewModel).toContain(
      "{ id: 'watch', label: 'Xem', iconKey: 'Image' }",
    );
    expect(screen).toMatch(
      /if \(id === 'post-photos'\) \{[\s\S]*?ROUTES\.MY_PHOTOS/,
    );
    expect(screen).toMatch(
      /if \(id === 'watch'\) \{[\s\S]*?ROUTES\.WATCH/,
    );
  });

  it('loads photo media from user posts instead of the albums list', () => {
    const repository = read(
      'src/photos/infrastructure/repositories/ApiPhotosRepository.ts',
    );
    const screen = read('src/photos/presentation/screens/MyPhotosScreen.tsx');

    expect(repository).toContain("type: 'photos'");
    expect(repository).toContain('rawPosts.flatMap(mapPostPhotos)');
    expect(screen).toContain('Ảnh từ các bài đăng của bạn.');
  });
});
