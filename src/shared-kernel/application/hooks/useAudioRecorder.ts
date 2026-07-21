import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-nitro-sound';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { AudioAttachment } from '../../domain/types/audio.types';
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
  const recordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Sound.removeRecordBackListener();
      if (recordingRef.current) {
        Sound.stopRecorder().catch(() => undefined);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;
    const allowed = await requestMicrophonePermission();
    if (!allowed) {
      throw new Error('Bạn cần cấp quyền mic để ghi âm tin nhắn.');
    }

    setDurationMs(0);
    Sound.removeRecordBackListener();
    Sound.addRecordBackListener(event => {
      if (mountedRef.current) setDurationMs(event.currentPosition);
    });
    try {
      await Sound.startRecorder(undefined, {
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        AudioQuality: 'medium',
      });
    } catch (error) {
      Sound.removeRecordBackListener();
      throw error;
    }
    recordingRef.current = true;
    if (mountedRef.current) setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioAttachment | null> => {
    if (!recordingRef.current) return null;
    let uri = '';
    try {
      uri = await Sound.stopRecorder();
    } finally {
      Sound.removeRecordBackListener();
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
      durationMs,
    };
  }, [durationMs]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    await Sound.stopRecorder().catch(() => undefined);
    Sound.removeRecordBackListener();
    recordingRef.current = false;
    if (mountedRef.current) {
      setIsRecording(false);
      setDurationMs(0);
    }
  }, []);

  return {
    isRecording,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
