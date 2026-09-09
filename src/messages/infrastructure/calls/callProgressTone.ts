// Description: Controls native caller progress tones without changing the active call audio session.
import { NativeModules, Platform } from 'react-native';

export type CallProgressToneMode = 'connecting' | 'ringing' | 'busy';

type NativeProgressToneModule = {
  start?: (mode: CallProgressToneMode, callId: string) => Promise<boolean>;
  stop?: (callId: string) => Promise<boolean>;
  startProgressTone?: (
    mode: CallProgressToneMode,
    callId: string,
  ) => Promise<boolean>;
  stopProgressTone?: (callId: string) => Promise<boolean>;
};

function moduleForPlatform(): NativeProgressToneModule | undefined {
  return Platform.OS === 'ios'
    ? NativeModules.VnseeaCallProgressTone
    : NativeModules.VnseeaCallIntent;
}

export async function startCallProgressTone(
  callId: string,
  mode: CallProgressToneMode,
) {
  if (!callId) return;
  const nativeModule = moduleForPlatform();
  try {
    if (Platform.OS === 'ios') {
      await nativeModule?.start?.(mode, callId);
    } else {
      await nativeModule?.startProgressTone?.(mode, callId);
    }
  } catch {
    // Tones are non-critical; call setup must continue if native audio is unavailable.
  }
}

export async function stopCallProgressTone(callId: string) {
  const nativeModule = moduleForPlatform();
  try {
    if (Platform.OS === 'ios') {
      await nativeModule?.stop?.(callId);
    } else {
      await nativeModule?.stopProgressTone?.(callId);
    }
  } catch {
    // Do not let tone cleanup interrupt call teardown.
  }
}
