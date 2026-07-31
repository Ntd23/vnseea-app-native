const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/photos/presentation/screens/CreateAlbumScreen.tsx',
  ),
  'utf8',
);

describe('CreateAlbumScreen presentation contract', () => {
  it('matches the Home header treatment and modern card layout', () => {
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={HEADER_SAFE_AREA_COLOR} />',
    );
    expect(source).toContain('style={styles.formCard}');
    expect(source).toContain('style={styles.photoPicker}');
    expect(source).toContain('style={styles.privacyList}');
  });

  it('keeps image management and the fixed creation action available', () => {
    expect(source).toContain('removeImage(index)');
    expect(source).toContain('contentContainerStyle={styles.thumbnailList}');
    expect(source).toContain("<SafeAreaView edges={['bottom']}");
    expect(source).toContain('onPress={publishAlbum}');
  });
});
