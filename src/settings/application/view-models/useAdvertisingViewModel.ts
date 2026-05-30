// Description: Loads the current user's ad campaigns for the Settings advertising screen.
import { useCallback, useState } from 'react';
import { createAdsRepository } from '../../../advertising/infrastructure/repositories/ApiAdsRepository';
import type { AdItem } from '../../../advertising/domain/types/ads.types';

const repository = createAdsRepository();

export function useAdvertisingViewModel() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAds = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await repository.getMyAds();
      setAds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách quảng cáo.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => fetchAds('refresh'), [fetchAds]);

  return {
    ads,
    isLoading,
    isRefreshing,
    error,
    fetchAds,
    refresh,
  };
}
