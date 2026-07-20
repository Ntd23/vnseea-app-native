// Description: Guards the cached static-map preview used by shared-location chat cards.
const fs = require('fs');
const path = require('path');

const chatSource = fs.readFileSync(
  path.join(process.cwd(), 'src/messages/presentation/screens/ChatScreen.tsx'),
  'utf8',
);
const mapShareSource = fs.readFileSync(
  path.join(process.cwd(), 'src/user/application/utils/mapShare.ts'),
  'utf8',
);

describe('chat shared-location Google Map preview', () => {
  it('uses a cached static map image instead of mounting a native map per message', () => {
    expect(chatSource).toContain('buildStaticMapPreviewUrl');
    expect(chatSource).toContain("cache: 'force-cache' as const");
    expect(chatSource).toContain('progressiveRenderingEnabled');
    expect(chatSource).toContain('Image.prefetch(previewUrl)');
    expect(chatSource).not.toContain("from 'react-native-maps'");
    expect(chatSource).not.toContain('<MapView');
    expect(mapShareSource).toContain("size: '480x240'");
    expect(mapShareSource).toContain("format: 'jpg'");
  });

  it('caches parsed location messages and opens the full map only after a tap', () => {
    expect(chatSource).toContain('parsedMapShareMessageCache');
    expect(chatSource).toContain('MAP_SHARE_PARSE_CACHE_LIMIT');
    expect(chatSource).toContain('navigation.navigate(ROUTES.NEARBY_USERS');
    expect(chatSource).toContain('onPress={handleOpenMap}');
  });
});
