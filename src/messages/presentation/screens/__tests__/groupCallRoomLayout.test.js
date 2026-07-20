const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('group call room responsive gallery', () => {
  it('keeps two callers wide and reserves space for visible call chrome', () => {
    const source = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );

    expect(source).toContain('useWindowDimensions');
    expect(source).toContain('const [gallerySize, setGallerySize]');
    expect(source).toContain('const tileWidth = Math.max(');
    expect(source).toContain('const tileHeight =');
    expect(source).toContain('columnWrapperStyle');
    expect(source).toContain('ItemSeparatorComponent');
    expect(source).toContain('participants.length <= 2');
    expect(source).toContain('const [isChromeVisible, setChromeVisible]');
    expect(source).toContain('Animated.timing(chromeProgress');
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain(
      'screenWidth - safeAreaInsets.left - safeAreaInsets.right - 24',
    );
    expect(source).toContain('paddingTop: isChromeVisible ? headerHeight : 0');
    expect(source).toContain(
      'paddingBottom: isChromeVisible ? controlsHeight : 0',
    );
    expect(source).toContain('absolute bottom-0 left-0 right-0 z-20');
    expect(source).toContain('absolute left-0 right-0 top-0 z-20');
  });

  it('places the compact audio output picker inside the bottom toolbar', () => {
    const roomSource = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );
    const selectorSource = read(
      'src/messages/presentation/components/CallAudioOutputSelector.tsx',
    );

    expect(roomSource).toContain('<CallAudioOutputSelector');
    expect(roomSource).toContain('compact');
    expect(roomSource).toContain('triggerSize={controlSize}');
    expect(selectorSource).toContain('compact?: boolean');
    expect(selectorSource).toContain('triggerSize?: number');
    expect(selectorSource).toContain('compact ? null : (');
  });

  it('lets the final participant span both columns when the count is odd', () => {
    const source = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );

    expect(source).toContain('const fullRowTileWidth = Math.max(');
    expect(source).toContain('const spansFullRow =');
    expect(source).toContain('participants.length % 2 === 1');
    expect(source).toContain('index === participants.length - 1');
    expect(source).toContain(
      'tileWidth={spansFullRow ? fullRowTileWidth : tileWidth}',
    );
  });
});
