// Description: Keeps call audio routing, remote playout muting, and voice-processing defaults consistent.
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { AndroidAudioTypePresets, AudioSession } from '@livekit/react-native';
import { Track, type Room } from 'livekit-client';
import { setIosCallAudioOutputPreference } from './iosCallAudioLifecycle';

export type CallAudioOutputMode =
  | 'earpiece'
  | 'speaker'
  | 'bluetooth'
  | 'muted';
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

type AndroidCallAudioRouteModule = {
  setOutput?: (output: AudibleCallAudioOutputMode) => Promise<string>;
  cancelPending?: () => Promise<void>;
  getOutput?: () => Promise<string>;
  getAvailableOutputs?: () => Promise<string[]>;
  reset?: () => Promise<void>;
};

export type CallAudioOutputApplyResult = {
  applied: boolean;
  mode: CallAudioOutputMode;
  selectedOutput?: string;
  reportedOutput?: string;
};

const ANDROID_ROUTE_RETRY_DELAYS_MS = [80, 160, 320] as const;
const ANDROID_ROUTE_VERIFY_DELAY_MS = 80;
let androidRouteRequestId = 0;
let androidRouteQueue: Promise<void> = Promise.resolve();
let callAudioRequestId = 0;
let remoteAudioVolumeQueue: Promise<void> = Promise.resolve();
let iosRouteQueue: Promise<void> = Promise.resolve();

export const CALL_AUDIO_CAPTURE_DEFAULTS = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
} as const;

function getAndroidCallAudioRouteModule() {
  if (Platform.OS !== 'android') return null;
  return (
    (NativeModules.VnseeaCallAudioRoute as
      | AndroidCallAudioRouteModule
      | undefined) ?? null
  );
}

