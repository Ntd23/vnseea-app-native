// Description: Shares the iOS realtime-media latch and CallKit activation gate across call contexts.
import { Platform } from 'react-native';
import type { LiveKitCallType } from '../../domain/types/call.types';
import {
  usesNativeCallUi,
  waitForNativeAudioSessionActivation,
} from '../../infrastructure/calls/nativeCallService';

const CALLKIT_AUDIO_SESSION_WAIT_MS = 6_000;

export type IosCallAudioOwner = 'direct-call' | 'group-call';
export type IosCallAudioStage = string;

export type IosCallAudioContext = {
  owner: IosCallAudioOwner;
  callId: string;
  callType: LiveKitCallType;
  callUuid: string;
  roomName: string;
  stage: IosCallAudioStage;
};

type AudioRuntime = {
  getIosAudioDeviceState?: () => Record<string, unknown>;
  setIosRealtimeMediaAudioActive?: (
    active: boolean,
    context: Record<string, unknown>,
  ) => void;
  setIosRealtimeMediaAudioOutputPreference?: (
    preferSpeakerOutput: boolean,
  ) => void;
  setIosVoiceCallAudioActive?: (active: boolean) => void;
};

type DebugLogger = (event: string, data: Record<string, unknown>) => void;

const audioRuntime = require('../../../shared-kernel/infrastructure/livekit/registerLiveKitGlobals') as AudioRuntime;

function audioContextPayload(context: IosCallAudioContext) {
  return {
    owner: context.owner,
    mediaKind: context.callType,
    role: 'call',
    requiresInput: true,
    callId: context.callId,
    callUuid: context.callUuid,
    roomName: context.roomName,
    stage: context.stage,
  };
}

export function setIosCallAudioActive(
  active: boolean,
  context: IosCallAudioContext,
  log?: DebugLogger,
) {
  if (Platform.OS !== 'ios') return;
  const payload = audioContextPayload(context);
  try {
    if (audioRuntime.setIosRealtimeMediaAudioActive) {
      audioRuntime.setIosRealtimeMediaAudioActive(active, payload);
    } else {
      audioRuntime.setIosVoiceCallAudioActive?.(active);
    }
    log?.('ios_realtime_media_audio_active_set', { ...payload, active });
  } catch (error) {
    log?.('ios_realtime_media_audio_active_error', {
      ...payload,
      active,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
    });
  }
}

export function getIosCallAudioDeviceState() {
  if (Platform.OS !== 'ios') return {};
  try {
    return audioRuntime.getIosAudioDeviceState?.() ?? {};
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
    };
  }
}

export function setIosCallAudioOutputPreference(
  preferSpeakerOutput: boolean,
) {
  if (Platform.OS !== 'ios') return;
  audioRuntime.setIosRealtimeMediaAudioOutputPreference?.(
    preferSpeakerOutput,
  );
}

export async function prepareIosCallAudioGate(
  context: Omit<IosCallAudioContext, 'stage'>,
  log?: DebugLogger,
) {
  if (Platform.OS !== 'ios') {
    return { activated: true, source: 'not_ios' as const };
  }

  const activeContext = { ...context, stage: 'before_connect' as const };
  setIosCallAudioActive(true, activeContext, log);
  const hasNativeCallUi = usesNativeCallUi(context.callUuid);
  log?.('ios_call_audio_gate_prepare_start', {
    ...audioContextPayload(activeContext),
    usesNativeCallUi: hasNativeCallUi,
  });

  if (!hasNativeCallUi) {
    log?.('ios_call_audio_gate_pass', {
      ...audioContextPayload(activeContext),
      activationSource: 'non_native_call',
      audioDeviceState: getIosCallAudioDeviceState(),
    });
    return { activated: true, source: 'non_native_call' as const };
  }

  const activation = await waitForNativeAudioSessionActivation(
    context.callUuid,
    CALLKIT_AUDIO_SESSION_WAIT_MS,
  );
  const ready =
    activation.activated === true &&
    activation.callUuid === context.callUuid;
  if (!ready) {
    log?.('ios_call_audio_gate_failed', {
      ...audioContextPayload(activeContext),
      activated: activation.activated,
      activationSource: activation.source,
      activationCallUuid: activation.callUuid,
      activationAgeMs: activation.activationAgeMs,
    });
    setIosCallAudioActive(
      false,
      { ...context, stage: 'connect_error' },
      log,
    );
    throw new Error('Không thể kích hoạt audio session CallKit cho cuộc gọi.');
  }

  log?.('ios_call_audio_gate_pass', {
    ...audioContextPayload(activeContext),
    activationSource: activation.source,
    activationCallUuid: activation.callUuid,
    activationAgeMs: activation.activationAgeMs,
    audioDeviceState: getIosCallAudioDeviceState(),
  });
  return activation;
}

export function releaseIosCallAudio(
  context: Omit<IosCallAudioContext, 'stage'>,
  log?: DebugLogger,
) {
  setIosCallAudioActive(false, { ...context, stage: 'release' }, log);
}
