// Earnings ViewModel — UI-only phase, mock data

import {useState} from 'react';
import type {EarningsMenuItem} from '../../domain/types/wallet.types';

const MOCK_EARNINGS_ITEMS: EarningsMenuItem[] = [
  {id: 'affiliates', label: 'Cộng tác viên của tôi', iconKey: 'Users', section: 'earnings'},
  {id: 'balance', label: 'Số dư của tôi', iconKey: 'Wallet', section: 'earnings'},
  {id: 'points', label: 'Điểm của tôi', iconKey: 'Star', section: 'earnings'},
  {id: 'withdraw', label: 'Rút tiền', iconKey: 'Banknote', section: 'earnings'},
];

const MOCK_REFERRAL_ITEMS: EarningsMenuItem[] = [
  {id: 'invite', label: 'Mời bạn bè', iconKey: 'UserPlus', section: 'referral'},
  {id: 'share', label: 'Chia sẻ', iconKey: 'Share2', section: 'referral'},
];

export function useEarningsViewModel() {
  const [earningsItems] = useState<EarningsMenuItem[]>(MOCK_EARNINGS_ITEMS);
  const [referralItems] = useState<EarningsMenuItem[]>(MOCK_REFERRAL_ITEMS);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    earningsItems,
    referralItems,
    isLoading,
    error,
  };
}
