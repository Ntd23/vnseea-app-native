const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expectCallbackForwarding(source, eventNames) {
  eventNames.forEach(({ eventName, state, update }) => {
    const eventIndex = source.indexOf(eventName);
    const updateIndex = source.indexOf(update, eventIndex);
    const callbackIndex = source.indexOf(`onConnectionStateChange?.('${state}')`, eventIndex);

    expect(eventIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBeGreaterThan(eventIndex);
    expect(callbackIndex).toBeGreaterThan(updateIndex);
  });
}

describe('LiveKit stream connection lifecycle callbacks', () => {
  it('defines the same optional connection callback contract on both platforms', () => {
    const defaultSource = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const iosSource = read('src/live/presentation/components/LiveKitStreamView.ios.tsx');

    [defaultSource, iosSource].forEach(source => {
      expect(source).toContain('onConnectionStateChange?:');
      expect(source).toContain("state: 'connected' | 'disconnected' | 'error',");
      expect(source).toContain('=> void;');
    });
  });

  it('forwards default LiveKit room lifecycle callbacks after message updates', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.tsx');
    expectCallbackForwarding(source, [
      { eventName: 'live_room_connected', state: 'connected', update: "setConnectionMessage('');" },
      { eventName: 'live_room_disconnected', state: 'disconnected', update: "setConnectionMessage('Đã ngắt kết nối live');" },
      { eventName: 'live_room_error', state: 'error', update: "setConnectionMessage('Không kết nối được live');" },
    ]);
    expect(source).toMatch(
      /\[\s*liveRole,\s*onConnectionStateChange,\s*(?:onVideoReady,\s*)?session\.roomName,\s*session\.streamName,\s*traceId,?\s*\]/,
    );
  });

  it('forwards native iOS lifecycle events after message updates', () => {
    const source = read('src/live/presentation/components/LiveKitStreamView.ios.tsx');
    expectCallbackForwarding(source, [
      { eventName: 'live_native_room_connected', state: 'connected', update: "setConnectionMessage('');" },
      { eventName: 'live_native_room_disconnected', state: 'disconnected', update: "setConnectionMessage('Đã ngắt kết nối live');" },
      { eventName: 'live_native_error', state: 'error', update: "setConnectionMessage('Không kết nối được live');" },
    ]);
    expect(source).toMatch(
      /\[\s*liveRole,\s*onConnectionStateChange,\s*(?:onVideoReady,\s*)?session\.roomName,\s*session\.streamName,\s*traceId,?\s*\]/,
    );
  });

  it('does not classify disconnect as host-ended', () => {
    const defaultSource = read('src/live/presentation/components/LiveKitStreamView.tsx');
    const iosSource = read('src/live/presentation/components/LiveKitStreamView.ios.tsx');

    expect(defaultSource).not.toContain("onConnectionStateChange?.('host-ended')");
    expect(iosSource).not.toContain("onConnectionStateChange?.('host-ended')");
  });
});
