// Description: Loads the current user's video posts for the Settings "My Videos" screen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type { FeedVideoPost } from '../../../feed/domain/types/feed.types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

type LoadPhase = 'idle' | 'loading' | 'refreshing';

const PAGE_SIZE = 60;

export function useMyVideosViewModel() {
  const repository = useMemo(() => createFeedRepository(), []);
  const [videos, setVideos] = useState<FeedVideoPost[]>([]);
  const [phase, setPhase] = useState<LoadPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(
    async (mode: 'loading' | 'refreshing' = 'loading') => {
      const session = sessionStorage.getSession();
      if (!session?.userId) {
        setVideos([]);
        setError('Không tìm thấy phiên đăng nhập.');
        return;
      }

      setPhase(mode);
      setError(null);

      try {
        const posts = await repository.getUserPosts(session.userId, PAGE_SIZE);
        const ownVideos = posts
          .filter((post): post is FeedVideoPost => post.kind === 'video')
          .filter(
            post =>
              !post.publisher.id ||
              String(post.publisher.id) === String(session.userId),
          );

        setVideos(ownVideos);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không tải được video của bạn. Vui lòng thử lại.',
        );
      } finally {
        setPhase('idle');
      }
    },
    [repository],
  );

  useEffect(() => {
    loadVideos('loading');
  }, [loadVideos]);

  const refresh = useCallback(() => loadVideos('refreshing'), [loadVideos]);
  const retry = useCallback(() => loadVideos('loading'), [loadVideos]);

  return {
    videos,
    error,
    isLoading: phase === 'loading',
    isRefreshing: phase === 'refreshing',
    refresh,
    retry,
  };
}
