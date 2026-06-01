// English description: Nuxt API implementation of the funding repository contract.

import type { FundingRepository } from "../../domain/repositories/FundingRepository"
import type {
  FundingCatalog,
  FundingCatalogQuery,
  FundingCreateInput,
  FundingDetail,
  FundingUpdateInput,
} from "../../domain/types/funding.types"

export class ApiFundingRepository implements FundingRepository {
  async getCatalog(query: FundingCatalogQuery): Promise<FundingCatalog> {
    return await $fetch<FundingCatalog>("/_api/funding", { query })
  }

  async getCampaign(id: string): Promise<FundingDetail> {
    return await $fetch<FundingDetail>(`/_api/funding/${id}`)
  }

  async createCampaign(input: FundingCreateInput) {
    const form = new FormData()
    form.append("title", input.title)
    form.append("amount", String(input.amount))
    form.append("description", input.description)
    form.append("image", input.image)

    await $fetch("/_api/funding/create", {
      method: "POST",
      body: form,
    })
  }

  async updateCampaign(id: number, input: FundingUpdateInput) {
    await $fetch(`/_api/funding/${id}`, {
      method: "PATCH",
      body: input,
    })
  }

  async donate(payload: { id: number; amount: number }) {
    await $fetch("/_api/funding/donate", {
      method: "POST",
      body: payload,
    })
  }

  async deleteCampaign(id: number) {
    await $fetch(`/_api/funding/${id}`, {
      method: "DELETE",
    })
  }
}

export const createApiFundingRepository = () => new ApiFundingRepository()
