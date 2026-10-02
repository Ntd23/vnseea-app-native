import { useCallback, useEffect, useState } from 'react';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { orientVideoSize } from '../../../shared-kernel/application/utils/videoDisplaySize';
import { createVideoPublishJob } from '../../../shared-kernel/application/services/videoPublishJob';
import { videoPublishQueue } from '../../../shared-kernel/application/services/videoPublishQueue';
import { getVideoUploadPolicy } from '../../../shared-kernel/infrastructure/upload/videoUploadPolicy';
import { createReelsRepository } from '../../infrastructure/repositories/ApiReelsRepository';
import type {
  ReelCaptionSuggestion,
  ReelCaptionSuggestionKind,
  ReelDraft,
  ReelPrivacy,
  ReelUploadResult,
} from '../../domain/types/reels.types';

const repository = createReelsRepository();

const VM_COPY = {
  vi: {
    selectVideoError: 'Vui lòng chọn hoặc quay một video trước khi đăng.',
    timeoutError: 'Tải video quá lâu. Vui lòng kiểm tra kết nối hoặc chọn video nhẹ hơn rồi thử lại.',
    networkError: 'Không kết nối được máy chủ. Vui lòng kiểm tra Wi-Fi/4G rồi thử lại.',
    unknownError: 'Đã xảy ra lỗi không xác định.',
    backgroundUpload: 'Đang đăng reel. Reel sẽ hiện khi video xử lý xong.',
  },
  en: {
    selectVideoError: 'Please choose or record a video before publishing.',
    timeoutError: 'Video upload took too long. Please check your connection or choose a lighter video and try again.',
    networkError: 'Cannot connect to the server. Please check your Wi-Fi/4G and try again.',
    unknownError: 'An unknown error occurred.',
    backgroundUpload: 'Posting your reel. It will appear once the video is processed.',
  },
};

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'success'; result: ReelUploadResult }
  | { phase: 'error'; message: string };

type ActiveCaptionToken = {
  kind: ReelCaptionSuggestionKind;
  query: string;
  start: number;
  end: number;
};

type CaptionMentionReplacement = {
  displayValue: string;
  backendValue: string;
};

