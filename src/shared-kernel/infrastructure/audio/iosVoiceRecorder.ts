import { NativeModules } from 'react-native';

interface NativeIosVoiceRecorder {
  requestPermission(): Promise<boolean>;
  start(): Promise<string>;
  stop(): Promise<{ uri: string; durationMs: number }>;
  cancel(): Promise<void>;
}

function getRecorder(): NativeIosVoiceRecorder {
  const recorder = NativeModules.VnseeaAudioRecorder as
    | NativeIosVoiceRecorder
    | undefined;
  if (!recorder) {
    throw new Error('Bộ ghi âm iOS chưa được tích hợp trong bản ứng dụng này.');
  }
  return recorder;
}

export const iosVoiceRecorder = {
  requestPermission: () => getRecorder().requestPermission(),
  start: () => getRecorder().start(),
  stop: () => getRecorder().stop(),
  cancel: () => getRecorder().cancel(),
};
