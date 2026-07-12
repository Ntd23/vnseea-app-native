// English description: Coordinates advertising campaign loading and mutations.
import { useState, useCallback } from 'react';
import { createAdsRepository } from '../../infrastructure/repositories/ApiAdsRepository';
import type { AdItem, AdFormData, AdsOptions } from '../../domain/types/ads.types';

const repository = createAdsRepository();

export function useAdsViewModel() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AdsOptions | null>(null);

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

  const fetchOptions = useCallback(async () => {
    setError(null);
    try {
      const data = await repository.getOptions();
      setOptions(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không tải được tùy chọn quảng cáo.';
      setError(message);
      return null;
    }
  }, []);

  const createAd = useCallback(async (data: AdFormData): Promise<{ success: boolean; error?: string }> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await repository.createAd(data);
      setAds(prev => [result.ad, ...prev]);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateAd = useCallback(async (id: number, data: Partial<AdFormData>): Promise<{ success: boolean; error?: string }> => {
    setIsUpdating(true);
    setError(null);
    try {
      const success = await repository.updateAd(id, data);
      if (success) {
        setAds(prev => prev.map(ad => ad.id === id ? { ...ad, ...data } as AdItem : ad));
        return { success: true };
      }
      return { success: false, error: 'Cập nhật quảng cáo thất bại.' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
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
    isUpdating,
    error,
    options,
    fetchMyAds,
    fetchOptions,
    createAd,
    updateAd,
    deleteAd,
  };
}
