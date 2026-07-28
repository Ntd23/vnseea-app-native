// Description: ViewModel for the PostDetail screen — keeps the post state and
// mutations separate from the comment VM so the screen can paint immediately.
import { useCallback, useEffect, useState } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type { FeedPost } from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  GetPostByIdResult,
  ReportPostInput,
} from '../../domain/repositories/FeedRepository';

const feedRepository = createFeedRepository();

export interface UsePostDetailViewModelOptions {
  /**
   * The post object the screen already has from the route param. Used
   * as the initial value so the screen renders instantly. May be
   * undefined if the user landed here via deep link without a list
   * cache — in that case the VM falls back to `getPostById`.
   */
  fallbackPost?: FeedPost;
  /** Post id from the route. Always present. */
  postId: string;
}

export function usePostDetailViewModel({
  fallbackPost,
  postId,
}: UsePostDetailViewModelOptions) {
  const [post, setPost] = useState<FeedPost | undefined>(fallbackPost);
  const [isLoading, setIsLoading] = useState(fallbackPost === undefined);
  const [error, setError] = useState<string | null>(null);

  // The feed passes the complete post object, so the first paint is already
  // available. Do not refetch it during the transition; deep links without a
  // fallback still fetch immediately.
  useEffect(() => {
    let cancelled = false;
    setError(null);

    const needsPostFetch = fallbackPost === undefined;

    if (!needsPostFetch) return;

    setIsLoading(true);
    feedRepository
      .getPostById(postId, { fetchComments: false, addView: true })
      .then((result: GetPostByIdResult) => {
        if (cancelled) return;
        setPost(result.post);
      })
      .catch(caught => {
        if (cancelled) return;
        setError(
          caught instanceof Error ? caught.message : 'Không tải được bài viết.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackPost, postId]);

  const toggleReaction = useCallback(
    async (reaction: ReactionType | null) => {
      if (!post) return;

      const oldReaction = (post as any).myReaction ?? null;

      // 1. Optimistically update local post state
      setPost(prev => {
        if (!prev) return prev;
        const prevAny = prev as any;

        let nextReactionBreakdown = { ...(prevAny.reactionBreakdown ?? {}) };

        // Decrement old reaction if there was one
        if (oldReaction && nextReactionBreakdown[oldReaction] !== undefined) {
          nextReactionBreakdown[oldReaction] = Math.max(
            0,
            (nextReactionBreakdown[oldReaction] as number) - 1,
          );
        }

        // Increment new reaction
        if (reaction) {
          nextReactionBreakdown[reaction] =
            ((nextReactionBreakdown[reaction] as number) ?? 0) + 1;
        }

        // Update isLiked / likeCount for fallback fields
        const wasLiked = prevAny.isLiked;
        const nextIsLiked = reaction !== null;
        let nextLikeCount = prevAny.likeCount ?? 0;
        if (wasLiked && !nextIsLiked) {
          nextLikeCount = Math.max(0, nextLikeCount - 1);
        } else if (!wasLiked && nextIsLiked) {
          nextLikeCount += 1;
        }

        return {
          ...prev,
          myReaction: reaction,
          isLiked: nextIsLiked,
          likeCount: nextLikeCount,
          reactionBreakdown: nextReactionBreakdown,
        } as any;
      });

      try {
        await feedRepository.setReaction(postId, reaction);
      } catch (err) {
        console.warn('[usePostDetailViewModel] Failed to toggle reaction', err);
        // Rollback state on error
        setPost(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            myReaction: oldReaction,
            isLiked: oldReaction !== null,
          } as any;
        });
      }
    },
    [post, postId],
  );

  const applyRealtimePost = useCallback((nextPost: FeedPost) => {
    setPost(nextPost);
    setError(null);
  }, []);

  const markRealtimeDeleted = useCallback(() => {
    setPost(undefined);
    setError('Bài viết không còn tồn tại hoặc đã bị xóa.');
  }, []);

  const adjustCommentCount = useCallback((delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;
    setPost(current => {
      if (!current || !('commentCount' in current)) return current;
      return {
        ...current,
        commentCount: Math.max(0, current.commentCount + delta),
      } as FeedPost;
    });
  }, []);

  const savePost = useCallback(
    (targetPostId: string) => feedRepository.savePost(targetPostId),
    [],
  );

  const reportPost = useCallback(
    (targetPostId: string, input: ReportPostInput) =>
      feedRepository.reportPost(targetPostId, input),
    [],
  );

  const deletePost = useCallback(async (targetPostId: string) => {
    const result = await feedRepository.deletePost(targetPostId);
    if (result.deleted) {
      setPost(undefined);
    }
    return result;
  }, []);

  return {
    post,
    isLoading,
    error,
    toggleReaction,
    applyRealtimePost,
    markRealtimeDeleted,
    adjustCommentCount,
    savePost,
    reportPost,
    deletePost,
  };
}
