// Feed - useFeedViewModel ViewModel
// Port from: client/src/feed/application/view-models/

import { useCallback, useEffect, useState } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type {
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';

const repository = createFeedRepository();

export function useFeedViewModel() {
  const [videoPosts, setVideoPosts] = useState<FeedVideoPost[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Text/photo posts live in a SEPARATE state slice from videos because
  // the UI renders them in different sections (a "Video mới" carousel
  // vs. a regular post feed) and we want each section's loading/error
  // states to be independent — a failed text fetch shouldn't blank
  // the video carousel.
  const [textPosts, setTextPosts] = useState<FeedTextPost[]>([]);
  const [isLoadingTextPosts, setIsLoadingTextPosts] = useState(false);
  const [textPostsError, setTextPostsError] = useState<string | null>(null);

  const loadVideoPosts = useCallback(async () => {
    setIsLoadingVideos(true);
    setVideoError(null);
    try {
      setVideoPosts(await repository.getVideoPosts());
    } catch (caught) {
      setVideoError(
        caught instanceof Error ? caught.message : 'Không tải được video.',
      );
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  const loadTextPosts = useCallback(async () => {
    setIsLoadingTextPosts(true);
    setTextPostsError(null);
    try {
      setTextPosts(await repository.getTextPosts());
    } catch (caught) {
      setTextPostsError(
        caught instanceof Error ? caught.message : 'Không tải được bài đăng.',
      );
    } finally {
      setIsLoadingTextPosts(false);
    }
  }, []);

  useEffect(() => {
    // Fire both fetches in parallel — they hit the same endpoint but
    // we hand off filtering to the repository, so the network cost is
    // 2× (acceptable for now). When we add pagination we can share a
    // single network call and split client-side.
    void loadVideoPosts();
    void loadTextPosts();
  }, [loadVideoPosts, loadTextPosts]);

  /**
   * Insert a freshly-created post at the top of the text-posts feed.
   * Called by `useCreatePostViewModel.submit()` after a successful API
   * round-trip — gives the user the satisfying "my post appeared
   * instantly" feedback without waiting for a feed refetch.
   *
   * Dedupe by `id` so an accidental double-call (e.g. user mashes
   * Submit twice) doesn't show the same post twice.
   */
  const prependTextPost = useCallback((post: FeedTextPost) => {
    setTextPosts(prev => {
      if (prev.some(p => p.id === post.id)) return prev;
      return [post, ...prev];
    });
  }, []);

  /**
   * Add, swap, or clear a reaction on a video post — Facebook-style.
   *
   *   • No reaction       + nextReaction='like' → adds 'like'
   *   • Has 'like'        + nextReaction='like' → clears (toggle off)
   *   • Has 'like'        + nextReaction='love' → swaps to 'love'
   *
   * Optimistic: state flips immediately, then we round-trip to the server.
   * On failure we restore the original post. Count is adjusted ±1 at the
   * null boundary and 0 when swapping between two non-null reactions.
   */
  const toggleReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedVideoPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      setVideoPosts(prev =>
        prev.map(post => {
          if (post.id !== postId) return post;
          snapshot = post;
          const willClear = post.myReaction === nextReaction;
          targetReaction = willClear ? null : nextReaction;

          const wasReacted = post.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);

          return {
            ...post,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount: Math.max(0, post.likeCount + countDelta),
          };
        }),
      );

      try {
        await repository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          setVideoPosts(prev =>
            prev.map(post => (post.id === postId ? original : post)),
          );
        }
      }
    },
    [],
  );

  /**
   * Same reaction logic as videos, but operates on the textPosts slice.
   * Kept as a separate function (rather than overloading toggleReaction)
   * because the state slice + snapshot shape differ — keeping them
   * separate makes the rollback type-safe without `any`.
   */
  const toggleTextPostReaction = useCallback(
    async (postId: string, nextReaction: ReactionType) => {
      let snapshot: FeedTextPost | undefined;
      let targetReaction: ReactionType | null = nextReaction;

      setTextPosts(prev =>
        prev.map(post => {
          if (post.id !== postId) return post;
          snapshot = post;
          const willClear = post.myReaction === nextReaction;
          targetReaction = willClear ? null : nextReaction;

          const wasReacted = post.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const countDelta = Number(willBeReacted) - Number(wasReacted);

          return {
            ...post,
            myReaction: targetReaction,
            isLiked: willBeReacted,
            likeCount: Math.max(0, post.likeCount + countDelta),
          };
        }),
      );

      try {
        await repository.setReaction(postId, targetReaction);
      } catch {
        if (snapshot) {
          const original = snapshot;
          setTextPosts(prev =>
            prev.map(post => (post.id === postId ? original : post)),
          );
        }
      }
    },
    [],
  );

  const updateCommentCount = useCallback(
    (postId: string, delta: number) => {
      setVideoPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
            : post,
        ),
      );
      // Also update text/photo posts since they go through the same
      // comments sheet wiring — comment counts must stay in sync there
      // too.
      setTextPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
            : post,
        ),
      );
    },
    [],
  );

  return {
    // Aggregate loading/error (backwards-compat with existing screen code
    // that reads `isLoading` / `error`).
    isLoading: isLoadingVideos || isLoadingTextPosts,
    error: videoError ?? textPostsError,
    // Videos
    videoPosts,
    isLoadingVideos,
    videoError,
    reloadVideoPosts: loadVideoPosts,
    toggleReaction,
    // Text/photo posts
    textPosts,
    isLoadingTextPosts,
    textPostsError,
    reloadTextPosts: loadTextPosts,
    prependTextPost,
    toggleTextPostReaction,
    // Shared
    updateCommentCount,
  };
}
