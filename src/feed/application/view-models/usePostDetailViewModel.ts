// Description: ViewModel for the PostDetail screen — keeps the post state and
// mutations separate from the comment VM so the screen can paint immediately.
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { createFeedRepository } from '../../infrastructure/repositories/ApiFeedRepository';
import type { FeedPost, PostPrivacy } from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type {
  GetPostByIdResult,
  ReportPostInput,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';
import {
  applyFeedPostCaptionEdit,
  applyLocalPostCaptionEdit,
} from '../editing/postCaptionEdit';
import { editPostWithLocalFallback } from '../editing/editPostWithLocalFallback';
import { postEditedEvents } from '../events/postEditedEvents';

const feedRepository = createFeedRepository();

type ReactionCapablePost = FeedPost & {
  isLiked: boolean;
  likeCount: number;
  myReaction: ReactionType | null;
  reactionBreakdown?: Partial<Record<ReactionType, number>>;
  topReactions: ReactionType[];
};

function isReactionCapablePost(post: FeedPost): post is ReactionCapablePost {
  return (
    'isLiked' in post &&
    'likeCount' in post &&
    'myReaction' in post &&
    'topReactions' in post
  );
}

function applyDetailReaction(
  post: ReactionCapablePost,
  requestedReaction: ReactionType | null,
): ReactionCapablePost {
  const previousReaction = post.myReaction;
  const targetReaction =
    requestedReaction !== null && previousReaction === requestedReaction
      ? null
      : requestedReaction;
  const wasReacted = previousReaction !== null;
  const willBeReacted = targetReaction !== null;
  const likeCount = Math.max(
    0,
    post.likeCount + Number(willBeReacted) - Number(wasReacted),
  );
  const reactionBreakdown = { ...(post.reactionBreakdown ?? {}) };

  if (previousReaction) {
    reactionBreakdown[previousReaction] = Math.max(
      0,
      (reactionBreakdown[previousReaction] ?? 0) - 1,
    );
  }
  if (targetReaction) {
    reactionBreakdown[targetReaction] =
      (reactionBreakdown[targetReaction] ?? 0) + 1;
  }

  let topReactions = [...post.topReactions];
  if (previousReaction && previousReaction !== targetReaction) {
    topReactions = topReactions.filter(type => type !== previousReaction);
  }
  if (targetReaction && !topReactions.includes(targetReaction)) {
    topReactions = [targetReaction, ...topReactions].slice(0, 3);
  }
  if (likeCount === 0) topReactions = [];

  return {
    ...post,
    myReaction: targetReaction,
    isLiked: willBeReacted,
    likeCount,
    reactionBreakdown,
    topReactions,
  };
}

function publishPostReaction(postId: string, post: ReactionCapablePost): void {
  DeviceEventEmitter.emit('postReactionChanged', {
    postId,
    myReaction: post.myReaction,
    likeCount: post.likeCount,
    topReactions: post.topReactions,
  });
}

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
  const [post, setPost] = useState<FeedPost | undefined>(() =>
    fallbackPost ? applyLocalPostCaptionEdit(fallbackPost) : undefined,
  );
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
        setPost(applyLocalPostCaptionEdit(result.post));
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

  useEffect(
    () =>
      postEditedEvents.subscribe(event => {
        if (String(event.postId) !== String(postId)) return;
        setPost(current =>
          current ? applyFeedPostCaptionEdit(current, event.text) : current,
        );
      }),
    [postId],
  );

  const toggleReaction = useCallback(
    async (requestedReaction: ReactionType | null) => {
      if (!post || !isReactionCapablePost(post)) return;

      const originalPost = post;
      const nextPost = applyDetailReaction(post, requestedReaction);

      setPost(nextPost);
      publishPostReaction(postId, nextPost);

      try {
        await feedRepository.setReaction(postId, nextPost.myReaction);
      } catch (err) {
        console.warn('[usePostDetailViewModel] Failed to toggle reaction', err);
        setPost(originalPost);
        publishPostReaction(postId, originalPost);
      }
    },
    [post, postId],
  );

  const applyRealtimePost = useCallback((nextPost: FeedPost) => {
    setPost(applyLocalPostCaptionEdit(nextPost));
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

  const sharePost = useCallback(
    (input: SharePostInput) => feedRepository.sharePost(input),
    [],
  );

  const deletePost = useCallback(async (targetPostId: string) => {
    const result = await feedRepository.deletePost(targetPostId);
    if (result.deleted) {
      setPost(undefined);
    }
    return result;
  }, []);

  const editPost = useCallback(
    async (
      targetPostId: string,
      input: { text: string; privacy?: PostPrivacy },
    ) => {
      return editPostWithLocalFallback(
        feedRepository.editPost,
        targetPostId,
        input,
      );
    },
    [],
  );

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
    sharePost,
    deletePost,
    editPost,
  };
}
