// Ads ViewModel
import { useState, useCallback } from 'react';
import { createAdsRepository } from '../../infrastructure/repositories/ApiAdsRepository';
import type { AdItem, AdFormData } from '../../domain/types/ads.types';

const repository = createAdsRepository();

export function useAdsViewModel() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyAds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getMyAds();
      setAds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách quảng cáo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAd = useCallback(async (data: AdFormData): Promise<boolean> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await repository.createAd(data);
      setAds(prev => [result.ad, ...prev]);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const deleteAd = useCallback(async (id: number): Promise<boolean> => {
    try {
      const success = await repository.deleteAd(id);
      if (success) {
        setAds(prev => prev.filter(ad => ad.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được quảng cáo');
      return false;
    }
  }, []);

  return {
    ads,
    isLoading,
    isCreating,
    error,
    fetchMyAds,
    createAd,
    deleteAd,
  };
}