function waitForRoute(milliseconds: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function enqueueAndroidRoute<T>(task: () => Promise<T>) {
  const next = androidRouteQueue.then(task, task);
  androidRouteQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function enqueueRemoteAudioVolume(room: Room | null, volume: number) {
  const next = remoteAudioVolumeQueue.then(async () => {
    await AudioSession.setDefaultRemoteAudioTrackVolume(volume).catch(
      () => undefined,
    );
    setRoomRemoteAudioVolume(room, volume);
  });
  remoteAudioVolumeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function enqueueIosRoute<T>(task: () => Promise<T>) {
  const next = iosRouteQueue.then(task, task);
  iosRouteQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function defaultCallAudioOutputMode(
  mediaKind: 'audio' | 'video',
): AudibleCallAudioOutputMode {
  return mediaKind === 'video' ? 'speaker' : 'earpiece';
}

export function resolveAudioOutput(
  outputs: string[],
  mode: AudibleCallAudioOutputMode,
): AudioOutputId | undefined {
  if (mode === 'bluetooth') {
    if (outputs.includes('bluetooth')) return 'bluetooth';
    return undefined;
  }

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
          ? ['headset', 'bluetooth', 'speaker', 'earpiece']
          : initialMode === 'bluetooth'
          ? ['bluetooth', 'headset', 'earpiece', 'speaker']
          : ['headset', 'bluetooth', 'earpiece', 'speaker'],
      audioTypeOptions: {
        ...AndroidAudioTypePresets.communication,
        // AudioSwitch otherwise disables manual routing on some OEM audio
        // stacks while MODE_IN_COMMUNICATION is active.
        forceHandleAudioRouting: true,
      },
    },
    ios: {
      defaultOutput: initialMode === 'speaker' ? 'speaker' : 'earpiece',
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

export async function ensureCallBluetoothPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  if (await PermissionsAndroid.check(permission)) return true;

  const result = await PermissionsAndroid.request(permission, {
    title: 'Kết nối tai nghe Bluetooth',
    message:
      'VNSEEA cần quyền kết nối thiết bị ở gần để dùng tai nghe Bluetooth trong cuộc gọi.',
    buttonPositive: 'Cho phép',
    buttonNegative: 'Để sau',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getAvailableCallAudioOutputs() {
  await AudioSession.startAudioSession().catch(() => undefined);
  const liveKitOutputs = await AudioSession.getAudioOutputs().catch(() => []);
  const nativeOutputs =
    Platform.OS === 'android'
      ? await getAndroidCallAudioRouteModule()
          ?.getAvailableOutputs?.()
          .catch(() => [])
      : [];
  const outputs = new Set<string>([
    ...liveKitOutputs,
    ...(nativeOutputs ?? []),
  ]);

  // LiveKit exposes iOS Bluetooth/AirPods through the native route picker,
  // rather than through getAudioOutputs().
  if (Platform.OS === 'ios') outputs.add('bluetooth');
  return Array.from(outputs);
}

async function applyAndroidOutput(
  mode: AudibleCallAudioOutputMode,
  requestId: number,
): Promise<CallAudioOutputApplyResult> {
  return enqueueAndroidRoute(async () => {
    const nativeRoute = getAndroidCallAudioRouteModule();
    let selectedOutput: AudioOutputId | undefined;
    let reportedOutput: string | undefined;

    // startAudioSession is asynchronous inside LiveKit's Android bridge.  The
    // retries below give AudioSwitch time to publish its devices, then apply
    // our exact built-in route after its queued selection has completed.
    await AudioSession.startAudioSession().catch(() => undefined);

    for (const delayMs of ANDROID_ROUTE_RETRY_DELAYS_MS) {
      if (requestId !== androidRouteRequestId) {
        return { applied: false, mode, selectedOutput, reportedOutput };
      }

      const outputs = await AudioSession.getAudioOutputs().catch(() => []);
      selectedOutput = resolveAudioOutput(outputs, mode);
      if (selectedOutput) {
        await AudioSession.selectAudioOutput(selectedOutput).catch(
          () => undefined,
        );
      }

      // Older builds can run briefly without the app bridge.  Keep LiveKit's
      // route as a safe fallback, but new builds verify the physical route.
      if (!nativeRoute?.setOutput) {
        return {
          applied:
            requestId === androidRouteRequestId && Boolean(selectedOutput),
          mode,
          selectedOutput,
        };
      }

      await waitForRoute(delayMs);
      if (requestId !== androidRouteRequestId) {
        return { applied: false, mode, selectedOutput, reportedOutput };
      }
      reportedOutput = await nativeRoute.setOutput(mode).catch(() => undefined);
      await waitForRoute(ANDROID_ROUTE_VERIFY_DELAY_MS);
      reportedOutput =
        (await nativeRoute.getOutput?.().catch(() => undefined)) ??
        reportedOutput;

      if (requestId === androidRouteRequestId && reportedOutput === mode) {
        return {
          applied: true,
          mode,
          selectedOutput,
          reportedOutput,
        };
      }
    }

    console.warn('[CallAudioRoute] Android did not apply requested output.', {
      mode,
      selectedOutput,
      reportedOutput,
    });
    return {
      applied: false,
      mode,
      selectedOutput,
      reportedOutput,
    };
  });
}

async function applyIosOutput(
  mode: AudibleCallAudioOutputMode,
  requestId: number,
): Promise<CallAudioOutputApplyResult> {
  return enqueueIosRoute(async () => {
    if (requestId !== callAudioRequestId) {
      return { applied: false, mode };
    }

    await configureIosOutput(mode);
    if (requestId !== callAudioRequestId) {
      return { applied: false, mode };
    }

    if (mode === 'bluetooth') {
      await AudioSession.showAudioRoutePicker().catch(() => undefined);
      return requestId === callAudioRequestId
        ? {
            applied: true,
            mode,
            selectedOutput: 'default',
          }
        : { applied: false, mode };
    }

    const outputs = await AudioSession.getAudioOutputs().catch(() => []);
    if (requestId !== callAudioRequestId) {
      return { applied: false, mode };
    }
    const output = resolveAudioOutput(outputs, mode);
    if (output) {
      await AudioSession.selectAudioOutput(output).catch(() => undefined);
    }
    return {
      applied: requestId === callAudioRequestId && Boolean(output),
      mode,
      selectedOutput: output,
    };
  });
}

export async function applyCallAudioOutputMode(
  room: Room | null,
  mode: CallAudioOutputMode,
): Promise<CallAudioOutputApplyResult> {
  const requestId = ++callAudioRequestId;
  const androidRequestId =
    Platform.OS === 'android' ? ++androidRouteRequestId : 0;
  if (Platform.OS === 'android') {
    const nativeRoute = getAndroidCallAudioRouteModule();
    nativeRoute?.cancelPending?.()?.catch(() => undefined);
  }

  if (Platform.OS === 'android' && mode === 'bluetooth') {
    const hasPermission = await ensureCallBluetoothPermission();
    if (!hasPermission || requestId !== callAudioRequestId) {
      return { applied: false, mode };
    }
  }

  const volume = mode === 'muted' ? 0 : 1;
  await enqueueRemoteAudioVolume(room, volume);
  if (requestId !== callAudioRequestId) {
    return { applied: false, mode };
  }

  if (mode === 'muted') {
    return { applied: true, mode };
  }

  if (Platform.OS === 'android') {
    return applyAndroidOutput(mode, androidRequestId);
  }

  return applyIosOutput(mode, requestId);
}

export function resetCallRemoteAudioVolume() {
  ++callAudioRequestId;
  if (Platform.OS === 'android') {
    ++androidRouteRequestId;
    const nativeRoute = getAndroidCallAudioRouteModule();
    nativeRoute?.cancelPending?.()?.catch(() => undefined);
    enqueueAndroidRoute(async () => {
      await nativeRoute?.reset?.()?.catch(() => undefined);
    });
  }
  enqueueRemoteAudioVolume(null, 1).catch(() => undefined);
}
