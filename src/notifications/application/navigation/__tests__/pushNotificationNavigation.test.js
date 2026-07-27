const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function pushPayload(overrides = {}) {
  return {
    notificationId: 'onesignal-notification-1',
    title: 'Người gửi',
    body: 'đã bày tỏ cảm xúc về bài viết của bạn',
    additionalData: {
      push_kind: 'notification',
      type: 'liked_post',
      post_id: '42',
      user_id: '7',
    },
    openedAt: Date.now(),
    ...overrides,
  };
}

function loadHarness(initiallyReady) {
  jest.resetModules();

  let ready = initiallyReady;
  const navigationRef = {
    isReady: jest.fn(() => ready),
    navigate: jest.fn(),
  };
  const navigateToNotification = jest.fn().mockResolvedValue(undefined);

  jest.doMock('../../../../navigation/navigationRef', () => ({
    navigationRef,
  }));
  jest.doMock(
    '../../../../shared-kernel/infrastructure/storage/sessionStorage',
    () => ({
      sessionStorage: {
        getAccessToken: jest.fn(() => 'access-token'),
      },
    }),
  );
  jest.doMock('../navigateToNotification', () => ({
    navigateToNotification,
  }));
  jest.doMock('react-native-config', () => ({
    __esModule: true,
    default: {
      API_BASE_URL: 'https://api.example.test',
      WEB_BASE_URL: 'https://example.test',
      SERVER_KEY: 'test-server-key',
      REQUEST_TIMEOUT_MS: '1000',
    },
  }));

  const { pushNotificationOpenEvents } = require(
    '../../../../shared-kernel/infrastructure/push/pushNotificationOpenEvents'
  );
  const navigation = require('../pushNotificationNavigation');

  return {
    navigation,
    navigationRef,
    navigateToNotification,
    pushNotificationOpenEvents,
    setReady(nextReady) {
      ready = nextReady;
    },
  };
}

describe('push notification navigation', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('maps a social reaction push to the same post target as notification center data', () => {
    const { navigation } = loadHarness(true);

    const item = navigation.mapPushNotificationOpenPayload(pushPayload());

    expect(item).toEqual(
      expect.objectContaining({
        type: 'liked_post',
        postId: '42',
        notifierId: '7',
      }),
    );
    expect(item.notifier.name).toBe('Người gửi');
  });

  it('buffers a cold-start click until the root navigator is ready', async () => {
    const harness = loadHarness(false);
    const payload = pushPayload();

    // OneSignal can deliver the open event before the app-level subscriber
    // and NavigationContainer have mounted.
    harness.pushNotificationOpenEvents.emit(payload);
    harness.navigation.initializePushNotificationNavigation();

    expect(harness.navigateToNotification).not.toHaveBeenCalled();

    harness.setReady(true);
    await harness.navigation.flushPendingPushNotificationNavigation();

    expect(harness.navigateToNotification).toHaveBeenCalledTimes(1);
    expect(harness.navigateToNotification.mock.calls[0][0]).toEqual(
      expect.objectContaining({ postId: '42', type: 'liked_post' }),
    );
    expect(harness.navigateToNotification.mock.calls[0][1]).toBe(
      harness.navigationRef,
    );
  });

  it('navigates immediately when a foreground or background app is ready', async () => {
    const harness = loadHarness(true);
    harness.navigation.initializePushNotificationNavigation();

    harness.pushNotificationOpenEvents.emit(pushPayload());
    await harness.navigation.flushPendingPushNotificationNavigation();

    expect(harness.navigateToNotification).toHaveBeenCalledTimes(1);
  });

  it('registers the OneSignal click listener and flushes cold-start clicks on navigation ready', () => {
    const pushSource = fs.readFileSync(
      path.join(
        projectRoot,
        'src/shared-kernel/infrastructure/push/oneSignalPush.ts',
      ),
      'utf8',
    );
    const appSource = fs.readFileSync(path.join(projectRoot, 'App.tsx'), 'utf8');
    const navigatorSource = fs.readFileSync(
      path.join(projectRoot, 'src/navigation/AppNavigator.tsx'),
      'utf8',
    );
    const notificationsScreenSource = fs.readFileSync(
      path.join(
        projectRoot,
        'src/notifications/presentation/screens/NotificationsScreen.tsx',
      ),
      'utf8',
    );

    expect(pushSource).toContain(
      "OneSignal.Notifications.addEventListener('click', handleNotificationClick)",
    );
    expect(appSource.indexOf('initializePushNotificationNavigation();')).toBeLessThan(
      appSource.indexOf('initializePushNotifications();'),
    );
    expect(navigatorSource).toContain(
      'onReady={flushPendingPushNotificationNavigation}',
    );
    expect(notificationsScreenSource).toContain(
      "import { navigateToNotification } from '../../application/navigation/navigateToNotification';",
    );
  });
});
