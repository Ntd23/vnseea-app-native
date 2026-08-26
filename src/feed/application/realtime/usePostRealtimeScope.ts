import { useEffect, useMemo, useRef } from 'react';
import type { FeedPost } from '../../domain/types/feed.types';
import { postRealtimeRuntime } from '../../infrastructure/realtime/postRealtimeRuntime';
import type { PostChangedEvent } from './postRealtimeCoordinator';
import {
  applySharedPostSourceSnapshot,
  getPostRealtimeWatchIds,
  markSharedLivePreviewEnded,
} from '../sharing/sharedPostPreview';

type Options = {
  postIds: Array<string | number>;
  posts?: FeedPost[];
  enabled?: boolean;
  onSnapshot?: (post: FeedPost) => void;
  onDeleted?: (postId: string) => void;
  onCommentMutation?: (change: PostChangedEvent) => void;
};

export function usePostRealtimeScope({
  postIds,
  posts = [],
  enabled = true,
  onSnapshot,
  onDeleted,
  onCommentMutation,
}: Options) {
  const callbacksRef = useRef({ onSnapshot, onDeleted, onCommentMutation });
  callbacksRef.current = { onSnapshot, onDeleted, onCommentMutation };
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const requestedIdsRef = useRef(new Set<string>());
  requestedIdsRef.current = new Set(postIds.map(postId => String(postId)));
  const normalizedIds = useMemo(
    () =>
      Array.from(
        new Set(
          getPostRealtimeWatchIds(posts, postIds)
            .map(value => String(value).trim())
            .filter(value => /^[1-9][0-9]*$/.test(value)),
        ),
      ).slice(0, 50),
    [postIds, posts],
  );
  const signature = normalizedIds.join(',');

  useEffect(() => {
    const ids = signature ? signature.split(',') : [];
    if (!enabled || ids.length === 0) return undefined;
    const watched = new Set(ids);
    const releaseWatch = postRealtimeRuntime.watchPosts(ids);
    const releaseListener = postRealtimeRuntime.subscribe(event => {
      if (!watched.has(event.type === 'mutation' ? event.change.postId : event.postId)) {
        return;
      }
      if (event.type === 'snapshot') {
        const sourceConsumers = postsRef.current.filter(
          post => String(post.sharedPostId ?? '') === String(event.post.id),
        );
        sourceConsumers.forEach(post =>
          callbacksRef.current.onSnapshot?.(
            applySharedPostSourceSnapshot(post, event.post),
          ),
        );
        if (requestedIdsRef.current.has(String(event.post.id))) {
          callbacksRef.current.onSnapshot?.(event.post);
        }
      }
      if (event.type === 'deleted') {
        postsRef.current
          .filter(post => String(post.sharedPostId ?? '') === event.postId)
          .forEach(post => {
            if (post.sharedPost?.content.kind === 'live') {
              callbacksRef.current.onSnapshot?.(
                markSharedLivePreviewEnded(post, event.postId),
              );
              return;
            }
            callbacksRef.current.onDeleted?.(String(post.id));
          });
        if (requestedIdsRef.current.has(event.postId)) {
          callbacksRef.current.onDeleted?.(event.postId);
        }
      }
      if (event.type === 'mutation' && event.change.mutation === 'comment') {
        callbacksRef.current.onCommentMutation?.(event.change);
      }
    });
    return () => {
      releaseListener();
      releaseWatch();
    };
  }, [enabled, signature]);
}
