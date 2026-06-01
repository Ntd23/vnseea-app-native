import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import type { AudioAttachment } from '../../domain/types/audio.types';
import { requestMicrophonePermission } from '../utils/microphonePermission';

interface WavAudioRecorderModule {
  start(): Promise<string>;
  stop(): Promise<string>;
  cancel(): Promise<void>;
}

const wavRecorder = NativeModules.WavAudioRecorder as
  | WavAudioRecorderModule
  | undefined;

export function useWavAudioRecorder() {
  const mountedRef = useRef(true);
  const recordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
      if (recordingRef.current) {
        wavRecorder?.cancel().catch(() => undefined);
      }
    };
  }, [clearTimer]);

  const assertAvailable = useCallback(() => {
    if (Platform.OS !== 'android' || !wavRecorder) {
      throw new Error('Thiết bị này chưa hỗ trợ ghi âm WAV trực tiếp.');
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;
    assertAvailable();

    const allowed = await requestMicrophonePermission();
    if (!allowed) {
      throw new Error('Bạn cần cấp quyền mic để ghi âm.');
    }

    await wavRecorder!.start();
    recordingRef.current = true;
    startedAtRef.current = Date.now();
    if (mountedRef.current) {
      setDurationMs(0);
      setIsRecording(true);
    }
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setDurationMs(Date.now() - startedAtRef.current);
      }
    }, 250);
  }, [assertAvailable]);

  const stopRecording = useCallback(async (): Promise<AudioAttachment | null> => {
    if (!recordingRef.current) return null;

    const uri = await wavRecorder!.stop();
    const recordedDuration = Date.now() - startedAtRef.current;
    recordingRef.current = false;
    clearTimer();
    if (mountedRef.current) {
      setIsRecording(false);
      setDurationMs(recordedDuration);
    }

    return {
      uri,
      name: `voice-${Date.now()}.wav`,
      type: 'audio/wav',
      durationMs: recordedDuration,
    };
  }, [clearTimer]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    clearTimer();
    await wavRecorder?.cancel().catch(() => undefined);
    if (mountedRef.current) {
      setIsRecording(false);
      setDurationMs(0);
    }
  }, [clearTimer]);

  return {
    isRecording,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
