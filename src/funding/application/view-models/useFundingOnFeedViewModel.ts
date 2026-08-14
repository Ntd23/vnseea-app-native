// Description: Loads a compact fundraising rail for the home feed.
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';
import type { FundingItem } from '../../domain/types/funding.types';

const repository = createFundingRepository();
const FEED_FUNDING_LIMIT = 8;
const DEFAULT_CURRENCY_SYMBOL = 'VNSEEA';

type InteractionTask = ReturnType<typeof InteractionManager.runAfterInteractions>;

let pendingFundingCacheTask: InteractionTask | null = null;

function cacheFundingAfterInteractions(campaigns: FundingItem[]) {
  const snapshot = campaigns.slice(0, FEED_FUNDING_LIMIT);
  pendingFundingCacheTask?.cancel();
  pendingFundingCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedFunding(snapshot);
    pendingFundingCacheTask = null;
  });
}

type UseFundingOnFeedViewModelOptions = {
  autoLoad?: boolean;
};

export function useFundingOnFeedViewModel(
  options: UseFundingOnFeedViewModelOptions = {},
) {
  const { autoLoad = true } = options;
  const [campaigns, setCampaigns] = useState<FundingItem[]>(() => {
    return autoLoad ? feedCacheStorage.getCachedFunding() : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadFunding = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await repository.getFundingList({
        limit: FEED_FUNDING_LIMIT,
      });
      setCampaigns(result);
      cacheFundingAfterInteractions(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Khong tai duoc danh sach gay quy.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    reloadFunding();
  }, [autoLoad, reloadFunding]);

  return {
    campaigns,
    currencySymbol: DEFAULT_CURRENCY_SYMBOL,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    error,
    reloadFunding,
  };
}
