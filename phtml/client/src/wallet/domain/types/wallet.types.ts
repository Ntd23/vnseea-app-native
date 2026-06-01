// English description: Defines wallet domain records and mutation payloads for the backend-backed wallet context.

export type WalletCurrencyRule = {
  decimals?: number
  decimal_sep?: string
  thousand_sep?: string
}

export type WalletTopupMethod = {
  value: string
  label: string
  type: "redirect" | "upload" | "qr"
  note?: string
}

export type WalletTransactionTone = "success" | "warning" | "info" | "danger" | "neutral"

export type WalletTransaction = {
  id: number
  kind: string
  notes: string
  counterpartyId: number
  counterpartyName: string
  amount: number
  points?: number
  pointAction?: string
  pointType?: string
  transactionDate: string
  statusTone: WalletTransactionTone
}

export type WalletRecipient = {
  id: number
  name: string
  username: string
  avatarUrl: string
}

export type WalletCurrentUser = {
  id: number
  name: string
  username: string
  avatarUrl: string
}

export type WalletOverview = {
  balance: number
  withdrawableBalance: number
  currency: string
  currencySymbol: string
  currencyRule: WalletCurrencyRule
  transactions: WalletTransaction[]
  topupMethods: WalletTopupMethod[]
  canWithdraw: boolean
  withdrawalUrl: string
  currentUser: WalletCurrentUser
}

export type WalletSendDraft = {
  recipientUserId: number
  amount: number
  note?: string
}

export type WalletTopupDraft = {
  amount: number
  method: string
  receiptFile?: File | null
}

export type WalletMutationResult = {
  success: boolean
  message: string
  balance?: number
  redirectUrl?: string
  paymentId?: number
  amount?: number
  orderCode?: string
  qrUrl?: string
  bankCode?: string
  accountNumber?: string
  accountName?: string
  paid?: boolean
  status?: string
}

export type WalletReceiveQr = {
  imageUrl: string
  amount: number | null
}
