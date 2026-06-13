// Stories - useCreateStoryViewModel
//
// Owns the state of the "Create Story" composer screen. The screen is a
// dumb view that just reads `draft` + calls these actions — all the
// business rules (validation, optimistic state, error recovery) live here.
//
// Wire-up flow on submit:
//   1. user picks media → setMedia(...)
//   2. user (optionally) types title/description → setTitle / setDescription
//   3. user taps "Đăng" → submit()
//        → validate → repository.createStory(draft)
//        → on success: call onCreated? then reset()
//        → on failure: keep the draft so the user can retry without
//          re-picking the media
//
// We expose `phase` so the UI can show 'Đang đăng...' / 'Đăng' / error
// states without juggling its own loading bool.

import { useCallback, useMemo, useState } from 'react';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { createStoriesRepository } from '../../infrastructure/repositories/ApiStoriesRepository';
import type {
  CreateStoryDraft,
  CreateStoryResult,
  StoryMediaUpload,
} from '../../domain/types/stories.types';

const repository = createStoriesRepository();

// ── Validation limits (mirror create_story.php) ─────────────────────────
const MAX_TITLE_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_VIDEO_DURATION_SECONDS = 60;

const VM_COPY = {
  vi: {
    selectMediaError: 'Hãy chọn 1 ảnh hoặc 1 video.',
    videoDurationError: (max: number) => `Video tối đa ${max} giây.`,
    titleLengthError: (max: number) => `Tiêu đề tối đa ${max} ký tự.`,
    descMinLengthError: (min: number) => `Mô tả phải có ít nhất ${min} ký tự (hoặc để trống).`,
    descMaxLengthError: (max: number) => `Mô tả tối đa ${max} ký tự.`,
    unknownError: 'Đã xảy ra lỗi không xác định.',
    timeoutError: 'Tải lên quá lâu. Vui lòng kiểm tra kết nối hoặc chọn tệp nhẹ hơn.',
    networkError: 'Không kết nối được máy chủ. Vui lòng kiểm tra Wi-Fi/4G.',
  },
  en: {
    selectMediaError: 'Please choose 1 photo or 1 video.',
    videoDurationError: (max: number) => `Video can be at most ${max} seconds.`,
    titleLengthError: (max: number) => `Title can be at most ${max} characters.`,
    descMinLengthError: (min: number) => `Description must be at least ${min} characters (or empty).`,
    descMaxLengthError: (max: number) => `Description can be at most ${max} characters.`,
    unknownError: 'An unknown error occurred.',
    timeoutError: 'Upload took too long. Please check your connection or choose a lighter file.',
    networkError: 'Cannot connect to the server. Please check your Wi-Fi/4G.',
  },
};

type Phase =
  | { type: 'idle' }
  | { type: 'uploading' }
  | { type: 'success'; result: CreateStoryResult }
  | { type: 'error'; message: string };

export interface UseCreateStoryOptions {
  /**
   * Called after a successful create. The parent screen uses this to
   * either (a) reload the stories rail or (b) optimistically prepend a
   * placeholder StoryItem. The parent owns that choice because optimistic
   * prepend needs the publisher's avatar which the composer doesn't have
   * to hand.
   */
  onCreated?: (result: CreateStoryResult) => void;
}

