import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import type { AudioAttachment } from '../../domain/types/audio.types';

const SUPPORTED_AUDIO_NAME = /\.(mp3|wav)$/i;

function inferAudioExtension(name: string, mimeType: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  if (match?.[1]) return match[1].toLowerCase();
  if (/wav/i.test(mimeType)) return 'wav';
  if (/mpeg|mp3/i.test(mimeType)) return 'mp3';
  return '';
}

export async function pickSupportedAudioFile(): Promise<AudioAttachment | null> {
  try {
    const [file] = await pick({
      type: [types.audio],
      allowMultiSelection: false,
      mode: 'import',
    });
    if (!file?.uri) return null;

    const originalName = file.name ?? '';
    const mimeType = file.type ?? '';
    const extension = inferAudioExtension(originalName, mimeType);
    if (!SUPPORTED_AUDIO_NAME.test(originalName) && !['mp3', 'wav'].includes(extension)) {
      throw new Error('Chỉ hỗ trợ tệp âm thanh MP3 hoặc WAV.');
    }

    return {
      uri: file.uri,
      name: SUPPORTED_AUDIO_NAME.test(originalName)
        ? originalName
        : `audio-${Date.now()}.${extension}`,
      type: extension === 'wav' ? 'audio/wav' : 'audio/mpeg',
    };
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return null;
    }
    throw error;
  }
}

export function formatAudioDuration(durationMs = 0) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
