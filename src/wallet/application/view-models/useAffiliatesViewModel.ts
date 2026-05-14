// Affiliates ViewModel — UI-only phase, mock data

import { useCallback } from 'react';
import { Alert, Share } from 'react-native';

const MOCK_REFERRAL_LINK = 'https://vnseea.com/ref/user123';
const MOCK_EARNING_PER_USER = '$0.10';

export function useAffiliatesViewModel() {
  const handleCopy = useCallback(() => {
    // UI-only: simulate clipboard copy with feedback alert
    Alert.alert('Đã sao chép!', 'Liên kết giới thiệu đã được sao chép vào bộ nhớ tạm.');
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Tham gia VNSEEA cùng tôi và kiếm tiền ngay! ${MOCK_REFERRAL_LINK}`,
        url: MOCK_REFERRAL_LINK,
        title: 'Chia sẻ liên kết giới thiệu',
      });
    } catch {
      // user cancelled — no-op
    }
  }, []);

  return {
    referralLink: MOCK_REFERRAL_LINK,
    earningPerUser: MOCK_EARNING_PER_USER,
    handleCopy,
    handleShare,
  };
}
