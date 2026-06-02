// Wallet Repository Interface

import type { WalletOverview } from '../types/wallet.types';

export interface WalletRepository {
  getWalletOverview(): Promise<WalletOverview>;
}
