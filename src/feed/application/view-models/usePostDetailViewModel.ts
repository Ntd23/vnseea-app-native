// Description: ViewModel for the PostDetail screen — loads a single
// post by id (with comments), exposes the comment composer state, and
// keeps the in-memory post in sync with the route param so the screen
// can re-mount from a list push without re-fetching.
import { useCallback, useEffect, useState } from 'react';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import { createReelsRepository } from '../../../reels/infrastructure/repositories/ApiReelsRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { FeedPost } from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  GetPostByIdResult,
  PostComment,
} from '../../domain/repositories/FeedRepository';

const feedRepository = createFeedRepository();
const reelsRepository = createReelsRepository();

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
  const [comments, setComments] = useState<PostComment[]>([]);
  const [likedUsers, setLikedUsers] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(fallbackPost === undefined);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the post + initial comments on mount if we don't already
  // have the post from the route param. The result is also used to
  // back-fill the post when the param was missing.
  useEffect(() => {
    let cancelled = false;
    setError(null);

    const needsPostFetch = fallbackPost === undefined;

    if (needsPostFetch) {
      setIsLoading(true);
    }
    setIsLoadingComments(true);

    feedRepository
      .getPostById(postId, { fetchComments: true, addView: true })
      .then((result: GetPostByIdResult) => {
        if (cancelled) return;
        setPost(prev => prev ?? result.post);
        setComments(result.comments);

        // Fetch liked users preview list (max 3 users for stacked avatar visual feedback)
        feedRepository
          .getPostReactions(postId, undefined, 3)
          .then(reactionsPage => {
            if (cancelled) return;
            const mapped = (reactionsPage.users ?? []).map(u => ({
              avatar: u.avatarUrl,
              name: u.name,
              username: u.username,
              id: u.id,
            }));
            setLikedUsers(mapped);
          })
          .catch(err => {
            console.warn('[usePostDetailViewModel] Failed to fetch liked users preview', err);
          });
      })
      .catch(caught => {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không tải được bài viết.',
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setIsLoadingComments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackPost, postId]);

  const submitComment = useCallback(
    async (text: string) => {
      if (!post) return;
      setIsSubmitting(true);
      try {
        // The comments API lives in the reels domain because WoWonder
        // uses the same endpoint for both. We route through reels here
        // for consistency with the existing feed comments VM.
        const newComment = await reelsRepository.addComment(post.id, text);
        const session = sessionStorage.getSession();

        // Optimistic shape — we don't get a full publisher object back
        // from `addComment` so we fall back to the current user from
        // session storage. The list re-renders instantly; if the API
        // returns more, the user can pull-to-refresh in a follow-up.
        const optimistic: PostComment = {
          id: newComment.id,
          text: newComment.text,
          postedAt: newComment.postedAt,
          publisher: {
            id: session?.userId ?? '',
            name: newComment.publisher.name,
            username: newComment.publisher.username,
            avatarUrl: newComment.publisher.avatarUrl,
          },
          likeCount: 0,
          isLiked: false,
        };
        setComments(prev => [optimistic, ...prev]);
        // Bump the post's comment count locally so the header reflects
        // the new total without a refetch.
        setPost(prev => {
          if (!prev) return prev;
          if ('commentCount' in prev) {
            return { ...prev, commentCount: (prev as any).commentCount + 1 } as FeedPost;
          }
          return prev;
        });
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không gửi được bình luận.',
        );
        // Re-throw so the composer can keep the draft text in place
        // if the caller wants to surface the error inline.
        throw caught;
      } finally {
        setIsSubmitting(false);
      }
    },
    [post],
  );

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
          nextReactionBreakdown[oldReaction] = Math.max(0, (nextReactionBreakdown[oldReaction] as number) - 1);
        }

        // Increment new reaction
        if (reaction) {
          nextReactionBreakdown[reaction] = ((nextReactionBreakdown[reaction] as number) ?? 0) + 1;
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
        // Refresh liked users preview list after updating reaction
        const reactionsPage = await feedRepository.getPostReactions(postId, undefined, 3);
        const mapped = (reactionsPage.users ?? []).map(u => ({
          avatar: u.avatarUrl,
          name: u.name,
          username: u.username,
          id: u.id,
        }));
        setLikedUsers(mapped);
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
    [post, postId]
  );

  return {
    post,
    comments,
    isLoading,
    isLoadingComments,
    error,
    submitComment,
    isSubmitting,
    likedUsers,
    toggleReaction,
  };
}
