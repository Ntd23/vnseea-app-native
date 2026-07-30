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
  let voipRegisterHandler = null;
  let voipNotificationHandler = null;
  const callKeepHandlers = {};
  const oneSignalAddEventListener = jest.fn((eventName, handler) => {
    if (eventName === 'foregroundWillDisplay') {
      foregroundHandler = handler;
    }
  });
  const rtcAudioSession = {
    audioSessionDidActivate: jest.fn(),
    audioSessionDidDeactivate: jest.fn(),
  };
  const voipPushDefault = {
    addEventListener: jest.fn((eventName, handler) => {
      if (eventName === 'register') {
        voipRegisterHandler = handler;
      }
      if (eventName === 'notification') {
        voipNotificationHandler = handler;
      }
    }),
    registerVoipToken: jest.fn(),
    onVoipNotificationCompleted: jest.fn(),
  };
  const callKeepDefault = {
    setup: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn((eventName, handler) => {
      callKeepHandlers[eventName] = handler;
    }),
    displayIncomingCall: jest.fn(),
    startCall: jest.fn(),
    endCall: jest.fn(),
  };

  jest.doMock('react-native', () => ({
    NativeModules: {},
    Platform: { OS: os },
  }));
  jest.doMock('@livekit/react-native-webrtc', () => ({
    RTCAudioSession: rtcAudioSession,
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
    default: voipPushDefault,
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
  const cachePushToken = jest.fn().mockResolvedValue(undefined);
  jest.doMock(
    '../../../../shared-kernel/infrastructure/push/pushDeviceRegistration',
    () => ({
      cachePushToken,
      currentApnsEnvironment: () => 'sandbox',
    }),
  );

  const service = require('../nativeCallService');
  return {
    service,
    callKeepDefault,
    rtcAudioSession,
    voipPushDefault,
    cachePushToken,
    getForegroundHandler: () => foregroundHandler,
    getVoipRegisterHandler: () => voipRegisterHandler,
    getVoipNotificationHandler: () => voipNotificationHandler,
    getCallKeepHandler: eventName => callKeepHandlers[eventName],
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
    jest.dontMock('@livekit/react-native-webrtc');
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

  it('caches a sandbox PushKit token even before an authenticated session exists', async () => {
    const { service, cachePushToken, getVoipRegisterHandler } =
      loadServiceForPlatform('ios');

    await service.configureNativeCallService();
    getVoipRegisterHandler()('pushkit-token');
    await Promise.resolve();

    expect(cachePushToken).toHaveBeenCalledWith({
      provider: 'apns_voip',
      token: 'pushkit-token',
      apnsEnvironment: 'sandbox',
    });
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

  it('dismisses iOS VoIP close pushes instead of displaying a new incoming CallKit call', async () => {
    const {
      service,
      callKeepDefault,
      voipPushDefault,
      getVoipNotificationHandler,
    } = loadServiceForPlatform('ios');

    await service.configureNativeCallService();
    getVoipNotificationHandler()({
      ...directPayload,
      event_type: 'livekit_call_closed',
      status: 'ended',
    });
    await Promise.resolve();

    expect(callKeepDefault.displayIncomingCall).not.toHaveBeenCalled();
    expect(voipPushDefault.onVoipNotificationCompleted).toHaveBeenCalled();
  });

  it('filters closed VoIP pushes in AppDelegate before reportNewIncomingCall', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../../../ios/VNSEEA/AppDelegate.swift'),
      'utf8',
    );
    const pushHandlerIndex = source.indexOf('didReceiveIncomingPushWith payload');
    const reportIndex = source.indexOf('RNCallKeep.reportNewIncomingCall', pushHandlerIndex);
    const preReportBlock = source.slice(pushHandlerIndex, reportIndex);

    expect(pushHandlerIndex).toBeGreaterThan(-1);
    expect(reportIndex).toBeGreaterThan(pushHandlerIndex);
    expect(preReportBlock).toContain('isClosedLiveKitCallPush');
    expect(preReportBlock).toContain('completion()');
    expect(preReportBlock).toContain('return');
  });

  it('resolves nil CallKit audio activation to the only active iOS native call', async () => {
    const {
      service,
      rtcAudioSession,
      getCallKeepHandler,
    } = loadServiceForPlatform('ios');

    await service.configureNativeCallService();
    await service.startNativeOutgoingCall({
      callUuid: 'call-a',
      callType: 'audio',
      peer: { id: '7', name: 'Peer', avatar: '' },
    });

    const waitPromise = service.waitForNativeAudioSessionActivation('call-a', 50);
    getCallKeepHandler('didActivateAudioSession')();

    await expect(waitPromise).resolves.toMatchObject({
      activated: true,
      source: 'event',
      callUuid: 'call-a',
    });
    expect(rtcAudioSession.audioSessionDidActivate).not.toHaveBeenCalled();
    await expect(
      service.waitForNativeAudioSessionActivation('call-a', 50),
    ).resolves.toMatchObject({
      activated: true,
      source: 'recent',
      callUuid: 'call-a',
    });
  });

  it('does not resolve a CallKit audio waiter from another call activation', async () => {
    const { service, getCallKeepHandler } = loadServiceForPlatform('ios');

    await service.configureNativeCallService();
    await service.startNativeOutgoingCall({
      callUuid: 'call-a',
      callType: 'audio',
      peer: { id: '7', name: 'Peer A', avatar: '' },
    });
    await service.startNativeOutgoingCall({
      callUuid: 'call-b',
      callType: 'audio',
      peer: { id: '8', name: 'Peer B', avatar: '' },
    });

    const waitForA = service.waitForNativeAudioSessionActivation('call-a', 20);
    const waitForB = service.waitForNativeAudioSessionActivation('call-b', 20);
    getCallKeepHandler('didActivateAudioSession')({ callUUID: 'call-b' });

    await expect(waitForB).resolves.toMatchObject({
      activated: true,
      source: 'event',
      callUuid: 'call-b',
    });
    await expect(waitForA).resolves.toMatchObject({
      activated: false,
      source: 'timeout',
      callUuid: 'call-a',
    });
  });
});
