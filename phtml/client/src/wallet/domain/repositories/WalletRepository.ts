// English description: Declares wallet repository operations used by wallet view-models.

import type {
  WalletMutationResult,
  WalletOverview,
  WalletReceiveQr,
  WalletRecipient,
  WalletSendDraft,
  WalletTopupDraft,
} from "../types/wallet.types"

export interface WalletRepository {
  getOverview(): Promise<WalletOverview>
  searchRecipients(query: string): Promise<WalletRecipient[]>
  getReceiveQr(amount?: number | null): Promise<WalletReceiveQr>
  sendMoney(input: WalletSendDraft): Promise<WalletMutationResult>
  createTopup(input: WalletTopupDraft): Promise<WalletMutationResult>
  checkSepayTopup(orderCode: string): Promise<WalletMutationResult>
}
