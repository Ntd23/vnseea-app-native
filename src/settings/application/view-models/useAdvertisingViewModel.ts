// Description: Loads the current user's ad campaigns for the Settings advertising screen.
import { useCallback, useState } from 'react';
import { createAdsRepository } from '../../../advertising/infrastructure/repositories/ApiAdsRepository';
import type { AdItem, AdsOptions } from '../../../advertising/domain/types/ads.types';

const repository = createAdsRepository();

export function useAdvertisingViewModel() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AdsOptions | null>(null);

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
      try {
        setOptions(await repository.getOptions());
      } catch (optionError) {
        console.warn('[useAdvertisingViewModel] ad options unavailable:', optionError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách quảng cáo.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => fetchAds('refresh'), [fetchAds]);

  const deleteAd = useCallback(async (id: number): Promise<{ success: boolean; error?: string }> => {
    setIsDeleting(true);
    setError(null);
    try {
      const success = await repository.deleteAd(id);
      if (success) {
        setAds(prev => prev.filter(ad => ad.id !== id));
        return { success: true };
      }
      return { success: false, error: 'Xóa quảng cáo thất bại.' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    ads,
    isLoading,
    isRefreshing,
    isDeleting,
    error,
    options,
    fetchAds,
    refresh,
    deleteAd,
  };
}
