let mockAppStateListener;
const mockSockets = [];
const mockGetAccessToken = jest.fn(() => 'access-token');

function createMockSocket() {
  const listeners = new Map();
  const socket = {
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, listener) => {
      listeners.set(event, listener);
      return socket;
    }),
    listeners,
  };
  mockSockets.push(socket);
  return socket;
}

const mockCreateSocket = jest.fn(() => createMockSocket());

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

function tokenResponse(token) {
  return {
    ok: true,
    json: async () => ({
      enabled: true,
      token,
      url: 'https://realtime.example.test',
    }),
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('message realtime runtime behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    mockAppStateListener = undefined;
    mockSockets.length = 0;
    mockCreateSocket.mockClear();
    mockGetAccessToken.mockReturnValue('access-token');
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
  });

  it('discards rejected socket auth and fetches a fresh realtime token', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(tokenResponse('socket-token-1'))
      .mockResolvedValueOnce(tokenResponse('socket-token-2'));

    const { subscribeToMessageInvalidations } = require('../messageRealtimeRuntime');
    const unsubscribe = subscribeToMessageInvalidations(() => undefined);
    await flushPromises();

    expect(mockCreateSocket).toHaveBeenCalledTimes(1);
    expect(mockCreateSocket.mock.calls[0][1].auth.token).toBe('socket-token-1');

    mockSockets[0].listeners.get('connect_error')?.(new Error('Unauthorized'));
    expect(mockSockets[0].disconnect).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(mockCreateSocket).toHaveBeenCalledTimes(2);
    expect(mockCreateSocket.mock.calls[1][1].auth.token).toBe('socket-token-2');
    unsubscribe();
  });

  it('ignores a realtime token response after the app session changes', async () => {
    let resolveTokenRequest;
    global.fetch = jest.fn(() =>
      new Promise(resolve => {
        resolveTokenRequest = resolve;
      }),
    );

    const { subscribeToMessageInvalidations } = require('../messageRealtimeRuntime');
    const unsubscribe = subscribeToMessageInvalidations(() => undefined);
    await flushPromises();

    mockGetAccessToken.mockReturnValue('new-access-token');
    resolveTokenRequest(tokenResponse('stale-socket-token'));
    await flushPromises();

    expect(mockCreateSocket).not.toHaveBeenCalled();
    unsubscribe();
  });
});
