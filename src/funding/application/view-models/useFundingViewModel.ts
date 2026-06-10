// Funding - useFundingViewModel ViewModel
// Port từ: client/src/funding/application/view-models/

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';
import type { FundingItem } from '../../domain/types/funding.types';

const repository = createFundingRepository();

export interface FundingViewMeta {
  currencySymbol: string;
  canCreate: boolean;
}

const INITIAL_META: FundingViewMeta = {
  currencySymbol: 'đ',
  canCreate: true,
};

export function useFundingViewModel() {
  const [campaigns, setCampaigns] = useState<FundingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<FundingViewMeta>(INITIAL_META);

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await repository.getFundingList({ limit: 20 });
      setCampaigns(response);
      setMeta({ currencySymbol: 'đ', canCreate: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Lỗi khi tải gây quỹ',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch every time the screen regains focus (including first mount)
  // so newly created campaigns or donations made on the detail screen show
  // up when the user navigates back to the list.
  useFocusEffect(
    useCallback(() => {
      loadCampaigns();
    }, [loadCampaigns]),
  );

  return {
    campaigns,
    isLoading,
    error,
    currencySymbol: meta.currencySymbol,
    canCreate: meta.canCreate,
    reload: loadCampaigns,
  };
}
