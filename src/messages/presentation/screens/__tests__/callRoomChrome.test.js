const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('active call chrome', () => {
  it('starts hidden for a connected call and toggles only from the media surface', () => {
    const hook = read(
      'src/messages/presentation/utils/useCallChromeVisibility.ts',
    );

    expect(hook).toContain('const initiallyVisible = !isConnected');
    expect(hook).toContain('animateChrome(!isConnected)');
    expect(hook).toContain('if (!isConnected) return');
    expect(hook).toContain('useNativeDriver: true');
  });

  it('uses the same animated chrome for audio and video calls', () => {
    const source = read(
      'src/messages/presentation/screens/CallRoomScreen.tsx',
    );

    expect(source.match(/useCallChromeVisibility\(/g)).toHaveLength(2);
    expect(source.match(/onPress=\{toggleChrome\}/g)).toHaveLength(2);
    expect(source).toContain('styles.topCallChrome');
    expect(source).toContain('styles.bottomCallChrome');
    expect(source).toContain('outputRange: [-96, 0]');
    expect(source).toContain('outputRange: [144, 0]');
  });

  it('keeps group video full-size while the header and toolbar slide away', () => {
    const source = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );

    expect(source).toContain('onPress={toggleChrome}');
    expect(source).toContain('outputRange: [-headerHeight, 0]');
    expect(source).toContain('outputRange: [controlsHeight, 0]');
    expect(source).not.toContain('style={callContentStyle}');
  });
});
