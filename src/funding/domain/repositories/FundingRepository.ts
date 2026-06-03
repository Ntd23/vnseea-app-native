// Funding Repository Interface
// Port từ: client/src/funding/domain/repositories/

import type { FundingItem, FundingDonation } from '../types/funding.types';

export interface FundingRepository {
  getFundingList(options?: {
    limit?: number;
    offset?: number;
  }): Promise<FundingItem[]>;
  getFundingById(fundId: string): Promise<FundingItem | null>;
  getRecentDonations(fundId: number, options?: {
    limit?: number;
    offset?: number;
  }): Promise<FundingDonation[]>;
}
