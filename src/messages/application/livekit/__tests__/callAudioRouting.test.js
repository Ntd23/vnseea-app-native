const mockAudioSession = {
  configureAudio: jest.fn(() => Promise.resolve()),
  getAudioOutputs: jest.fn(() => Promise.resolve([])),
  selectAudioOutput: jest.fn(() => Promise.resolve()),
  setAppleAudioConfiguration: jest.fn(() => Promise.resolve()),
  setDefaultRemoteAudioTrackVolume: jest.fn(() => Promise.resolve()),
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
          audioTypeOptions: { audioMode: 'inCommunication' },
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
});
