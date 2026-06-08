// Description: Loads suggested groups for the home feed horizontal carousel.
import { useCallback, useEffect, useState } from 'react';
import { createCommunityRepository } from '../../infrastructure/repositories/ApiCommunityRepository';
import type { GroupItem } from '../../domain/types/community.types';

const repository = createCommunityRepository();
const FEED_GROUPS_LIMIT = 10;

type UseSuggestedGroupsOnFeedViewModelOptions = {
  autoLoad?: boolean;
};

export function useSuggestedGroupsOnFeedViewModel(
  options: UseSuggestedGroupsOnFeedViewModelOptions = {},
) {
  const { autoLoad = true } = options;
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadGroups = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const page = await repository.getSuggestedGroups({
        limit: FEED_GROUPS_LIMIT,
      });
      setGroups(page.items);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không tải được danh sách nhóm gợi ý.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    reloadGroups();
  }, [autoLoad, reloadGroups]);

  return {
    groups,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    error,
    reloadGroups,
  };
}
