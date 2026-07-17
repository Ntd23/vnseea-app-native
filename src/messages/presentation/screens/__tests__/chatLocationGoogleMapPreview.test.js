// Description: Guards the native Google Map background used by shared-location chat cards.
const fs = require('fs');
const path = require('path');

const chatSource = fs.readFileSync(
  path.join(process.cwd(), 'src/messages/presentation/screens/ChatScreen.tsx'),
  'utf8',
);

describe('chat shared-location Google Map preview', () => {
  it('renders a non-interactive native Google Map centered on the shared coordinates', () => {
    expect(chatSource).toContain(
      "import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'",
    );
    expect(chatSource).toContain('provider={PROVIDER_GOOGLE}');
    expect(chatSource).toContain('initialRegion={mapRegion}');
    expect(chatSource).toContain("liteMode={Platform.OS === 'android'}");
    expect(chatSource).toContain('pointerEvents="none"');
  });

  it('does not fall back to the decorative fake-road background', () => {
    expect(chatSource).not.toContain('mapShareLargeMapFallback');
    expect(chatSource).not.toContain('mapShareFallbackRoadOne');
  });
});
