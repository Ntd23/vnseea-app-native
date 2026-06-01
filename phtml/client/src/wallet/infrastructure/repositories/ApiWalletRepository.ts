// English description: Connects the wallet context to the Nuxt wallet API bridge.

import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import { walletApiRoutes } from "../../application/constants/wallet-api-routes"
import type { WalletRepository } from "../../domain/repositories/WalletRepository"
import type {
  WalletMutationResult,
  WalletOverview,
  WalletReceiveQr,
  WalletRecipient,
  WalletSendDraft,
  WalletTopupDraft,
} from "../../domain/types/wallet.types"

export function createApiWalletRepository(): WalletRepository {
  const client = useNuxtApiClient()

  return {
    async getOverview() {
      return await client.get<WalletOverview>(walletApiRoutes.overview)
    },
    async searchRecipients(query: string) {
      return await client.get<WalletRecipient[]>(walletApiRoutes.recipientSearch, { q: query })
    },
    async getReceiveQr(amount?: number | null) {
      return await client.get<WalletReceiveQr>(walletApiRoutes.receiveQr, {
        amount: amount && amount > 0 ? amount : undefined,
      })
    },
    async sendMoney(input: WalletSendDraft) {
      return await client.post<WalletMutationResult, WalletSendDraft>(walletApiRoutes.send, input)
    },
    async createTopup(input: WalletTopupDraft) {
      if (input.method === "sepay") {
        return await client.post<WalletMutationResult, WalletTopupDraft>(walletApiRoutes.sepayQr, input)
      }

      const methodIsUpload = Boolean(input.receiptFile)

      if (methodIsUpload) {
        const formData = new FormData()
        formData.append("amount", String(input.amount))
        formData.append("method", input.method)

        if (input.receiptFile) {
          formData.append("thumbnail", input.receiptFile, input.receiptFile.name)
        }

        return await client.post<WalletMutationResult, FormData>(walletApiRoutes.bankTransfer, formData)
      }

      return await client.get<WalletMutationResult>(walletApiRoutes.topupLink, {
        amount: input.amount,
        method: input.method,
      })
    },
    async checkSepayTopup(orderCode: string) {
      return await client.get<WalletMutationResult>(walletApiRoutes.sepayCheck, { orderCode })
    },
  }
}
