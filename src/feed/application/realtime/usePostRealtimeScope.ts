import { useEffect, useMemo, useRef } from 'react';
import type { FeedPost } from '../../domain/types/feed.types';
import { postRealtimeRuntime } from '../../infrastructure/realtime/postRealtimeRuntime';
import type { PostChangedEvent } from './postRealtimeCoordinator';

type Options = {
  postIds: Array<string | number>;
  enabled?: boolean;
  onSnapshot?: (post: FeedPost) => void;
  onDeleted?: (postId: string) => void;
  onCommentMutation?: (change: PostChangedEvent) => void;
};

export function usePostRealtimeScope({
  postIds,
  enabled = true,
  onSnapshot,
  onDeleted,
  onCommentMutation,
}: Options) {
  const callbacksRef = useRef({ onSnapshot, onDeleted, onCommentMutation });
  callbacksRef.current = { onSnapshot, onDeleted, onCommentMutation };
  const normalizedIds = useMemo(
    () =>
      Array.from(
        new Set(
          postIds
            .map(value => String(value).trim())
            .filter(value => /^[1-9][0-9]*$/.test(value)),
        ),
      )
        .sort((left, right) => Number(left) - Number(right))
        .slice(0, 50),
    [postIds],
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
      if (event.type === 'snapshot') callbacksRef.current.onSnapshot?.(event.post);
      if (event.type === 'deleted') callbacksRef.current.onDeleted?.(event.postId);
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
