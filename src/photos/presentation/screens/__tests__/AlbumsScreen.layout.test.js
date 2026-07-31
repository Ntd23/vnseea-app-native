const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/photos/presentation/screens/AlbumsScreen.tsx'),
  'utf8',
);

describe('AlbumsScreen presentation contract', () => {
  it('keeps the Home header treatment and renders album metadata', () => {
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={HEADER_SAFE_AREA_COLOR} />',
    );
    expect(source).toContain('album.albumName.trim()');
    expect(source).toContain('{album.photoCount}');
    expect(source).toContain('getPrivacyLabel(album.privacy, isVi)');
  });

  it('keeps album navigation and broken-cover fallback available', () => {
    expect(source).toContain('navigation.navigate(ROUTES.POST_DETAIL');
    expect(source).toContain('onError={() => setCoverFailed(true)}');
    expect(source).toContain("isVi ? 'Chưa có ảnh bìa' : 'No cover photo'");
  });
});
