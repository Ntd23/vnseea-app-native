// Earnings ViewModel — connected to real wallet API

import { useCallback, useEffect, useState } from 'react';
import type {EarningsMenuItem, WalletOverview} from '../../domain/types/wallet.types';
import { createWalletRepository } from '../../infrastructure/repositories/ApiWalletRepository';

const repository = createWalletRepository();

const MOCK_EARNINGS_ITEMS: EarningsMenuItem[] = [
  {id: 'affiliates', label: 'Cộng tác viên của tôi', iconKey: 'Users', section: 'earnings'},
  {id: 'balance', label: 'Số dư của tôi', iconKey: 'Wallet', section: 'earnings'},
  { id: 'points', label: 'Điểm của tôi', iconKey: 'Star', section: 'earnings' },
  {id: 'withdraw', label: 'Rút tiền', iconKey: 'Banknote', section: 'earnings'},
];

const MOCK_REFERRAL_ITEMS: EarningsMenuItem[] = [
  {id: 'invite', label: 'Mời bạn bè', iconKey: 'UserPlus', section: 'referral'},
  { id: 'share', label: 'Chia sẻ', iconKey: 'Share2', section: 'referral' },
];

export function useEarningsViewModel() {
  const [earningsItems] = useState<EarningsMenuItem[]>(MOCK_EARNINGS_ITEMS);
  const [referralItems] = useState<EarningsMenuItem[]>(MOCK_REFERRAL_ITEMS);
  const [walletOverview, setWalletOverview] = useState<WalletOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWalletOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await repository.getWalletOverview();
      setWalletOverview(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWalletOverview();
  }, [loadWalletOverview]);

  return {
    earningsItems,
    referralItems,
    walletOverview,
    isLoading,
    error,
    reload: loadWalletOverview,
  };
}
