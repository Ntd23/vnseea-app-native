// Description: Coordinates real referral reward loading, sharing, and copy actions.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Share } from 'react-native';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';
import type { AffiliateOverview } from '../../domain/types/wallet.types';
import { createAffiliatesRepository } from '../../infrastructure/repositories/ApiAffiliatesRepository';

const repository = createAffiliatesRepository();

export function useAffiliatesViewModel() {
  const [overview, setOverview] = useState<AffiliateOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await repository.getOverview();
      setOverview(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải dữ liệu giới thiệu.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview().catch(() => undefined);
  }, [loadOverview]);

  const referralLink = overview?.referralLink ?? '';
  const earningPerUserText = useMemo(
    () =>
      formatCurrency(
        overview?.earningPerUser ?? 0,
        overview?.currency ?? 'VND',
        overview?.currencySymbol ?? 'đ',
      ),
    [overview],
  );
  const availableRewardText = useMemo(
    () =>
      formatCurrency(
        overview?.availableReward ?? 0,
        overview?.currency ?? 'VND',
        overview?.currencySymbol ?? 'đ',
      ),
    [overview],
  );

  const handleCopy = useCallback(async () => {
    if (!referralLink) {
      Alert.alert(
        'Chưa có liên kết',
        'Không thể sao chép khi chưa tải xong dữ liệu.',
      );
      return;
    }

    try {
      const { Clipboard } = require('react-native');
      await Clipboard.setString(referralLink);
      Alert.alert('Đã sao chép', 'Liên kết giới thiệu đã được sao chép.');
    } catch {
      Alert.alert('Không thể sao chép', referralLink);
    }
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    if (!referralLink) return;

    try {
      await Share.share({
        message: `Tham gia VNSEEA cùng tôi và nhận thưởng giới thiệu: ${referralLink}`,
        url: referralLink,
        title: 'Giới thiệu và nhận thưởng',
      });
    } catch {
      // User cancelled share sheet.
    }
  }, [referralLink]);

  return {
    referralLink,
    earningPerUser: overview?.earningPerUser ?? 0,
    earningPerUserText,
    qualifiedUsers: overview?.qualifiedUsers ?? 0,
    availableReward: overview?.availableReward ?? 0,
    availableRewardText,
    requirements: overview?.requirements ?? [],
    referredUsers: overview?.referredUsers ?? [],
    isLoading,
    error,
    reload: loadOverview,
    handleCopy,
    handleShare,
  };
}
