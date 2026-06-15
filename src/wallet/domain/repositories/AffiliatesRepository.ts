// Description: Defines the repository contract for referral reward data.

import type { AffiliateOverview } from '../types/wallet.types';

export interface AffiliatesRepository {
  getOverview(): Promise<AffiliateOverview>;
}
