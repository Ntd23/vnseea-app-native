const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve(
  __dirname,
  '../messageRealtimeRuntime.ts',
);

describe('message realtime runtime', () => {
  it('uses one Socket.IO v4 transport for messages, presence and calls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const packageJson = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../../../../package.json'),
        'utf8',
      ),
    );
    const callSource = fs.readFileSync(
      path.resolve(__dirname, '../liveKitCallRealtime.ts'),
      'utf8',
    );

    expect(source).toContain("require('socket.io-client-v4')");
    expect(source).toContain("nuxtApiUrl('realtime/token')");
    expect(source).toContain("nextSocket.on('messages:count'");
    expect(source).toContain("nextSocket.on('message:typing'");
    expect(source).toContain("nextSocket.on('message:typing-stop'");
    expect(callSource).toContain('connectMessageRealtime');
    expect(callSource).toContain('subscribeToMessageRealtimeEvent');
    expect(callSource).not.toContain("require('socket.io-client')");
    expect(callSource).not.toContain('/mobile-socket/socket.io');
    expect(packageJson.dependencies['socket.io-client']).toBeUndefined();
    expect(packageJson.dependencies['socket.io-client-v4']).toBe(
      'npm:socket.io-client@4.8.3',
    );
  });

  it('debounces invalidations and exposes connection state for fallback polling', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('MESSAGE_INVALIDATION_DEBOUNCE_MS');
    expect(source).toContain('subscribeToMessageInvalidations');
    expect(source).toContain('subscribeToMessageRealtimeConnection');
    expect(source).toContain('AppState.addEventListener');
  });

  it('only polls an open chat while its route is focused', () => {
    const chatScreenSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../presentation/screens/ChatScreen.tsx',
      ),
      'utf8',
    );
    const chatViewModelSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../application/view-models/useChatViewModel.ts',
      ),
      'utf8',
    );

    expect(chatScreenSource).toContain('useIsFocused()');
    expect(chatScreenSource).toContain(
      'useChatViewModel(chat, isScreenFocused)',
    );
    expect(chatViewModelSource).toContain(
      'if (isRealtimeConnected || !isScreenFocused) return undefined;',
    );
    expect(chatViewModelSource).toContain(
      'CHAT_FALLBACK_POLL_DELAYS_MS',
    );
    expect(chatViewModelSource).toContain(
      'isRealtimeConnected ||\n      !isScreenFocused',
    );
    expect(chatViewModelSource).not.toContain('setInterval(');
  });
});
