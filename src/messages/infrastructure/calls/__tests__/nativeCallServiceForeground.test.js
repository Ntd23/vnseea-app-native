const directPayload = {
  provider: 'livekit',
  event_type: 'livekit_call',
  call_id: '42',
  call_type: 'video',
  room_name: 'room-42',
  from_id: '7',
  name: 'Caller',
  avatar: 'https://example.com/a.jpg',
};

function loadServiceForPlatform(os) {
  jest.resetModules();

  let foregroundHandler = null;
  const oneSignalAddEventListener = jest.fn((eventName, handler) => {
    if (eventName === 'foregroundWillDisplay') {
      foregroundHandler = handler;
    }
  });
  const callKeepDefault = {
    setup: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    displayIncomingCall: jest.fn(),
    startCall: jest.fn(),
    endCall: jest.fn(),
  };

  jest.doMock('react-native', () => ({
    NativeModules: {},
    Platform: { OS: os },
  }));
  jest.doMock('react-native-onesignal', () => ({
    OneSignal: {
      Notifications: {
        addEventListener: oneSignalAddEventListener,
      },
    },
  }));
  jest.doMock('react-native-callkeep', () => ({
    __esModule: true,
    default: callKeepDefault,
    AudioSessionCategoryOption: {},
    AudioSessionMode: {},
  }));
  jest.doMock('react-native-voip-push-notification', () => ({
    __esModule: true,
    default: {
      addEventListener: jest.fn(),
      registerVoipToken: jest.fn(),
      onVoipNotificationCompleted: jest.fn(),
    },
  }));
  jest.doMock(
    '../../../../shared-kernel/application/constants/route-registry',
    () => ({
      apiRoutes: {
        messages: {
          livekit: '/api/livekit',
        },
      },
    }),
  );
  jest.doMock('../../../../shared-kernel/infrastructure/api/apiBridge', () => ({
    apiBridge: {
      post: jest.fn().mockResolvedValue({}),
    },
  }));

  const service = require('../nativeCallService');
  return {
    service,
    callKeepDefault,
    getForegroundHandler: () => foregroundHandler,
  };
}

function createForegroundEvent(payload) {
  return {
    preventDefault: jest.fn(),
    getNotification: () => ({ additionalData: payload }),
  };
}

describe('native call service foreground incoming push handling', () => {
  afterEach(() => {
    jest.dontMock('react-native');
    jest.dontMock('react-native-onesignal');
    jest.dontMock('react-native-callkeep');
    jest.dontMock('react-native-voip-push-notification');
  });

  it('uses CallKit instead of the custom incoming modal for iOS foreground call pushes', async () => {
    const { service, callKeepDefault, getForegroundHandler } =
      loadServiceForPlatform('ios');
    const onIncoming = jest.fn();

    await service.configureNativeCallService();
    service.setNativeCallListeners({ onIncoming });

    const event = createForegroundEvent(directPayload);
    getForegroundHandler()(event);
    await Promise.resolve();

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onIncoming).not.toHaveBeenCalled();
    expect(callKeepDefault.displayIncomingCall).toHaveBeenCalledTimes(1);
  });

  it('keeps the custom incoming modal callback for Android foreground call pushes', async () => {
    const { service, callKeepDefault, getForegroundHandler } =
      loadServiceForPlatform('android');
    const onIncoming = jest.fn();

    await service.configureNativeCallService();
    service.setNativeCallListeners({ onIncoming });

    const event = createForegroundEvent(directPayload);
    getForegroundHandler()(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onIncoming).toHaveBeenCalledTimes(1);
    expect(callKeepDefault.displayIncomingCall).not.toHaveBeenCalled();
  });
});
