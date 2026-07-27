function loadClickHandler() {
  jest.resetModules();

  let clickHandler = null;
  const emit = jest.fn();

  jest.doMock('react-native', () => ({
    Platform: { OS: 'android' },
  }));
  jest.doMock('react-native-onesignal', () => ({
    LogLevel: { Verbose: 6 },
    OneSignal: {
      Debug: { setLogLevel: jest.fn() },
      initialize: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      User: {
        addEventListener: jest.fn(),
        pushSubscription: {
          addEventListener: jest.fn(),
          getIdAsync: jest.fn().mockResolvedValue(null),
          getTokenAsync: jest.fn().mockResolvedValue(null),
          getOptedInAsync: jest.fn().mockResolvedValue(true),
          optIn: jest.fn(),
          optOut: jest.fn(),
        },
      },
      Notifications: {
        addEventListener: jest.fn((eventName, handler) => {
          if (eventName === 'click') clickHandler = handler;
        }),
        getPermissionAsync: jest.fn().mockResolvedValue(true),
      },
    },
  }));
  jest.doMock('../../api/apiBridge', () => ({
    apiBridge: { post: jest.fn().mockResolvedValue({}) },
  }));
  jest.doMock('../../config/env', () => ({
    apiConfig: { oneSignalAppId: 'test-onesignal-app-id' },
  }));
  jest.doMock('../../notifications/messageNotificationIdentity', () => ({
    syncMessageNotificationIdentity: jest.fn(),
  }));
  jest.doMock('../../storage/sessionStorage', () => ({
    sessionStorage: {
      getSession: jest.fn(() => null),
      getUserProfile: jest.fn(() => null),
    },
  }));
  jest.doMock('../pushNotificationOpenEvents', () => ({
    pushNotificationOpenEvents: { emit },
  }));

  const { initializePushNotifications } = require('../oneSignalPush');
  initializePushNotifications();

  return { emit, getClickHandler: () => clickHandler };
}

describe('OneSignal notification click routing', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('publishes social notification data when the user taps a push', () => {
    const { emit, getClickHandler } = loadClickHandler();

    getClickHandler()({
      result: {},
      notification: {
        notificationId: 'push-42',
        title: 'Người gửi',
        body: 'đã thích bài viết của bạn',
        additionalData: {
          type: 'liked_post',
          post_id: '42',
          user_id: '7',
        },
      },
    });

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'push-42',
        additionalData: expect.objectContaining({
          type: 'liked_post',
          post_id: '42',
        }),
      }),
    );
  });

  it('leaves LiveKit notification clicks to the call flow', () => {
    const { emit, getClickHandler } = loadClickHandler();

    getClickHandler()({
      result: {},
      notification: {
        notificationId: 'call-push',
        title: 'Cuộc gọi',
        body: 'Cuộc gọi đến',
        additionalData: {
          provider: 'livekit',
          event_type: 'livekit_call',
        },
      },
    });

    expect(emit).not.toHaveBeenCalled();
  });
});
