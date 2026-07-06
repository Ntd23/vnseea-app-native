// Feed - useCreatePostViewModel
//
// Owns the state of the "Create Post" composer screen. The screen is a
// dumb view that just reads `draft` + calls these actions — all the
// business rules (validation, optimistic submit, error recovery) live
// here.
//
// Wire-up flow on screen submit:
//   1. setDraft(...) → screen captures user input
//   2. submit()      → validate → repository.createPost(draft)
//   3. On success    → caller (FeedScreen) prepends the new post via the
//                      onCreated callback, then we reset() the draft.
//   4. On failure    → keep the draft intact so the user doesn't lose
//                      their typing/photos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedPost,
  PostAudioAttachment,
  PostFeeling,
  PostPhotoAttachment,
  PostPrivacy,
  PostVideoAttachment,
} from '../../domain/types/feed.types';
// Reuse the reel composer's caption suggestion plumbing — same backend
// endpoints (`apiRoutes.user.suggestions` / `apiRoutes.search.all` /
// `apiRoutes.reels.hashtagSuggestions`) and the exact same mapping logic.
// Sharing the implementation keeps mention/hashtag UX consistent across
// both composers without duplicating ~80 lines of repo plumbing.
import { createReelsRepository } from '../../../reels/infrastructure/repositories/ApiReelsRepository';
import type {
  ReelCaptionSuggestion,
  ReelCaptionSuggestionKind,
} from '../../../reels/domain/types/reels.types';

import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

const repository = createFeedRepository();
const suggestionsRepo = createReelsRepository();

// ── Caption mention/hashtag helpers (mirror useCreateReelViewModel) ──────

type ActiveCaptionToken = {
  kind: ReelCaptionSuggestionKind;
  query: string;
  start: number;
  end: number;
};

type CaptionMentionReplacement = {
  /** What the user sees in the input ("@Quyền Quý"). */
  displayValue: string;
  /** What the backend stores ("@quyenquy"). */
  backendValue: string;
};

/**
 * Detect the live `@…` / `#…` token at the end of `text`. We only
 * suggest while the user is still mid-token (no trailing space yet),
 * matching Facebook / TikTok behaviour.
 */
