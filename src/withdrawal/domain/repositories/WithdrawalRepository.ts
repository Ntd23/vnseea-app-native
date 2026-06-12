// Description: Declares repository operations for withdrawal overview and payout requests.

import type {
  WithdrawalOverview,
  WithdrawalRequestInput,
} from '../types/withdrawal.types';

export interface WithdrawalRepository {
  getOverview(): Promise<WithdrawalOverview>;
  requestWithdrawal(input: WithdrawalRequestInput): Promise<string>;
}
