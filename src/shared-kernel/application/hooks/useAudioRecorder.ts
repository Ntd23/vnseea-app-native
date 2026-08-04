import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-nitro-sound';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { AudioAttachment } from '../../domain/types/audio.types';
import { iosVoiceRecorder } from '../../infrastructure/audio/iosVoiceRecorder';
import { requestMicrophonePermission } from '../utils/microphonePermission';

function withFileScheme(uri: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(uri)) {
    return uri;
  }
  return `file://${uri}`;
}

export async function validateRecordedAudioFile(uri: string) {
  const normalizedUri = withFileScheme(uri.trim());
  if (!normalizedUri || normalizedUri === 'file://') {
    throw new Error('Không tạo được tệp ghi âm.');
  }

  const localPath = decodeURIComponent(normalizedUri.replace(/^file:\/\//i, ''));
  const stat = await ReactNativeBlobUtil.fs.stat(localPath);
  if (!stat || Number(stat.size) <= 0) {
    throw new Error('Tệp ghi âm trống. Vui lòng ghi âm lại.');
  }
  return normalizedUri;
}

export function useAudioRecorder() {
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const recordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  const clearDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearDurationTimer();
      if (recordingRef.current) {
        if (Platform.OS === 'ios') {
          iosVoiceRecorder.cancel().catch(() => undefined);
        } else {
          Sound.removeRecordBackListener();
          Sound.stopRecorder().catch(() => undefined);
        }
      }
    };
  }, [clearDurationTimer]);

  const startRecording = useCallback(async () => {
    if (startingRef.current || recordingRef.current) return;
    startingRef.current = true;
    try {
      const allowed = Platform.OS === 'ios'
        ? await iosVoiceRecorder.requestPermission()
        : await requestMicrophonePermission();
      if (!allowed) {
        throw new Error('Bạn cần cấp quyền mic để ghi âm tin nhắn.');
      }

      durationRef.current = 0;
      setDurationMs(0);
      if (Platform.OS === 'ios') {
        await iosVoiceRecorder.start();
      } else {
        Sound.removeRecordBackListener();
        Sound.addRecordBackListener(event => {
          durationRef.current = event.currentPosition;
          if (mountedRef.current) setDurationMs(event.currentPosition);
        });
        await Sound.startRecorder(undefined, {
          AudioSourceAndroid: AudioSourceAndroidType.MIC,
          OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
          AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
          AudioQuality: 'medium',
        });
      }

      if (!mountedRef.current) {
        if (Platform.OS === 'ios') {
          await iosVoiceRecorder.cancel().catch(() => undefined);
        } else {
          await Sound.stopRecorder().catch(() => undefined);
          Sound.removeRecordBackListener();
        }
        return;
      }
      recordingRef.current = true;
      startedAtRef.current = Date.now();
      if (Platform.OS === 'ios') {
        timerRef.current = setInterval(() => {
          const nextDuration = Date.now() - startedAtRef.current;
          durationRef.current = nextDuration;
          if (mountedRef.current) setDurationMs(nextDuration);
        }, 250);
      }
      setIsRecording(true);
    } catch (error) {
      if (Platform.OS !== 'ios') Sound.removeRecordBackListener();
      throw error;
    } finally {
      startingRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioAttachment | null> => {
    if (!recordingRef.current) return null;
    let uri = '';
    let recordedDuration = durationRef.current;
    try {
      if (Platform.OS === 'ios') {
        const result = await iosVoiceRecorder.stop();
        uri = result.uri;
        recordedDuration = result.durationMs || recordedDuration;
      } else {
        uri = await Sound.stopRecorder();
      }
    } finally {
      clearDurationTimer();
      if (Platform.OS !== 'ios') Sound.removeRecordBackListener();
      recordingRef.current = false;
      if (mountedRef.current) setIsRecording(false);
    }

    const validatedUri = await validateRecordedAudioFile(uri);
    return {
      uri: validatedUri,
      name:
        Platform.OS === 'ios'
          ? `voice-${Date.now()}.m4a`
          : `voice-${Date.now()}.mp4`,
      type: 'audio/mp4',
      durationMs: recordedDuration,
    };
  }, [clearDurationTimer]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (Platform.OS === 'ios') {
      await iosVoiceRecorder.cancel().catch(() => undefined);
    } else {
      await Sound.stopRecorder().catch(() => undefined);
      Sound.removeRecordBackListener();
    }
    clearDurationTimer();
    recordingRef.current = false;
    durationRef.current = 0;
    if (mountedRef.current) {
      setIsRecording(false);
      setDurationMs(0);
    }
  }, [clearDurationTimer]);

  return {
    isRecording,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
