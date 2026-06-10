// Funding Repository Interface
// Port từ: client/src/funding/domain/repositories/

import type {
  CreateFundingInput,
  EditFundingInput,
  FundingDonation,
  FundingItem,
  FundingMutationResponse,
} from '../types/funding.types';

export interface FundingRepository {
  getFundingList(options?: {
    limit?: number;
    offset?: number;
  }): Promise<FundingItem[]>;
  getUserFunding(
    userId: number,
    options?: { limit?: number; offset?: number },
  ): Promise<FundingItem[]>;
  getFundingById(fundId: string): Promise<FundingItem | null>;
  getRecentDonations(
    fundId: number,
    options?: { limit?: number; offset?: number },
  ): Promise<FundingDonation[]>;
  createFunding(input: CreateFundingInput): Promise<FundingMutationResponse>;
  editFunding(input: EditFundingInput): Promise<FundingMutationResponse>;
  deleteFunding(id: number): Promise<FundingMutationResponse>;
  donate(fundId: number, amount: number): Promise<FundingMutationResponse>;
}
