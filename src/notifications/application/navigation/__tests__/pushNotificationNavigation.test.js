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
      recipient_id: '42',
    },
    openedAt: Date.now(),
    ...overrides,
  };
}

function loadHarness(
  initiallyReady,
  {
    accessToken = 'access-token',
    userId = '42',
    preserveStorage = false,
  } = {},
) {
  jest.resetModules();

  let ready = initiallyReady;
  const navigationRef = {
    isReady: jest.fn(() => ready),
    navigate: jest.fn(),
  };
  const navigateToNotification = jest.fn().mockResolvedValue(undefined);
  const mockMarkAsSeen = jest.fn().mockResolvedValue(undefined);

  jest.doMock('../../../../navigation/navigationRef', () => ({
    navigationRef,
  }));
  jest.doMock(
    '../../../../shared-kernel/infrastructure/storage/sessionStorage',
    () => ({
      sessionStorage: {
        getAccessToken: jest.fn(() => accessToken),
        getSession: jest.fn(() =>
          accessToken ? { accessToken, userId } : null,
        ),
      },
    }),
  );
  jest.doMock(
    '../../../infrastructure/repositories/ApiNotificationsRepository',
    () => {
      const actual = jest.requireActual(
        '../../../infrastructure/repositories/ApiNotificationsRepository',
      );
      return {
        ...actual,
        createNotificationsRepository: () => ({ markAsSeen: mockMarkAsSeen }),
      };
    },
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
  const { pushNavigationStorage } = require('../pushNavigationStorage');
  if (!preserveStorage) {
    pushNavigationStorage.clear();
  }

  return {
    navigation,
    navigationRef,
    navigateToNotification,
    pushNotificationOpenEvents,
    pushNavigationStorage,
    markAsSeen: mockMarkAsSeen,
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

    const item = navigation.mapPushNotificationOpenPayload(
      pushPayload({
        additionalData: {
          push_kind: 'notification',
          payload_kind: 'social',
          notification_type: 'reaction',
          type: 'reaction',
          type2: '1',
          notification_id: '77',
          post_id: '42',
          notifier_id: '7',
          recipient_id: '42',
        },
      }),
    );

    expect(item).toEqual(
      expect.objectContaining({
        type: 'reaction',
        type2: '1',
        postId: '42',
        notifierId: '7',
      }),
    );
    expect(item.notifier.name).toBe('Người gửi');
  });

  it('preserves canonical social routing fields through cold-start storage', async () => {
    const loggedOut = loadHarness(false, { accessToken: null });
    loggedOut.navigation.initializePushNotificationNavigation();
    loggedOut.pushNotificationOpenEvents.emit(
      pushPayload({
        additionalData: {
          push_kind: 'notification',
          payload_kind: 'social',
          notification_type: 'liked_page',
          type: 'liked_page',
          type2: 'page',
          notification_id: '88',
          notifier_id: '7',
          recipient_id: '42',
          page_id: '15',
          url: 'index.php?link1=timeline&u=vnseea-page',
        },
      }),
    );

    const loggedIn = loadHarness(true, { preserveStorage: true });
    loggedIn.navigation.initializePushNotificationNavigation();
    await loggedIn.navigation.flushPendingPushNotificationNavigation();

    expect(loggedIn.navigateToNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'liked_page',
        type2: 'page',
        notifierId: '7',
        pageId: '15',
      }),
      loggedIn.navigationRef,
    );
  });

  it('preserves comment focus for a social push target', () => {
    const { navigation } = loadHarness(true);

    const item = navigation.mapPushNotificationOpenPayload(
      pushPayload({
        additionalData: {
          push_kind: 'notification',
          payload_kind: 'social',
          notification_type: 'reaction',
          type: 'reaction',
          notification_id: '89',
          notifier_id: '7',
          recipient_id: '42',
          post_id: '15',
          focus_comments: '1',
        },
      }),
    );

    expect(item).toEqual(
      expect.objectContaining({
        type: 'reaction',
        postId: '15',
        focusComments: true,
      }),
    );
  });

  it('preserves the exact Story target for Story reaction pushes', () => {
    const { navigation } = loadHarness(true);

    const item = navigation.mapPushNotificationOpenPayload(
      pushPayload({
        additionalData: {
          push_kind: 'notification',
          payload_kind: 'social',
          notification_type: 'reaction',
          type: 'reaction',
          notification_id: '90',
          notifier_id: '7',
          recipient_id: '42',
          story_id: '145',
          text: 'story',
        },
      }),
    );

    expect(item).toEqual(
      expect.objectContaining({
        type: 'reaction',
        storyId: '145',
      }),
    );
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

  it('persists a logged-out cold start and restores it after login', async () => {
    const loggedOut = loadHarness(false, { accessToken: null });
    loggedOut.navigation.initializePushNotificationNavigation();
    loggedOut.pushNotificationOpenEvents.emit(pushPayload());

    expect(loggedOut.pushNavigationStorage.getOpen()).not.toBeNull();

    const loggedIn = loadHarness(true, { preserveStorage: true });
    loggedIn.navigation.initializePushNotificationNavigation();
    await loggedIn.navigation.flushPendingPushNotificationNavigation();

    expect(loggedIn.navigateToNotification).toHaveBeenCalledTimes(1);
    expect(loggedIn.pushNavigationStorage.getOpen()).toBeNull();
  });

  it('keeps a logged-out push pending until the matching account signs in', async () => {
    const loggedOut = loadHarness(false, { accessToken: null });
    loggedOut.navigation.initializePushNotificationNavigation();
    loggedOut.pushNotificationOpenEvents.emit(pushPayload());

    const wrongAccount = loadHarness(true, {
      userId: '99',
      preserveStorage: true,
    });
    wrongAccount.navigation.initializePushNotificationNavigation();
    await wrongAccount.navigation.flushPendingPushNotificationNavigation();

    expect(wrongAccount.navigateToNotification).not.toHaveBeenCalled();
    expect(wrongAccount.pushNavigationStorage.getOpen()).not.toBeNull();

    const matchingAccount = loadHarness(true, {
      userId: '42',
      preserveStorage: true,
    });
    matchingAccount.navigation.initializePushNotificationNavigation();
    await matchingAccount.navigation.flushPendingPushNotificationNavigation();

    expect(matchingAccount.navigateToNotification).toHaveBeenCalledTimes(1);
    expect(matchingAccount.pushNavigationStorage.getOpen()).toBeNull();
  });

  it('marks a backend notification as seen only after navigation succeeds', async () => {
    const harness = loadHarness(true);
    harness.navigation.initializePushNotificationNavigation();
    harness.pushNotificationOpenEvents.emit(
      pushPayload({
        additionalData: {
          type: 'liked_post',
          post_id: '42',
          notification_id: '77',
          recipient_id: '42',
        },
      }),
    );

    await harness.navigation.flushPendingPushNotificationNavigation();
    await harness.navigation.flushPendingPushNotificationReadReceipts();

    expect(harness.navigateToNotification).toHaveBeenCalledTimes(1);
    expect(harness.markAsSeen).toHaveBeenCalledWith('77');
    expect(harness.pushNavigationStorage.getReadReceipts('42')).toEqual([]);
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
