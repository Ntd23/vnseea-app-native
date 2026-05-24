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

import { useCallback, useMemo, useState } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type {
  CreatePostDraft,
  CreatePostResult,
  FeedTextPost,
  PostFeeling,
  PostPhotoAttachment,
  PostPrivacy,
} from '../../domain/types/feed.types';

const repository = createFeedRepository();

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

// Validation errors surfaced to the UI as Vietnamese-language strings.
// Keep them human, not technical — the user sees these directly.
const ERR_EMPTY = 'Hãy viết nội dung hoặc thêm ít nhất 1 ảnh.';
const ERR_TOO_MANY_PHOTOS = `Tối đa ${MAX_PHOTOS} ảnh mỗi bài.`;

export type UseCreatePostOptions = {
  /**
   * Called after a successful create with the freshly-built
   * `FeedTextPost`. FeedScreen uses this to optimistically prepend the
   * post to the home feed without a full refetch.
   */
  onCreated?: (post: FeedTextPost) => void;
};

export function useCreatePostViewModel(options: UseCreatePostOptions = {}) {
  const { onCreated } = options;

  const [draft, setDraft] = useState<CreatePostDraft>(DEFAULT_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /**
   * Append photos to the current draft. Dedupes by `uri` so accidental
   * double-pick from the gallery doesn't add the same photo twice, and
   * caps total photos at MAX_PHOTOS so the user gets feedback BEFORE
   * the server rejects the upload.
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
        setError(ERR_TOO_MANY_PHOTOS);
        return { ...prev, photos: merged.slice(0, MAX_PHOTOS) };
      }
      return { ...prev, photos: merged };
    });
  }, []);

  /** Remove a photo by its `uri` (the only stable key we have client-side). */
  const removePhoto = useCallback((uri: string) => {
    setDraft(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.uri !== uri),
    }));
  }, []);

  /** Wipe everything back to the default draft. Called after a successful
   * submit and when the user explicitly discards. */
  const reset = useCallback(() => {
    setDraft(DEFAULT_DRAFT);
    setError(null);
    setIsSubmitting(false);
  }, []);

  /**
   * Validate that the draft is submittable. WoWonder accepts pure-text
   * posts AND pure-photo posts, so we just need ONE of the two to be
   * non-empty. Returns the error message or null when valid.
   */
  const validate = useCallback((d: CreatePostDraft): string | null => {
    if (d.text.trim().length === 0 && d.photos.length === 0) {
      return ERR_EMPTY;
    }
    if (d.photos.length > MAX_PHOTOS) {
      return ERR_TOO_MANY_PHOTOS;
    }
    return null;
  }, []);

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
      const result = await repository.createPost(draft);
      // Notify the parent FIRST (so the feed updates) then reset our
      // own state. Order matters: if we reset before notifying, the
      // caller would have to copy out `result.post` before reset
      // cleared anything it depended on. (Currently irrelevant since
      // result lives outside the draft, but defensive anyway.)
      onCreated?.(result.post);
      setDraft(DEFAULT_DRAFT);
      return result;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Không đăng được bài. Vui lòng thử lại.';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, onCreated, validate]);

  return {
    // State
    draft,
    isSubmitting,
    error,
    canSubmit,
    // Mutators
    setText,
    setPrivacy,
    setFeeling,
    addPhotos,
    removePhoto,
    // Lifecycle
    submit,
    reset,
    // Constants for the UI (so it doesn't hardcode the same numbers)
    maxPhotos: MAX_PHOTOS,
  };
}
