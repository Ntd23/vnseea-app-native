// English description: Connects the withdrawal context to the Nuxt withdrawal API bridge.

import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import { withdrawalApiRoutes } from "../../application/constants/withdrawal-api-routes"
import type { WithdrawalRepository } from "../../domain/repositories/WithdrawalRepository"
import type {
  WithdrawalMutationResult,
  WithdrawalOverview,
  WithdrawalRequestDraft,
} from "../../domain/types/withdrawal.types"

export function createApiWithdrawalRepository(): WithdrawalRepository {
  const client = useNuxtApiClient()

  return {
    async getOverview() {
      return await client.get<WithdrawalOverview>(withdrawalApiRoutes.overview)
    },
    async requestWithdrawal(input: WithdrawalRequestDraft) {
      return await client.post<WithdrawalMutationResult, WithdrawalRequestDraft>(
        withdrawalApiRoutes.request,
        input,
      )
    },
  }
}
