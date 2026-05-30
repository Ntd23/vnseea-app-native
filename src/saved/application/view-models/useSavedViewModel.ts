// Description: ViewModel for the saved posts screen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSavedRepository } from '../../infrastructure/repositories/ApiSavedRepository';
import type { SavedItem, SavedItemKind } from '../../domain/types/saved.types';

const PAGE_SIZE = 20;

type LoadPhase = 'idle' | 'initial' | 'refreshing' | 'loading-more';
export type SavedFilter = 'all' | SavedItemKind;

export function useSavedViewModel() {
  const repository = useMemo(() => createSavedRepository(), []);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [phase, setPhase] = useState<LoadPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<SavedFilter>('all');

  const loadInitial = useCallback(
    async (mode: 'initial' | 'refreshing' = 'initial') => {
      setPhase(mode);
      setError(null);

      try {
        const page = await repository.getSavedPosts({ limit: PAGE_SIZE });
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không tải được bài viết đã lưu.',
        );
      } finally {
        setPhase('idle');
      }
    },
    [repository],
  );

  useEffect(() => {
    loadInitial('initial');
  }, [loadInitial]);

  const refresh = useCallback(() => loadInitial('refreshing'), [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || phase !== 'idle') return;

    setPhase('loading-more');
    setError(null);

    try {
      const page = await repository.getSavedPosts({
        limit: PAGE_SIZE,
        afterPostId: nextCursor,
      });
      setItems(prev => {
        const seen = new Set(prev.map(item => item.id));
        return [...prev, ...page.items.filter(item => !seen.has(item.id))];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không tải thêm được bài viết đã lưu.',
      );
    } finally {
      setPhase('idle');
    }
  }, [hasMore, nextCursor, phase, repository]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => item.kind === filter);
  }, [filter, items]);

  return {
    items,
    filteredItems,
    filter,
    error,
    isLoading: phase === 'initial',
    isRefreshing: phase === 'refreshing',
    isLoadingMore: phase === 'loading-more',
    hasMore,
    setFilter,
    refresh,
    retry: () => loadInitial('initial'),
    loadMore,
  };
}
