const mockAudioSession = {
  configureAudio: jest.fn(() => Promise.resolve()),
  getAudioOutputs: jest.fn(() => Promise.resolve([])),
  selectAudioOutput: jest.fn(() => Promise.resolve()),
  setAppleAudioConfiguration: jest.fn(() => Promise.resolve()),
  setDefaultRemoteAudioTrackVolume: jest.fn(() => Promise.resolve()),
  startAudioSession: jest.fn(() => Promise.resolve()),
};
const mockSetIosCallAudioOutputPreference = jest.fn();

jest.mock('@livekit/react-native', () => ({
  AndroidAudioTypePresets: {
    communication: { audioMode: 'inCommunication' },
  },
  AudioSession: mockAudioSession,
}));

jest.mock('livekit-client', () => ({
  Track: { Kind: { Audio: 'audio' } },
}));

jest.mock('../iosCallAudioLifecycle', () => ({
  setIosCallAudioOutputPreference: mockSetIosCallAudioOutputPreference,
}));

const {
  applyCallAudioOutputMode,
  CALL_AUDIO_CAPTURE_DEFAULTS,
  configureCallAudioSession,
  defaultCallAudioOutputMode,
  resolveAudioOutput,
} = require('../callAudioRouting');

function buildRoomWithAudioTrack(setVolume) {
  return {
    remoteParticipants: new Map([
      [
        'remote-user',
        {
          audioTrackPublications: new Map([
            [
              'audio-track',
              {
                track: {
                  kind: 'audio',
                  setVolume,
                },
              },
            ],
          ]),
        },
      ],
    ]),
  };
}

