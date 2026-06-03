// Funding API Repository (Infrastructure)
// Port từ: client/src/funding/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { FundingRepository } from '../../domain/repositories/FundingRepository';
import type { FundingItem, FundingDonation, FundingResponse } from '../../domain/types/funding.types';

interface FundingListResponse {
  api_status: number;
  can_create: boolean;
  currency: string;
  currency_symbol: string;
  data: FundingItem[];
}

interface FundingDetailResponse {
  api_status: number;
  currency: string;
  currency_symbol: string;
  data: FundingItem;
}

interface DonationsResponse {
  api_status: number;
  data: FundingDonation[];
}

export function createFundingRepository(): FundingRepository {
  return {
    async getFundingList(options = {}) {
      const { limit = 20, offset = 0 } = options;

      const response = await apiBridge.post<FundingListResponse>(
        apiRoutes.funding.list,
        { type: 'funding', limit, offset },
      );

      return response.data ?? [];
    },

    async getFundingById(fundId: string) {
      const response = await apiBridge.post<FundingDetailResponse>(
        apiRoutes.funding.detail,
        { type: 'get_by_id', fund_id: fundId },
      );

      return response.data ?? null;
    },

    async getRecentDonations(fundId: number, options = {}) {
      const { limit = 10, offset = 0 } = options;

      const response = await apiBridge.post<DonationsResponse>(
        apiRoutes.funding.recentDonations,
        { type: 'get_recent_donations', fund_id: fundId, limit, offset },
      );

      return response.data ?? [];
    },
  };
}
