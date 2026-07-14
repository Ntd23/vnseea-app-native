// Funding Detail ViewModel
// Manages single-campaign detail with donate / edit / delete actions.

import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';
import type {
  FundingItem,
  FundingDonation,
} from '../../domain/types/funding.types';

const repository = createFundingRepository();

export interface FundingDetailMeta {
  currencySymbol: string;
}

export function useFundingDetailViewModel(fundId: string) {
  const [campaign, setCampaign] = useState<FundingItem | null>(null);
  const [donationsList, setDonationsList] = useState<FundingDonation[]>([]);
  const [donationsPage, setDonationsPage] = useState(1);
  const [isLoadingDonations, setIsLoadingDonations] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<FundingDetailMeta>({
    currencySymbol: 'VNSEEA',
  });

  const loadDonations = useCallback(async (pageNumber: number, overrideCampaignId?: number) => {
    const cId = overrideCampaignId ?? campaign?.id;
    if (!cId) return;
    setIsLoadingDonations(true);
    try {
      const response = await repository.getRecentDonations(cId, {
        limit: 10,
        offset: (pageNumber - 1) * 10,
      });
      setDonationsList(response);
      setDonationsPage(pageNumber);
    } catch (e) {
      console.warn('Failed to load donations page:', pageNumber, e);
    } finally {
      setIsLoadingDonations(false);
    }
  }, [campaign?.id]);

  const load = useCallback(async () => {
    if (!fundId) return;
    setIsLoading(true);
    setError(null);
    try {
      const detail = await repository.getFundingById(fundId);
      setCampaign(detail);
      if (detail) {
        await loadDonations(1, detail.id);
      }
      setMeta({ currencySymbol: 'VNSEEA' });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Lỗi khi tải chi tiết gây quỹ',
      );
    } finally {
      setIsLoading(false);
    }
  }, [fundId, loadDonations]);

  useEffect(() => {
    load();
  }, [load]);

  const donate = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!campaign) return false;
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Số tiền ủng hộ phải lớn hơn 0');
        return false;
      }
      setIsDonating(true);
      setError(null);
      try {
        await repository.donate(campaign.id, amount);
        // Reload detail so raised/percentage update
        await load();
        return true;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Ủng hộ thất bại, vui lòng thử lại',
        );
        return false;
      } finally {
        setIsDonating(false);
      }
    },
    [campaign, load],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!campaign) return false;
    setIsDeleting(true);
    setError(null);
    try {
      await repository.deleteFunding(campaign.id);
      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Xóa chiến dịch thất bại',
      );
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [campaign]);

  const confirmDelete = useCallback(
    (onDeleted: () => void) => {
      Alert.alert(
        'Xóa chiến dịch',
        'Bạn có chắc muốn xóa chiến dịch này? Hành động này không thể hoàn tác.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              const ok = await remove();
              if (ok) {
                onDeleted();
              }
            },
          },
        ],
      );
    },
    [remove],
  );

  return {
    campaign,
    donations: donationsList,
    donationsPage,
    isLoadingDonations,
    isLoading,
    isDonating,
    isDeleting,
    error,
    currencySymbol: meta.currencySymbol,
    reload: load,
    loadDonations,
    donate,
    remove,
    confirmDelete,
  };
}
