// Description: Declares repository operations for withdrawal overview and payout requests.

import type {
  SepayBank,
  WithdrawalOverview,
  WithdrawalRequestInput,
} from '../types/withdrawal.types';

export interface WithdrawalRepository {
  getOverview(): Promise<WithdrawalOverview>;
  getSepayBanks(): Promise<SepayBank[]>;
  requestWithdrawal(input: WithdrawalRequestInput): Promise<string>;
}
