// Funding - useFundingViewModel ViewModel
// Port từ: client/src/funding/application/view-models/

import { useState, useCallback, useEffect } from 'react';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';
import type { FundingItem } from '../../domain/types/funding.types';

const repository = createFundingRepository();

export interface FundingViewData {
  currencySymbol: string;
  canCreate: boolean;
}

export function useFundingViewModel() {
  const [campaigns, setCampaigns] = useState<FundingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<FundingViewData>({
    currencySymbol: 'đ',
    canCreate: false,
  });

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await repository.getFundingList({ limit: 20 });
      setCampaigns(response);
      // Meta would come from API response in production
      setMeta({ currencySymbol: 'đ', canCreate: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Lỗi khi tải gây quỹ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    currencySymbol: meta.currencySymbol,
    canCreate: meta.canCreate,
    reload: loadCampaigns,
  };
}