function getActiveCaptionToken(caption = ''): ActiveCaptionToken | null {
  const match = /(^|\s)([@#][A-Za-z0-9_\u00C0-\u1EF9]*)$/u.exec(caption);
  if (!match) {
    return null;
  }

  const token = match[2];
  const query = token.slice(1);
  const start = match.index + match[1].length;

  return {
    kind: token.startsWith('@') ? 'mention' : 'hashtag',
    query,
    start,
    end: caption.length,
  };
}

function serializeCaptionForBackend(
  caption: string | undefined,
  replacements: CaptionMentionReplacement[],
) {
  if (!caption) {
    return caption;
  }

  return replacements.reduce(
    (nextCaption, replacement) =>
      nextCaption.split(replacement.displayValue).join(replacement.backendValue),
    caption,
  );
}

export type UseCreateReelOptions = {
  /** Called once a reel uploaded in the background is encoded and visible. */
  onPublishedInBackground?: (postId: string) => void;
};

export function useCreateReelViewModel(options: UseCreateReelOptions = {}) {
  const { onPublishedInBackground } = options;
  const language = useAppLanguage();
  const vmCopy = VM_COPY[language];

  const [draft, setDraftState] = useState<
    Partial<ReelDraft> & Pick<ReelDraft, 'privacy'>
  >({ privacy: 'public' });
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' });
  const [captionSuggestions, setCaptionSuggestions] = useState<
    ReelCaptionSuggestion[]
  >([]);
  const [isLoadingCaptionSuggestions, setIsLoadingCaptionSuggestions] =
    useState(false);
  const [isCaptionSuggestionActive, setIsCaptionSuggestionActive] =
    useState(false);
  const [captionMentionReplacements, setCaptionMentionReplacements] = useState<
    CaptionMentionReplacement[]
  >([]);

  const setVideo = useCallback(
    (
      videoUri: string,
      videoType: string,
      videoName: string,
      size?: { width?: number; height?: number },
    ) => {
      setDraftState(prev => ({
        ...prev,
        videoUri,
        videoType,
        videoName,
        videoWidth: size?.width,
        videoHeight: size?.height,
      }));
      setUploadState({ phase: 'idle' });
    },
    [],
  );

  const setThumbnail = useCallback(
    (thumbnailUri: string, frame?: { width?: number; height?: number }) => {
      setDraftState(prev => {
        const size = orientVideoSize(
          { width: prev.videoWidth, height: prev.videoHeight },
          frame,
        );
        return {
          ...prev,
          thumbnailUri,
          videoWidth: size.width,
          videoHeight: size.height,
        };
      });
    },
    [],
  );

  const setCaption = useCallback((caption: string) => {
    setDraftState(prev => ({ ...prev, caption }));
  }, []);

  const applyCaptionSuggestion = useCallback(
    (suggestion: ReelCaptionSuggestion) => {
      setDraftState(prev => {
        const caption = prev.caption ?? '';
        const activeToken = getActiveCaptionToken(caption);
        if (!activeToken) {
          return prev;
        }

        const before = caption.slice(0, activeToken.start);
        const after = caption.slice(activeToken.end).trimStart();
        const nextCaption = `${before}${suggestion.value} ${after}`.slice(0, 500);

        return { ...prev, caption: nextCaption };
      });
      if (suggestion.kind === 'mention' && suggestion.backendValue) {
        setCaptionMentionReplacements(prev => [
          ...prev.filter(item => item.displayValue !== suggestion.value),
          {
            displayValue: suggestion.value,
            backendValue: suggestion.backendValue!,
          },
        ]);
      }
      setCaptionSuggestions([]);
      setIsCaptionSuggestionActive(false);
    },
    [],
  );

  const setPrivacy = useCallback((privacy: ReelPrivacy) => {
    setDraftState(prev => ({ ...prev, privacy }));
  }, []);

  const reset = useCallback(() => {
    setDraftState({ privacy: 'public' });
    setUploadState({ phase: 'idle' });
    setCaptionSuggestions([]);
    setIsCaptionSuggestionActive(false);
    setCaptionMentionReplacements([]);
  }, []);

  useEffect(() => {
    const activeToken = getActiveCaptionToken(draft.caption);

    if (!activeToken) {
      setCaptionSuggestions([]);
      setIsLoadingCaptionSuggestions(false);
      setIsCaptionSuggestionActive(false);
      return;
    }

    let isCancelled = false;
    setIsCaptionSuggestionActive(true);
    setIsLoadingCaptionSuggestions(true);

    const timeoutId = setTimeout(async () => {
      try {
        const suggestions = await repository.searchCaptionSuggestions(
          activeToken.kind,
          activeToken.query,
        );
        if (!isCancelled) {
          setCaptionSuggestions(suggestions);
        }
      } catch {
        if (!isCancelled) {
          setCaptionSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCaptionSuggestions(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [draft.caption]);

  const submit = useCallback(async () => {
    if (!draft.videoUri || !draft.videoType || !draft.videoName) {
      setUploadState({ phase: 'error', message: vmCopy.selectVideoError });
      return;
    }

    setUploadState({ phase: 'uploading' });

    try {
      const apiDraft = {
        ...draft,
        caption: serializeCaptionForBackend(
          draft.caption,
          captionMentionReplacements,
        ),
      } as ReelDraft;
      const policy = await getVideoUploadPolicy('reel');
      if (policy.provider === 'bunny_stream') {
        // Uploads in the background; the reel appears once Bunny encodes it.
        videoPublishQueue.enqueue(
          createVideoPublishJob({
            purpose: 'reel',
            video: { uri: apiDraft.videoUri, name: apiDraft.videoName, type: apiDraft.videoType },
            thumbnailUri: apiDraft.thumbnailUri,
            policy,
            createFromUpload: (video, uploadId) =>
              repository.createReelWithUploadedVideo(
                { ...apiDraft, videoUri: video.uri, videoName: video.name, videoType: video.type },
                uploadId,
              ),
            createDirectly: async video => {
              const result = await repository.createReel({
                ...apiDraft,
                videoUri: video.uri,
                videoName: video.name,
                videoType: video.type,
              });
              return result.status === 'created'
                ? { postId: result.postId, needsReview: false }
                : { needsReview: result.status === 'review' };
            },
            onPublished: ({ postId, needsReview }) => {
              if (postId && !needsReview) onPublishedInBackground?.(postId);
            },
          }),
        );
        setUploadState({
          phase: 'success',
          result: { status: 'processing', message: vmCopy.backgroundUpload },
        });
        return;
      }
      const result = await repository.createReel(apiDraft);
      setUploadState({ phase: 'success', result });
    } catch (caughtError) {
      const rawMessage =
        caughtError instanceof Error
          ? caughtError.message
          : vmCopy.unknownError;

      // Translate axios/network errors into friendly messages
      let friendlyMessage = rawMessage;
      const lowered = rawMessage.toLowerCase();
      if (lowered.includes('timeout') || lowered.includes('econnaborted')) {
        friendlyMessage = vmCopy.timeoutError;
      } else if (lowered.includes('network error')) {
        friendlyMessage = vmCopy.networkError;
      }

      setUploadState({ phase: 'error', message: friendlyMessage });
    }
  }, [captionMentionReplacements, draft, onPublishedInBackground, vmCopy]);

  return {
    draft,
    uploadState,
    isUploading: uploadState.phase === 'uploading',
    captionSuggestions,
    isLoadingCaptionSuggestions,
    isCaptionSuggestionActive,
    hasVideo: Boolean(draft.videoUri),
    setVideo,
    setThumbnail,
    setCaption,
    applyCaptionSuggestion,
    setPrivacy,
    submit,
    reset,
  };
}
