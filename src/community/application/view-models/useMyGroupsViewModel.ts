import { useCallback, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createCommunityRepository } from '../../infrastructure/repositories/ApiCommunityRepository';
import type { GroupItem, GroupsFilter } from '../../domain/types/community.types';

const GROUP_LIMIT = 20;
const repository = createCommunityRepository();

async function fetchGroups(filter: GroupsFilter, offset?: string | null) {
  if (filter === 'suggested') {
    return repository.getSuggestedGroups({ limit: GROUP_LIMIT });
  }

  if (filter === 'joined') {
    const userId = sessionStorage.getSession()?.userId;
    if (!userId) {
      throw new Error(
        'Không tìm thấy tài khoản hiện tại để tải nhóm đã tham gia.',
      );
    }

    return repository.getJoinedGroups(userId, {
      limit: GROUP_LIMIT,
      offset,
    });
  }

  return repository.getMyGroups({
    limit: GROUP_LIMIT,
    offset,
  });
}

export function useMyGroupsViewModel() {
  const [activeFilter, setActiveFilterState] = useState<GroupsFilter>('mine');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetchGroups(activeFilter);
        setGroups(result.items);
        setNextOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách nhóm. Vui lòng thử lại.';
        setError(message);
        setGroups([]);
        setNextOffset(null);
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeFilter],
  );

  const setActiveFilter = useCallback(
    (filter: GroupsFilter) => {
      if (filter === activeFilter) return;

      setActiveFilterState(filter);
      setGroups([]);
      setNextOffset(null);
      setHasMore(true);
      setError(null);
    },
    [activeFilter],
  );

  const refresh = useCallback(() => loadFirstPage(true), [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextOffset || isLoading || isRefreshing || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await fetchGroups(activeFilter, nextOffset);

      setGroups(current => {
        const existingIds = new Set(current.map(group => String(group.id)));
        const nextItems = result.items.filter(
          group => !existingIds.has(String(group.id)),
        );
        return [...current, ...nextItems];
      });
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải thêm nhóm. Vui lòng thử lại.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    activeFilter,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    nextOffset,
  ]);

  const retry = useCallback(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  return {
    activeFilter,
    groups,
    hasMore,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    setActiveFilter,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  };
}
