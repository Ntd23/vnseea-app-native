import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';
import type { FundingItem } from '../../domain/types/funding.types';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';

const repository = createFundingRepository();

export function useFundingViewModel() {
  const navigation = useNavigation();
  const { user } = useCurrentUserViewModel();
  const [coFundingCampaigns, setCoFundingCampaigns] = useState<FundingItem[]>([]);
  const [myRequestsCampaigns, setMyRequestsCampaigns] = useState<FundingItem[]>([]);
  const [coFundingPage, setCoFundingPage] = useState(1);
  const [myRequestsPage, setMyRequestsPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCoFunding = useCallback(async (pageNumber: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await repository.getFundingList({
        limit: 10,
        offset: (pageNumber - 1) * 10,
      });
      const campaignsWithDonations = await Promise.all(
        response.map(async (item) => {
          try {
            const donations = await repository.getRecentDonations(item.id);
            return { ...item, recent_donations: donations };
          } catch (e) {
            console.warn(`Failed to fetch donations for campaign ${item.id}:`, e);
            return item;
          }
        })
      );
      setCoFundingCampaigns(campaignsWithDonations);
      setCoFundingPage(pageNumber);
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

  const loadMyRequests = useCallback(async (pageNumber: number) => {
    if (!user?.userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await repository.getUserFunding(Number(user.userId), {
        limit: 10,
        offset: (pageNumber - 1) * 10,
      });
      const campaignsWithDonations = await Promise.all(
        response.map(async (item) => {
          try {
            const donations = await repository.getRecentDonations(item.id);
            return { ...item, recent_donations: donations };
          } catch (e) {
            console.warn(`Failed to fetch donations for campaign ${item.id}:`, e);
            return item;
          }
        })
      );
      setMyRequestsCampaigns(campaignsWithDonations);
      setMyRequestsPage(pageNumber);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Lỗi khi tải gây quỹ của tôi',
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  const reload = useCallback(() => {
    loadCoFunding(coFundingPage);
    if (user?.userId) {
      loadMyRequests(myRequestsPage);
    }
  }, [coFundingPage, myRequestsPage, loadCoFunding, loadMyRequests, user?.userId]);

  useEffect(() => {
    loadCoFunding(1);
    if (user?.userId) {
      loadMyRequests(1);
    }
  }, [loadCoFunding, loadMyRequests, user?.userId]);

  // Re-fetch every time the screen regains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      reload();
    });
    return unsubscribe;
  }, [navigation, reload]);

  return {
    coFundingCampaigns,
    myRequestsCampaigns,
    coFundingPage,
    myRequestsPage,
    isLoading,
    error,
    currencySymbol: 'VNSEEA',
    canCreate: true,
    loadCoFunding,
    loadMyRequests,
    reload,
  };
}
