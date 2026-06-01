// English description: Repository contract for withdrawal overview and request submission.

import type {
  WithdrawalMutationResult,
  WithdrawalOverview,
  WithdrawalRequestDraft,
} from "../types/withdrawal.types"

export interface WithdrawalRepository {
  getOverview(): Promise<WithdrawalOverview>
  requestWithdrawal(input: WithdrawalRequestDraft): Promise<WithdrawalMutationResult>
}
