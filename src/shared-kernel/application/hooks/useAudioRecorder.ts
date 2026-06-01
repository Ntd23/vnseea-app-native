import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-nitro-sound';
import type { AudioAttachment } from '../../domain/types/audio.types';
import { requestMicrophonePermission } from '../utils/microphonePermission';

function withFileScheme(uri: string) {
  if (
    Platform.OS !== 'android' ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(uri)
  ) {
    return uri;
  }
  return `file://${uri}`;
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
    const uri = await Sound.stopRecorder();
    Sound.removeRecordBackListener();
    recordingRef.current = false;
    if (mountedRef.current) setIsRecording(false);

    // WoWonder's chat upload allowlist accepts mp4 and the endpoint stores
    // `message_type=audio`, so an AAC-only MPEG-4 container remains an audio
    // message while also passing the backend extension and MIME checks.
    return {
      uri: withFileScheme(uri),
      name: `voice-${Date.now()}.mp4`,
      type: 'video/mp4',
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