function deferred() {
  let resolve;
  const promise = new Promise(nextResolve => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('call audio routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioSession.getAudioOutputs.mockResolvedValue([]);
  });

  it('uses earpiece for voice calls and speaker for video calls', () => {
    expect(defaultCallAudioOutputMode('audio')).toBe('earpiece');
    expect(defaultCallAudioOutputMode('video')).toBe('speaker');
    expect(resolveAudioOutput(['default', 'force_speaker'], 'earpiece')).toBe(
      'default',
    );
    expect(resolveAudioOutput(['default', 'force_speaker'], 'speaker')).toBe(
      'force_speaker',
    );
    expect(
      resolveAudioOutput(['earpiece', 'speaker', 'bluetooth'], 'bluetooth'),
    ).toBe('bluetooth');
    expect(resolveAudioOutput(['earpiece', 'speaker'], 'bluetooth')).toBe(
      undefined,
    );
  });

  it('enables communication audio plus echo, noise, and gain processing', async () => {
    await configureCallAudioSession('earpiece');

    expect(CALL_AUDIO_CAPTURE_DEFAULTS).toEqual({
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    });
    expect(mockAudioSession.configureAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          preferredOutputList: ['headset', 'bluetooth', 'earpiece', 'speaker'],
          audioTypeOptions: expect.objectContaining({
            audioMode: 'inCommunication',
            forceHandleAudioRouting: true,
          }),
        }),
        ios: { defaultOutput: 'earpiece' },
      }),
    );
  });

  it('mutes remote playout without changing the microphone state', async () => {
    const setVolume = jest.fn();
    const room = buildRoomWithAudioTrack(setVolume);

    await applyCallAudioOutputMode(room, 'muted');

    expect(
      mockAudioSession.setDefaultRemoteAudioTrackVolume,
    ).toHaveBeenCalledWith(0);
    expect(setVolume).toHaveBeenCalledWith(0);
    expect(mockAudioSession.selectAudioOutput).not.toHaveBeenCalled();
  });

  it('keeps the last requested remote volume when an earlier volume call is slow', async () => {
    const firstVolume = deferred();
    const setVolume = jest.fn();
    const room = buildRoomWithAudioTrack(setVolume);
    const { Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
    mockAudioSession.getAudioOutputs.mockResolvedValue(['earpiece']);
    mockAudioSession.setDefaultRemoteAudioTrackVolume
      .mockImplementationOnce(() => firstVolume.promise)
      .mockImplementation(() => Promise.resolve());

    try {
      const firstRequest = applyCallAudioOutputMode(room, 'earpiece');
      const latestRequest = applyCallAudioOutputMode(room, 'muted');
      firstVolume.resolve();

      const [firstResult, latestResult] = await Promise.all([
        firstRequest,
        latestRequest,
      ]);

      expect(firstResult.applied).toBe(false);
      expect(latestResult.applied).toBe(true);
      expect(
        mockAudioSession.setDefaultRemoteAudioTrackVolume.mock.calls.map(
          ([volume]) => volume,
        ),
      ).toEqual([1, 0]);
      expect(setVolume.mock.calls.map(([volume]) => volume)).toEqual([1, 0]);
    } finally {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it('does not unmute a muted call when Bluetooth permission is denied', async () => {
    const {
      NativeModules,
      PermissionsAndroid,
      Platform,
    } = require('react-native');
    const originalPlatform = Platform.OS;
    const originalVersion = Platform.Version;
    const originalCheck = PermissionsAndroid.check;
    const originalRequest = PermissionsAndroid.request;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 34,
    });
    PermissionsAndroid.check = jest.fn(() => Promise.resolve(false));
    PermissionsAndroid.request = jest.fn(() =>
      Promise.resolve(PermissionsAndroid.RESULTS.DENIED),
    );

    try {
      const mutedResult = await applyCallAudioOutputMode(null, 'muted');
      const bluetoothResult = await applyCallAudioOutputMode(null, 'bluetooth');

      expect(mutedResult.applied).toBe(true);
      expect(bluetoothResult.applied).toBe(false);
      expect(
        mockAudioSession.setDefaultRemoteAudioTrackVolume,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAudioSession.setDefaultRemoteAudioTrackVolume,
      ).toHaveBeenCalledWith(0);
      expect(NativeModules.VnseeaCallAudioRoute).toBeUndefined();
    } finally {
      PermissionsAndroid.check = originalCheck;
      PermissionsAndroid.request = originalRequest;
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
      Object.defineProperty(Platform, 'Version', {
        configurable: true,
        value: originalVersion,
      });
    }
  });

  it('restores remote playout and selects the requested speaker route', async () => {
    const setVolume = jest.fn();
    const room = buildRoomWithAudioTrack(setVolume);
    mockAudioSession.getAudioOutputs.mockResolvedValue(['earpiece', 'speaker']);

    await applyCallAudioOutputMode(room, 'speaker');

    expect(
      mockAudioSession.setDefaultRemoteAudioTrackVolume,
    ).toHaveBeenCalledWith(1);
    expect(setVolume).toHaveBeenCalledWith(1);
    expect(mockAudioSession.selectAudioOutput).toHaveBeenCalledWith('speaker');
  });

  it('verifies the physical Android earpiece route before reporting success', async () => {
    const { NativeModules, Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    const nativeRoute = {
      setOutput: jest.fn(() => Promise.resolve('earpiece')),
      getOutput: jest.fn(() => Promise.resolve('earpiece')),
      reset: jest.fn(() => Promise.resolve()),
    };
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    NativeModules.VnseeaCallAudioRoute = nativeRoute;
    mockAudioSession.getAudioOutputs.mockResolvedValue(['earpiece', 'speaker']);
    jest.useFakeTimers();

    try {
      const resultPromise = applyCallAudioOutputMode(null, 'earpiece');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(mockAudioSession.startAudioSession).toHaveBeenCalled();
      expect(mockAudioSession.selectAudioOutput).toHaveBeenCalledWith(
        'earpiece',
      );
      expect(nativeRoute.setOutput).toHaveBeenCalledWith('earpiece');
      expect(nativeRoute.getOutput).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          applied: true,
          mode: 'earpiece',
          reportedOutput: 'earpiece',
        }),
      );
    } finally {
      jest.useRealTimers();
      delete NativeModules.VnseeaCallAudioRoute;
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it('retries when an Android OEM moves the call back to speaker', async () => {
    const { NativeModules, Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    const nativeRoute = {
      setOutput: jest.fn(() => Promise.resolve('earpiece')),
      getOutput: jest
        .fn()
        .mockResolvedValueOnce('speaker')
        .mockResolvedValue('earpiece'),
      reset: jest.fn(() => Promise.resolve()),
    };
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    NativeModules.VnseeaCallAudioRoute = nativeRoute;
    mockAudioSession.getAudioOutputs.mockResolvedValue(['earpiece', 'speaker']);
    jest.useFakeTimers();

    try {
      const resultPromise = applyCallAudioOutputMode(null, 'earpiece');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(nativeRoute.setOutput).toHaveBeenCalledTimes(2);
      expect(nativeRoute.getOutput).toHaveBeenCalledTimes(2);
      expect(result).toEqual(
        expect.objectContaining({
          applied: true,
          reportedOutput: 'earpiece',
        }),
      );
    } finally {
      jest.useRealTimers();
      delete NativeModules.VnseeaCallAudioRoute;
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it('selects and verifies a connected Android Bluetooth call route', async () => {
    const { NativeModules, Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    const originalVersion = Platform.Version;
    const nativeRoute = {
      setOutput: jest.fn(() => Promise.resolve('bluetooth')),
      getOutput: jest.fn(() => Promise.resolve('bluetooth')),
      getAvailableOutputs: jest.fn(() =>
        Promise.resolve(['earpiece', 'speaker', 'bluetooth']),
      ),
      reset: jest.fn(() => Promise.resolve()),
    };
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 30,
    });
    NativeModules.VnseeaCallAudioRoute = nativeRoute;
    mockAudioSession.getAudioOutputs.mockResolvedValue([
      'earpiece',
      'speaker',
      'bluetooth',
    ]);
    jest.useFakeTimers();

    try {
      const resultPromise = applyCallAudioOutputMode(null, 'bluetooth');
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(mockAudioSession.selectAudioOutput).toHaveBeenCalledWith(
        'bluetooth',
      );
      expect(nativeRoute.setOutput).toHaveBeenCalledWith('bluetooth');
      expect(result).toEqual(
        expect.objectContaining({
          applied: true,
          mode: 'bluetooth',
          reportedOutput: 'bluetooth',
        }),
      );
    } finally {
      jest.useRealTimers();
      delete NativeModules.VnseeaCallAudioRoute;
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
      Object.defineProperty(Platform, 'Version', {
        configurable: true,
        value: originalVersion,
      });
    }
  });
});
