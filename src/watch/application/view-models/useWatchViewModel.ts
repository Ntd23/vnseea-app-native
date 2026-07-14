// Description: Manages the API-backed watch playlist, selection, and pagination state.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReelsItem } from '../../../reels/domain/types/reels.types';
import { createReelsRepository } from '../../../reels/infrastructure/repositories/ApiReelsRepository';

const PAGE_SIZE = 12;

export function useWatchViewModel() {
  const repository = useMemo(() => createReelsRepository(), []);
  const [videos, setVideos] = useState<ReelsItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async (refreshing = false) => {
    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);

    try {
      const page = await repository.fetchReels({ limit: PAGE_SIZE });
      setVideos(page.items);
      setSelectedId(current =>
        current && page.items.some(item => item.id === current)
          ? current
          : page.items[0]?.id ?? null,
      );
      setNextCursor(page.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể tải video. Vui lòng thử lại.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [repository]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading || isRefreshing || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const page = await repository.fetchReels({
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      setVideos(current => {
        const knownIds = new Set(current.map(item => item.id));
        return [
          ...current,
          ...page.items.filter(item => !knownIds.has(item.id)),
        ];
      });
      setNextCursor(page.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể tải thêm video.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, isRefreshing, nextCursor, repository]);

  const selectedIndex = videos.findIndex(item => item.id === selectedId);
  const selectedVideo = selectedIndex >= 0 ? videos[selectedIndex] : videos[0];

  const selectVideo = useCallback((videoId: string) => {
    setSelectedId(videoId);
  }, []);

  const selectPrevious = useCallback(() => {
    setSelectedId(current => {
      const index = videos.findIndex(item => item.id === current);
      return index > 0 ? videos[index - 1].id : current;
    });
  }, [videos]);

  const selectNext = useCallback(() => {
    setSelectedId(current => {
      const index = videos.findIndex(item => item.id === current);
      return index >= 0 && index < videos.length - 1
        ? videos[index + 1].id
        : current;
    });
  }, [videos]);

  return {
    videos,
    selectedVideo,
    selectedIndex,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore: Boolean(nextCursor),
    loadFirstPage,
    loadMore,
    selectVideo,
    selectPrevious,
    selectNext,
  };
}
