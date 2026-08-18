let mockAppStateListener;
const mockSocketListeners = new Map();
const mockSocket = {
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn((event, listener) => {
    mockSocketListeners.set(event, listener);
    return mockSocket;
  }),
};
const mockCreateSocket = jest.fn(() => mockSocket);
const mockGetAccessToken = jest.fn(() => 'access-token');

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_event, listener) => {
      mockAppStateListener = listener;
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('socket.io-client-v4', () => ({
  io: (...args) => mockCreateSocket(...args),
}));

jest.mock('../../../../shared-kernel/infrastructure/config/env', () => ({
  apiConfig: { webBaseUrl: 'https://example.test' },
}));

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({
    sessionStorage: { getAccessToken: () => mockGetAccessToken() },
  }),
);

jest.mock('../../repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({
    getPostById: jest.fn(),
  }),
}));

function createTokenResponse() {
  return {
    ok: true,
    json: async () => ({
      enabled: true,
      token: 'socket-token',
      url: 'wss://realtime.example.test/',
    }),
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('post realtime runtime behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    mockAppStateListener = undefined;
    mockSocket.connected = false;
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
    mockSocketListeners.clear();
    mockCreateSocket.mockClear();
    mockGetAccessToken.mockReturnValue('access-token');
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
  });

  it('keeps the socket alive while a visible-post watch is being replaced', async () => {
    global.fetch = jest.fn().mockResolvedValue(createTokenResponse());
    const { postRealtimeRuntime } = require('../postRealtimeRuntime');

    const releaseFirstWatch = postRealtimeRuntime.watchPosts(['1']);
    await flushPromises();
    expect(mockCreateSocket).toHaveBeenCalledTimes(1);

    releaseFirstWatch();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();

    const releaseSecondWatch = postRealtimeRuntime.watchPosts(['2']);
    jest.runOnlyPendingTimers();

    expect(mockSocket.disconnect).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    releaseSecondWatch();
  });

  it('aborts stale auth without letting its completion clear a replacement request', async () => {
    const pendingResponses = [];
    global.fetch = jest.fn((_url, options) => {
      let resolve;
      const promise = new Promise(nextResolve => {
        resolve = nextResolve;
      });
      pendingResponses.push({ resolve, signal: options.signal });
      return promise;
    });
    const { postRealtimeRuntime } = require('../postRealtimeRuntime');

    const releaseFirstWatch = postRealtimeRuntime.watchPosts(['1']);
    releaseFirstWatch();
    jest.runOnlyPendingTimers();
    expect(pendingResponses[0].signal.aborted).toBe(true);

    const releaseSecondWatch = postRealtimeRuntime.watchPosts(['2']);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    pendingResponses[0].resolve(createTokenResponse());
    await flushPromises();
    expect(mockCreateSocket).not.toHaveBeenCalled();

    pendingResponses[1].resolve(createTokenResponse());
    await flushPromises();
    expect(mockCreateSocket).toHaveBeenCalledTimes(1);
    releaseSecondWatch();
  });

  it('releases a pending auth request immediately when the app backgrounds', () => {
    global.fetch = jest.fn((_url, options) => new Promise(() => options));
    const { postRealtimeRuntime } = require('../postRealtimeRuntime');

    postRealtimeRuntime.watchPosts(['1']);
    const signal = global.fetch.mock.calls[0][1].signal;
    mockAppStateListener('background');

    expect(signal.aborted).toBe(true);
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