function getActiveCaptionToken(text = ''): ActiveCaptionToken | null {
  const match = /(^|\s)([@#][A-Za-z0-9_À-ỹ]*)$/u.exec(text);
  if (!match) return null;

  const token = match[2];
  return {
    kind: token.startsWith('@') ? 'mention' : 'hashtag',
    query: token.slice(1),
    start: match.index + match[1].length,
    end: text.length,
  };
}

/**
 * Replace each displayed `@FullName` with its backend `@username` so
 * WoWonder's mention indexer picks up the link. Hashtags are unchanged
 * because the display value == the wire value.
 */
function serializeTextForBackend(
  text: string,
  replacements: CaptionMentionReplacement[],
): string {
  return replacements.reduce(
    (next, r) => next.split(r.displayValue).join(r.backendValue),
    text,
  );
}

// Reasonable defaults so the screen can render without first-touch
// undefined checks. `privacy: 'public'` mirrors Facebook's behaviour for
// a fresh composer.
const DEFAULT_DRAFT: CreatePostDraft = {
  text: '',
  photos: [],
  privacy: 'public',
};

// Mirror WoWonder's image upload limit so we can fail fast before
// hitting the network. WoWonder's default `maxUpload` is ~10MB but
// installs vary — 10 photos is the practical UX cap regardless.
const MAX_PHOTOS = 10;

// Localized validation errors surfaced to the UI.
const VIEW_MODEL_COPY = {
  vi: {
    errEmpty: 'Hãy viết nội dung hoặc thêm ít nhất 1 ảnh hoặc âm thanh.',
    errTooManyPhotos: (max: number) => `Tối đa ${max} ảnh mỗi bài.`,
    errSubmitFailed: 'Không đăng được bài. Vui lòng thử lại.',
  },
  en: {
    errEmpty: 'Please enter content or add at least 1 image or audio.',
    errTooManyPhotos: (max: number) => `Maximum of ${max} photos per post.`,
    errSubmitFailed: 'Failed to create post. Please try again.',
  },
};

export type UseCreatePostOptions = {
  /**
   * Called after a successful create with the freshly-built
   * `FeedPost`. FeedScreen uses this to optimistically prepend the
   * post to the home feed without a full refetch.
   */
  onCreated?: (post: FeedPost) => void;
  pageId?: string;
};

export function useCreatePostViewModel(options: UseCreatePostOptions = {}) {
  const { onCreated, pageId } = options;
  const language = useAppLanguage();
  const copy = useMemo(() => VIEW_MODEL_COPY[language], [language]);

  const [draft, setDraft] = useState<CreatePostDraft>({
    ...DEFAULT_DRAFT,
    pageId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Caption suggestion state ──────────────────────────────────────
  // Mirrors `useCreateReelViewModel`. The bar shows a debounced
  // mention/hashtag picker whenever the user is typing `@…` or `#…`.
  const [captionSuggestions, setCaptionSuggestions] = useState<
    ReelCaptionSuggestion[]
  >([]);
  const [isLoadingCaptionSuggestions, setIsLoadingCaptionSuggestions] =
    useState(false);
  const [isCaptionSuggestionActive, setIsCaptionSuggestionActive] =
    useState(false);
  // Pairs of `(displayValue, backendValue)` we need to swap in before
  // POSTing so the backend stores `@username`, not `@FullName`.
  const [captionMentionReplacements, setCaptionMentionReplacements] = useState<
    CaptionMentionReplacement[]
  >([]);

  // ── Draft mutators ────────────────────────────────────────────────
  // We always merge into the previous draft (functional updates) so
  // back-to-back calls in the same tick don't clobber each other.

  const setText = useCallback((text: string) => {
    setDraft(prev => ({ ...prev, text }));
  }, []);

  const setPrivacy = useCallback((privacy: PostPrivacy) => {
    setDraft(prev => ({ ...prev, privacy }));
  }, []);

  const setFeeling = useCallback((feeling: PostFeeling | undefined) => {
    setDraft(prev => ({ ...prev, feeling }));
  }, []);

  const setAudio = useCallback((audio: PostAudioAttachment | undefined) => {
    setError(null);
    setDraft(prev => ({
      ...prev,
      audio,
      // WoWonder only accepts ONE primary media per post. Clear the
      // others so a user switching from audio to photos/video doesn't
      // accidentally upload three media types at once.
      photos: audio ? [] : prev.photos,
      video: audio ? undefined : prev.video,
    }));
  }, []);

  /**
   * Append photos to the current draft. Dedupes by `uri` so accidental
   * double-pick from the gallery doesn't add the same photo twice, and
   * caps total photos at MAX_PHOTOS so the user gets feedback BEFORE
   * the server rejects the upload.
   *
   * Also clears any previously selected video — WoWonder's `new_post`
   * accepts only one media type per post.
   */
  const addPhotos = useCallback((photos: PostPhotoAttachment[]) => {
    setError(null);
    setDraft(prev => {
      const existing = new Set(prev.photos.map(p => p.uri));
      const incoming = photos.filter(p => !existing.has(p.uri));
      const merged = [...prev.photos, ...incoming];
      if (merged.length > MAX_PHOTOS) {
        // Trim the overflow and surface a warning — preserve as many
        // as we can rather than rejecting the whole batch.
        setError(copy.errTooManyPhotos(MAX_PHOTOS));
        return {
          ...prev,
          audio: undefined,
          video: undefined,
          photos: merged.slice(0, MAX_PHOTOS),
        };
      }
      return { ...prev, audio: undefined, video: undefined, photos: merged };
    });
  }, [copy]);

  /** Remove a photo by its `uri` (the only stable key we have client-side). */
  const removePhoto = useCallback((uri: string) => {
    setDraft(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.uri !== uri),
    }));
  }, []);

  /** Clear all selected photos in one state update. */
  const clearPhotos = useCallback(() => {
    setDraft(prev => ({
      ...prev,
      photos: [],
    }));
  }, []);

  /**
   * Replace the draft's video attachment. Clears photos + audio because
   * WoWonder accepts only one media type per post. Passing `undefined`
   * removes the video (used by the X button on the preview card).
   */
  const setVideo = useCallback((video: PostVideoAttachment | undefined) => {
    setError(null);
    setDraft(prev => ({
      ...prev,
      video,
      photos: video ? [] : prev.photos,
      audio: video ? undefined : prev.audio,
    }));
  }, []);

  /**
   * Replace the live `@…` / `#…` token with the user's pick. For
   * mentions we remember the (display ↔ backend) mapping so we can
   * serialize back to `@username` at submit time.
   */
  const applyCaptionSuggestion = useCallback(
    (suggestion: ReelCaptionSuggestion) => {
      setDraft(prev => {
        const text = prev.text ?? '';
        const activeToken = getActiveCaptionToken(text);
        if (!activeToken) return prev;

        const before = text.slice(0, activeToken.start);
        const after = text.slice(activeToken.end).trimStart();
        // Append a trailing space so the user can keep typing without
        // the suggestion bar immediately re-opening on the same token.
        const nextText = `${before}${suggestion.value} ${after}`;
        return { ...prev, text: nextText };
      });

      // Mentions need a (display, backend) swap before POST.
      if (suggestion.kind === 'mention' && suggestion.backendValue) {
        setCaptionMentionReplacements(prev => [
          // Drop any older record for this display value, then add the
          // fresh one — picking the same suggestion twice shouldn't
          // duplicate the mapping.
          ...prev.filter(r => r.displayValue !== suggestion.value),
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

  /** Wipe everything back to the default draft. Called after a successful
   * submit and when the user explicitly discards. */
  const reset = useCallback(() => {
    setDraft({ ...DEFAULT_DRAFT, pageId });
    setError(null);
    setIsSubmitting(false);
    setCaptionSuggestions([]);
    setIsCaptionSuggestionActive(false);
    setCaptionMentionReplacements([]);
  }, [pageId]);

  // ── Debounced suggestion fetcher ──────────────────────────────────
  // Watches `draft.text` and pulls suggestions whenever the trailing
  // token changes. 250ms debounce avoids one network request per
  // keystroke. Cancelled cleanly when the effect re-runs.
  useEffect(() => {
    const activeToken = getActiveCaptionToken(draft.text);
    if (!activeToken) {
      setCaptionSuggestions([]);
      setIsLoadingCaptionSuggestions(false);
      setIsCaptionSuggestionActive(false);
      return;
    }

    let cancelled = false;
    setIsCaptionSuggestionActive(true);
    setIsLoadingCaptionSuggestions(true);

    const timeoutId = setTimeout(async () => {
      try {
        const suggestions = await suggestionsRepo.searchCaptionSuggestions(
          activeToken.kind,
          activeToken.query,
        );
        if (!cancelled) setCaptionSuggestions(suggestions);
      } catch {
        if (!cancelled) setCaptionSuggestions([]);
      } finally {
        if (!cancelled) setIsLoadingCaptionSuggestions(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [draft.text]);

  /**
   * Validate that the draft is submittable. WoWonder accepts pure-text
   * posts AND pure-photo posts, so we just need ONE of the two to be
   * non-empty. Returns the error message or null when valid.
   */
  const validate = useCallback((d: CreatePostDraft): string | null => {
    if (
      d.text.trim().length === 0 &&
      d.photos.length === 0 &&
      !d.audio &&
      !d.video
    ) {
      return copy.errEmpty;
    }
    if (d.photos.length > MAX_PHOTOS) {
      return copy.errTooManyPhotos(MAX_PHOTOS);
    }
    return null;
  }, [copy]);

  /**
   * Whether the submit button should be enabled. Memoised so the
   * dependent UI doesn't re-render every keystroke needlessly.
   */
  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    return validate(draft) === null;
  }, [draft, isSubmitting, validate]);

  /**
   * Upload the draft. Returns the new post on success, or null on
   * failure (error message goes into state so the screen can show it).
   * We intentionally DO NOT clear the draft on failure so the user can
   * retry without re-typing.
   */
  const submit = useCallback(async (): Promise<CreatePostResult | null> => {
    const validationError = validate(draft);
    if (validationError) {
      setError(validationError);
      return null;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Swap displayed `@FullName` → backend `@username` right before
      // we hit the wire. The user still sees the friendly form in the
      // input; only the persisted record uses the canonical username.
      const apiDraft: CreatePostDraft = {
        ...draft,
        text: serializeTextForBackend(draft.text, captionMentionReplacements),
      };
      const result = await repository.createPost(apiDraft);
      // Notify the parent FIRST (so the feed updates) then reset our
      // own state. Order matters: if we reset before notifying, the
      // caller would have to copy out `result.post` before reset
      // cleared anything it depended on. (Currently irrelevant since
      // result lives outside the draft, but defensive anyway.)
      const createdPost: FeedPost = {
        ...result.post,
        postedAt: result.post.postedAt || Math.floor(Date.now() / 1000),
      };
      onCreated?.(createdPost);
      setDraft({ ...DEFAULT_DRAFT, pageId });
      return result;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : copy.errSubmitFailed;
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [captionMentionReplacements, draft, onCreated, pageId, validate, copy]);

  return {
    // State
    draft,
    isSubmitting,
    error,
    canSubmit,
    // Caption suggestion state (mention / hashtag picker)
    captionSuggestions,
    isLoadingCaptionSuggestions,
    isCaptionSuggestionActive,
    // Mutators
    setText,
    setPrivacy,
    setFeeling,
    setAudio,
    setVideo,
    addPhotos,
    removePhoto,
    clearPhotos,
    applyCaptionSuggestion,
    // Lifecycle
    submit,
    reset,
    // Constants for the UI (so it doesn't hardcode the same numbers)
    maxPhotos: MAX_PHOTOS,
  };
}
