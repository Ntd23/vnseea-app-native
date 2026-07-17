const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadForegroundHandler(platform) {
  jest.resetModules();

  let foregroundHandler = null;
  const addEventListener = jest.fn((eventName, handler) => {
    if (eventName === 'foregroundWillDisplay') {
      foregroundHandler = handler;
    }
  });

  jest.doMock('react-native', () => ({
    Platform: { OS: platform },
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
        addEventListener,
        getPermissionAsync: jest.fn().mockResolvedValue(true),
        requestPermission: jest.fn().mockResolvedValue(true),
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

  const { foregroundPushEvents } = require('../foregroundPushEvents');
  const { initializePushNotifications } = require('../oneSignalPush');
  initializePushNotifications();

  return {
    foregroundPushEvents,
    getForegroundHandler: () => foregroundHandler,
  };
}

function createEvent(additionalData = {}) {
  const notification = {
    notificationId: 'push-123',
    title: 'VNSEEA',
    body: 'Bạn có một thông báo mới',
    additionalData,
    display: jest.fn(),
  };

  return {
    notification,
    event: {
      preventDefault: jest.fn(),
      getNotification: () => notification,
    },
  };
}

describe('OneSignal foreground notification display', () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.dontMock('react-native-onesignal');
    jest.dontMock('../../api/apiBridge');
    jest.dontMock('../../config/env');
    jest.dontMock('../../notifications/messageNotificationIdentity');
    jest.dontMock('../../storage/sessionStorage');
  });

  it('explicitly displays a regular foreground push and publishes a UI refresh event', () => {
    const { foregroundPushEvents, getForegroundHandler } =
      loadForegroundHandler('ios');
    const listener = jest.fn();
    foregroundPushEvents.subscribe(listener);
    const { event, notification } = createEvent({ type: 'reaction' });

    getForegroundHandler()(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(notification.display).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'push-123',
        title: 'VNSEEA',
        body: 'Bạn có một thông báo mới',
      }),
    );
  });

  it('leaves LiveKit foreground pushes to the existing call listener', () => {
    const { foregroundPushEvents, getForegroundHandler } =
      loadForegroundHandler('android');
    const listener = jest.fn();
    foregroundPushEvents.subscribe(listener);
    const { event, notification } = createEvent({
      provider: 'livekit',
      event_type: 'livekit_call',
    });

    getForegroundHandler()(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(notification.display).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('avoids duplicating Android message notifications posted by the native extension', () => {
    const { foregroundPushEvents, getForegroundHandler } =
      loadForegroundHandler('android');
    const listener = jest.fn();
    foregroundPushEvents.subscribe(listener);
    const { event, notification } = createEvent({
      type: 'user',
      user_id: '42',
    });

    getForegroundHandler()(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(notification.display).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not mistake a social notification with user_id for a replyable message', () => {
    const { foregroundPushEvents, getForegroundHandler } =
      loadForegroundHandler('android');
    const listener = jest.fn();
    foregroundPushEvents.subscribe(listener);
    const { event, notification } = createEvent({
      push_kind: 'notification',
      type: 'reaction',
      user_id: '42',
    });

    getForegroundHandler()(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(notification.display).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refreshes notification badges and the open notification list after a foreground push', () => {
    const badgeSource = read(
      'src/notifications/application/view-models/useNotificationBadgeViewModel.ts',
    );
    const listSource = read(
      'src/notifications/application/view-models/useNotificationsViewModel.ts',
    );

    expect(badgeSource).toContain('foregroundPushEvents.subscribe');
    expect(badgeSource).toContain('refresh().catch(() => undefined)');
    expect(listSource).toContain('foregroundPushEvents.subscribe');
    expect(listSource).toContain('loadFirstPage(false, true)');
  });
});
