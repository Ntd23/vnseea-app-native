// Description: Manages the following/followers list state with real API data.
import { useCallback, useMemo, useState } from 'react';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type { UserProfile } from '../../../user/domain/types/user.types';

type TabType = 'following' | 'followers';

const PAGE_SIZE = 20;

export function useFollowingViewModel() {
  const repository = useMemo(() => createUserRepository(), []);

  // States for following tab
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [followingOffset, setFollowingOffset] = useState<string | null>(null);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);

  // States for followers tab
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [followersOffset, setFollowersOffset] = useState<string | null>(null);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(
    async (refreshing = false) => {
      const userId = sessionStorage.getSession()?.userId;

      if (!userId) {
        setFollowing([]);
        setFollowers([]);
        setError('Không tìm thấy phiên đăng nhập.');
        return;
      }

      refreshing ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const result = await repository.getFriends({
          userId,
          type: ['following', 'followers'],
          limit: PAGE_SIZE,
        });

        setFollowing(result.following);
        setFollowers(result.followers);
        setFollowingOffset(null);
        setFollowersOffset(null);
        setHasMoreFollowing(result.following.length >= PAGE_SIZE);
        setHasMoreFollowers(result.followers.length >= PAGE_SIZE);
      } catch (err) {
        setFollowing([]);
        setFollowers([]);
        setError(
          err instanceof Error ? err.message : 'Không thể tải danh sách.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [repository],
  );

  const refresh = useCallback(() => loadFirstPage(true), [loadFirstPage]);

  const loadMore = useCallback(async () => {
    const userId = sessionStorage.getSession()?.userId;

    if (!userId || isLoading || isRefreshing || isLoadingMore) {
      return;
    }

    if (activeTab === 'following' && (!hasMoreFollowing || !followingOffset)) {
      return;
    }

    if (activeTab === 'followers' && (!hasMoreFollowers || !followersOffset)) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await repository.getFriends({
        userId,
        type: [activeTab],
        limit: PAGE_SIZE,
        followingOffset: activeTab === 'following' ? Number(followingOffset) : undefined,
        followersOffset: activeTab === 'followers' ? Number(followersOffset) : undefined,
      });

      if (activeTab === 'following') {
        const newItems = result.following.filter(
          (item) => !following.some(existing => existing.id === item.id)
        );
        setFollowing(prev => [...prev, ...newItems]);
        setHasMoreFollowing(result.following.length >= PAGE_SIZE);
        setFollowingOffset(result.following.length > 0
          ? String(result.following[result.following.length - 1].id)
          : null);
      } else {
        const newItems = result.followers.filter(
          (item) => !followers.some(existing => existing.id === item.id)
        );
        setFollowers(prev => [...prev, ...newItems]);
        setHasMoreFollowers(result.followers.length >= PAGE_SIZE);
        setFollowersOffset(result.followers.length > 0
          ? String(result.followers[result.followers.length - 1].id)
          : null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải thêm.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    activeTab,
    following,
    followingOffset,
    followers,
    followersOffset,
    hasMoreFollowing,
    hasMoreFollowers,
    isLoading,
    isLoadingMore,
    isRefreshing,
    repository,
  ]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const retry = useCallback(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  // Get current list based on active tab
  const currentList = activeTab === 'following' ? following : followers;
  const hasMore = activeTab === 'following' ? hasMoreFollowing : hasMoreFollowers;

  return {
    following,
    followers,
    currentList,
    activeTab,
    error,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    loadFirstPage,
    refresh,
    loadMore,
    switchTab,
    retry,
  };
}
