// Description: Offers ViewModel
import { useState, useCallback, useEffect } from 'react';
import { createOffersRepository } from '../../infrastructure/repositories/ApiOffersRepository';
import type { OfferItem } from '../../domain/types/offers.types';

const repository = createOffersRepository();

export function useOffersViewModel() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getOffers({ limit: 20 });
      setOffers(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể tải danh sách ưu đãi',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  return {
    offers,
    isLoading,
    error,
    reload: loadOffers,
  };
}