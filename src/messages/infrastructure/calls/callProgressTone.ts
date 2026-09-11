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
  if (!callId) return false;
  const nativeModule = moduleForPlatform();
  if (!nativeModule) {
    console.warn('[CallProgressTone] native module unavailable', {
      platform: Platform.OS,
      mode,
    });
    return false;
  }
  try {
    const didStart =
      Platform.OS === 'ios'
        ? await nativeModule.start?.(mode, callId)
        : await nativeModule.startProgressTone?.(mode, callId);
    if (didStart !== true) {
      console.warn('[CallProgressTone] native player rejected start', {
        platform: Platform.OS,
        mode,
        callId,
      });
    }
    return didStart === true;
  } catch (error) {
    console.warn('[CallProgressTone] start failed', {
      platform: Platform.OS,
      mode,
      callId,
      error,
    });
    // Tones are non-critical; call setup must continue if native audio is unavailable.
    return false;
  }
}

export async function stopCallProgressTone(callId: string) {
  const nativeModule = moduleForPlatform();
  if (!nativeModule) return false;
  try {
    const didStop =
      Platform.OS === 'ios'
        ? await nativeModule.stop?.(callId)
        : await nativeModule.stopProgressTone?.(callId);
    return didStop === true;
  } catch (error) {
    console.warn('[CallProgressTone] stop failed', {
      platform: Platform.OS,
      callId,
      error,
    });
    // Do not let tone cleanup interrupt call teardown.
    return false;
  }
}