export function useCreateStoryViewModel(options: UseCreateStoryOptions = {}) {
  const language = useAppLanguage();
  const vmCopy = VM_COPY[language];
  const { onCreated } = options;

  const [media, setMediaState] = useState<StoryMediaUpload | null>(null);
  const [title, setTitleState] = useState('');
  const [description, setDescriptionState] = useState('');
  const [phase, setPhase] = useState<Phase>({ type: 'idle' });

  // ── Draft mutators ────────────────────────────────────────────────────

  const setMedia = useCallback((next: StoryMediaUpload | null) => {
    setMediaState(next);
    // Clear any prior error when the user picks a new file — gives them
    // a clean attempt without having to dismiss the banner manually.
    setPhase({ type: 'idle' });
  }, []);

  const setTitle = useCallback((next: string) => {
    setTitleState(next);
  }, []);

  const setDescription = useCallback((next: string) => {
    setDescriptionState(next);
  }, []);

  const reset = useCallback(() => {
    setMediaState(null);
    setTitleState('');
    setDescriptionState('');
    setPhase({ type: 'idle' });
  }, []);

  // ── Validation ────────────────────────────────────────────────────────
  //
  // Returns the first failing error message OR null when valid. Surfaced
  // both via `canSubmit` (UI button-enable) and inside `submit` (last-line
  // guard before hitting the network).

  const validate = useCallback((): string | null => {
    if (!media) return vmCopy.selectMediaError;

    if (
      media.fileType === 'video' &&
      typeof media.durationSeconds === 'number' &&
      media.durationSeconds > MAX_VIDEO_DURATION_SECONDS
    ) {
      return vmCopy.videoDurationError(MAX_VIDEO_DURATION_SECONDS);
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return vmCopy.titleLengthError(MAX_TITLE_LENGTH);
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 0) {
      // PHP only saves description when it's >= 10 chars (see line 109 of
      // create_story.php). Anything shorter just gets silently dropped,
      // so we WARN here rather than wasting an upload.
      if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
        return vmCopy.descMinLengthError(MIN_DESCRIPTION_LENGTH);
      }
      if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
        return vmCopy.descMaxLengthError(MAX_DESCRIPTION_LENGTH);
      }
    }

    return null;
  }, [media, title, description, vmCopy]);

  const canSubmit = useMemo(() => {
    if (phase.type === 'uploading') return false;
    return validate() === null;
  }, [phase.type, validate]);

  // ── Submit ────────────────────────────────────────────────────────────

  const submit = useCallback(async (): Promise<CreateStoryResult | null> => {
    const error = validate();
    if (error) {
      setPhase({ type: 'error', message: error });
      return null;
    }
    if (!media) {
      // Defensive — validate() already covers this but TS doesn't know.
      return null;
    }

    const draft: CreateStoryDraft = {
      media,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
    };

    setPhase({ type: 'uploading' });
    try {
      const result = await repository.createStory(draft);
      setPhase({ type: 'success', result });
      // Notify parent FIRST so the rail updates while we're still in
      // the 'success' phase. Reset is intentionally NOT called here —
      // the screen pops itself after `onCreated` fires and a fresh
      // mount starts with a clean state anyway.
      onCreated?.(result);
      return result;
    } catch (caught) {
      const rawMessage =
        caught instanceof Error
          ? caught.message
          : vmCopy.unknownError;

      // Friendly rewrites for common network failures, same
      // strategy as the reel composer.
      let friendly = rawMessage;
      const lowered = rawMessage.toLowerCase();
      if (lowered.includes('timeout') || lowered.includes('econnaborted')) {
        friendly = vmCopy.timeoutError;
      } else if (lowered.includes('network error')) {
        friendly = vmCopy.networkError;
      }

      setPhase({ type: 'error', message: friendly });
      return null;
    }
  }, [media, title, description, validate, onCreated]);

  // Convenience getter so the screen doesn't have to switch on `phase.type`
  // for the most common cases.
  const isUploading = phase.type === 'uploading';
  const error = phase.type === 'error' ? phase.message : null;

  return {
    // State
    media,
    title,
    description,
    phase,
    isUploading,
    error,
    canSubmit,
    // Mutators
    setMedia,
    setTitle,
    setDescription,
    // Lifecycle
    submit,
    reset,
    // Constants the UI may want to reference (so it doesn't hardcode the
    // same numbers and drift from PHP).
    maxTitleLength: MAX_TITLE_LENGTH,
    minDescriptionLength: MIN_DESCRIPTION_LENGTH,
    maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
    maxVideoDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
  };
}
