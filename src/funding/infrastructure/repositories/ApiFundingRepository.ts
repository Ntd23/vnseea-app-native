// Funding API Repository (Infrastructure)
// Port từ: client/src/funding/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { FundingRepository } from '../../domain/repositories/FundingRepository';
import type {
  CreateFundingInput,
  EditFundingInput,
  FundingDonation,
  FundingItem,
  FundingMutationResponse,
  FundingListResponse,
  FundingDetailResponse,
  FundingDonationsResponse,
} from '../../domain/types/funding.types';

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

    async getUserFunding(userId, options = {}) {
      const { limit = 20, offset = 0 } = options;

      const response = await apiBridge.post<FundingListResponse>(
        apiRoutes.funding.userFunding,
        { type: 'user_funding', user_id: userId, limit, offset },
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

    async getRecentDonations(fundId, options = {}) {
      const { limit = 10, offset = 0 } = options;

      const response = await apiBridge.post<FundingDonationsResponse>(
        apiRoutes.funding.recentDonations,
        { type: 'get_recent_donations', fund_id: fundId, limit, offset },
      );

      return response.data ?? [];
    },

    async createFunding(input: CreateFundingInput) {
      const response = await apiBridge.multipart<FundingMutationResponse>(
        apiRoutes.funding.list,
        {
          type: 'create',
          title: input.title,
          description: input.description,
          amount: input.amount,
          image: input.image,
        },
      );

      return response;
    },

    async editFunding(input: EditFundingInput) {
      const response = await apiBridge.post<FundingMutationResponse>(
        apiRoutes.funding.list,
        {
          type: 'edit',
          id: input.id,
          title: input.title,
          description: input.description,
          amount: input.amount,
        },
      );

      return response;
    },

    async deleteFunding(id: number) {
      const response = await apiBridge.post<FundingMutationResponse>(
        apiRoutes.funding.list,
        { type: 'delete', id },
      );

      return response;
    },

    async donate(fundId: number, amount: number) {
      const response = await apiBridge.post<FundingMutationResponse>(
        apiRoutes.funding.pay,
        { type: 'pay', id: fundId, amount },
      );

      return response;
    },
  };
}
