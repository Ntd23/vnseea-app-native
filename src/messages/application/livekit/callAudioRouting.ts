// Description: Keeps call audio routing, remote playout muting, and voice-processing defaults consistent.
import { Platform } from 'react-native';
import { AndroidAudioTypePresets, AudioSession } from '@livekit/react-native';
import { Track, type Room } from 'livekit-client';
import { setIosCallAudioOutputPreference } from './iosCallAudioLifecycle';

export type CallAudioOutputMode = 'earpiece' | 'speaker' | 'muted';
export type AudibleCallAudioOutputMode = Exclude<CallAudioOutputMode, 'muted'>;

type AudioOutputId =
  | 'speaker'
  | 'earpiece'
  | 'headset'
  | 'bluetooth'
  | 'default'
  | 'force_speaker';

type RemoteAudioTrackLike = {
  kind?: string;
  setVolume?: (volume: number) => void;
};

export const CALL_AUDIO_CAPTURE_DEFAULTS = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
} as const;

export function defaultCallAudioOutputMode(
  mediaKind: 'audio' | 'video',
): AudibleCallAudioOutputMode {
  return mediaKind === 'video' ? 'speaker' : 'earpiece';
}

export function resolveAudioOutput(
  outputs: string[],
  mode: AudibleCallAudioOutputMode,
): AudioOutputId | undefined {
  if (mode === 'speaker') {
    if (outputs.includes('force_speaker')) return 'force_speaker';
    if (outputs.includes('speaker')) return 'speaker';
    return undefined;
  }

  if (outputs.includes('earpiece')) return 'earpiece';
  if (outputs.includes('default')) return 'default';
  return undefined;
}

export async function configureCallAudioSession(
  initialMode: AudibleCallAudioOutputMode,
) {
  await AudioSession.configureAudio({
    android: {
      preferredOutputList:
        initialMode === 'speaker'
          ? ['bluetooth', 'headset', 'speaker', 'earpiece']
          : ['bluetooth', 'headset', 'earpiece', 'speaker'],
      audioTypeOptions: AndroidAudioTypePresets.communication,
    },
    ios: {
      defaultOutput: initialMode,
    },
  });
  await AudioSession.setDefaultRemoteAudioTrackVolume(1).catch(() => undefined);
}

export function setRemoteAudioTrackOutputMode(
  track: unknown,
  mode: CallAudioOutputMode,
) {
  const audioTrack = track as RemoteAudioTrackLike | undefined;
  if (
    !audioTrack ||
    (audioTrack.kind !== Track.Kind.Audio && audioTrack.kind !== 'audio')
  ) {
    return;
  }
  audioTrack.setVolume?.(mode === 'muted' ? 0 : 1);
}

function setRoomRemoteAudioVolume(room: Room | null, volume: number) {
  room?.remoteParticipants.forEach(participant => {
    participant.audioTrackPublications.forEach(publication => {
      setRemoteAudioTrackOutputMode(
        publication.track,
        volume === 0 ? 'muted' : 'speaker',
      );
    });
  });
}

async function configureIosOutput(mode: AudibleCallAudioOutputMode) {
  if (Platform.OS !== 'ios') return;
  const preferSpeakerOutput = mode === 'speaker';
  setIosCallAudioOutputPreference(preferSpeakerOutput);
  await AudioSession.setAppleAudioConfiguration({
    audioCategory: 'playAndRecord',
    audioCategoryOptions: [
      'allowBluetooth',
      ...(preferSpeakerOutput ? (['defaultToSpeaker'] as const) : []),
      'mixWithOthers',
    ],
    audioMode: preferSpeakerOutput ? 'videoChat' : 'voiceChat',
  }).catch(() => undefined);
}

export async function applyCallAudioOutputMode(
  room: Room | null,
  mode: CallAudioOutputMode,
) {
  const volume = mode === 'muted' ? 0 : 1;
  await AudioSession.setDefaultRemoteAudioTrackVolume(volume).catch(
    () => undefined,
  );
  setRoomRemoteAudioVolume(room, volume);

  if (mode === 'muted') return;

  await configureIosOutput(mode);
  const outputs = await AudioSession.getAudioOutputs().catch(() => []);
  const output = resolveAudioOutput(outputs, mode);
  if (output) {
    await AudioSession.selectAudioOutput(output).catch(() => undefined);
  }
}

export function resetCallRemoteAudioVolume() {
  AudioSession.setDefaultRemoteAudioTrackVolume(1).catch(() => undefined);
}
