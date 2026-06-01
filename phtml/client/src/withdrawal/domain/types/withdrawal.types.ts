// English description: Domain types for backend-backed wallet withdrawal screens.

export type WithdrawalStatus = "pending" | "approved" | "declined"

export interface WithdrawalCurrencyRule {
  decimals?: number
  decimal_sep?: string
  thousand_sep?: string
}

export interface WithdrawalMethod {
  value: string
  label: string
}

export interface WithdrawalHistoryItem {
  id: number
  amount: number
  method: string
  requested: string
  requestedAt: number
  status: WithdrawalStatus
  transferInfo: string
}

export interface WithdrawalOverview {
  balance: number
  walletBalance: number
  minimumAmount: number
  currency: string
  currencySymbol: string
  currencyRule: WithdrawalCurrencyRule
  methods: WithdrawalMethod[]
  history: WithdrawalHistoryItem[]
  bankEnabled: boolean
  paypalEmail: string
  hasPendingRequest: boolean
}

export interface WithdrawalRequestDraft {
  method: string
  amount: number
  paypalEmail?: string
  iban?: string
  country?: string
  fullName?: string
  swiftCode?: string
  address?: string
  transferTo?: string
}

export interface WithdrawalMutationResult {
  success: boolean
  message: string
}
