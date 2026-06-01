// English description: Repository contract for loading and mutating backend-backed funding campaigns.

import type {
  FundingCatalog,
  FundingCatalogQuery,
  FundingCreateInput,
  FundingDetail,
  FundingUpdateInput,
} from "../types/funding.types"

export interface FundingRepository {
  getCatalog(query: FundingCatalogQuery): Promise<FundingCatalog>
  getCampaign(id: string): Promise<FundingDetail>
  createCampaign(input: FundingCreateInput): Promise<void>
  updateCampaign(id: number, input: FundingUpdateInput): Promise<void>
  donate(payload: { id: number; amount: number }): Promise<void>
  deleteCampaign(id: number): Promise<void>
}
