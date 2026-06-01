// English description: Maps backend wallet API responses into the wallet bounded context and proxies wallet mutations.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient, getBackendBaseCandidates } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver, getBackendWebBaseUrl } from "../../utils/backend-media-url"
import type {
  WalletCurrentUser,
  WalletMutationResult,
  WalletOverview,
  WalletReceiveQr,
  WalletRecipient,
  WalletSendDraft,
  WalletTopupDraft,
  WalletTopupMethod,
  WalletTransaction,
  WalletTransactionTone,
} from "../../../src/wallet/domain/types/wallet.types"

type BackendEntity = Record<string, unknown>

type BackendWalletOverviewResponse = {
  api_status?: number | string
  balance?: number | string
  withdrawable_balance?: number | string
  currency?: string
  currency_symbol?: string
  currency_rule?: BackendEntity
  transactions?: BackendEntity[]
  topup_methods?: BackendEntity[]
  can_withdraw?: boolean
  current_user?: BackendEntity
  errors?: {
    error_text?: string
  }
}

type BackendRecipientSearchResponse = {
  api_status?: number | string
  items?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendWebMutationResponse = {
  status?: number | string
  api_status?: number | string
  type?: string
  message?: string
  error?: string
  details?: string
  errors?: string[] | {
    error_text?: string
  }
  url?: string
  payment_id?: number | string
  order_code?: string
  amount?: number | string
  bank_code?: string
  account_number?: string
  account_name?: string
  qr_url?: string
  paid?: boolean | number | string
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const asBoolean = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true" || value === "yes"

const asEntity = (value: unknown): BackendEntity =>
  value && typeof value === "object" && !Array.isArray(value) ? value as BackendEntity : {}

const transactionTone = (kind: string): WalletTransactionTone => {
  if (["WALLET", "RECEIVED", "SALE", "SALES"].includes(kind)) return "success"
  if (kind === "PRO") return "warning"
  if (kind === "SENT") return "info"
  if (kind === "PURCHASE") return "danger"
  return "neutral"
}

const normalizeWebMutationResponse = (response: BackendWebMutationResponse | string | false | null | undefined) => {
  if (typeof response !== "string") {
    return response
  }

  try {
    return JSON.parse(response) as BackendWebMutationResponse
  }
  catch {
    return response
  }
}

const webErrorMessage = (response: BackendWebMutationResponse | string | false | null | undefined, fallback: string) => {
  const normalized = normalizeWebMutationResponse(response)

  if (!normalized || typeof normalized !== "object") {
    return fallback
  }

  if (Array.isArray(normalized.errors)) {
    return normalized.errors.join("\n")
  }

  if (normalized.errors && typeof normalized.errors === "object") {
    return asString(normalized.errors.error_text) || fallback
  }

  return asString(normalized.error || normalized.message || normalized.details) || fallback
}

const assertWebSuccess = (response: BackendWebMutationResponse | string | false | null | undefined, fallback: string) => {
  const normalized = normalizeWebMutationResponse(response)

  if (!normalized || typeof normalized !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: fallback,
      data: normalized,
    })
  }

  const status = Number(normalized.status ?? normalized.api_status ?? 0)

  if (status >= 200 && status < 300) {
    return normalized
  }

  throw createError({
    statusCode: 400,
    statusMessage: webErrorMessage(normalized, fallback),
    data: normalized,
  })
}

const mapTransaction = (item: BackendEntity): WalletTransaction => {
  const kind = asString(item.kind)
  const extra = asEntity(item.extra)

  return {
    id: asNumber(item.id),
    kind,
    notes: asString(item.notes),
    counterpartyId: asNumber(item.counterparty_id ?? extra.sender_id ?? extra.recipient_id),
    counterpartyName: asString(item.counterparty_name),
    amount: asNumber(item.amount),
    points: asNumber(item.points ?? extra.points),
    pointAction: asString(item.point_action ?? extra.action),
    pointType: asString(item.point_type ?? extra.type),
    transactionDate: asString(item.transaction_dt),
    statusTone: transactionTone(kind),
  }
}

const mapTopupMethod = (item: BackendEntity): WalletTopupMethod => ({
  value: asString(item.value),
  label: asString(item.label),
  type: asString(item.type) === "upload"
    ? "upload"
    : asString(item.type) === "qr" ? "qr" : "redirect",
  note: asString(item.note),
})

const mapCurrentUser = (
  item: BackendEntity | undefined,
  resolveMediaUrl: (value: unknown) => string,
): WalletCurrentUser => ({
  id: asNumber(item?.id),
  name: asString(item?.name),
  username: asString(item?.username),
  avatarUrl: resolveMediaUrl(asString(item?.avatar)),
})

const mapRecipient = (
  item: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
): WalletRecipient => ({
  id: asNumber(item.id),
  name: asString(item.name),
  username: asString(item.username),
  avatarUrl: resolveMediaUrl(asString(item.avatar)),
})

const getBackendWebBase = (event: H3Event) => getBackendWebBaseUrl(event)

export async function fetchWalletOverview(event: H3Event): Promise<WalletOverview> {
  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).get<BackendWalletOverviewResponse>("wallet-overview"),
    "Unable to load wallet.",
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return {
    balance: asNumber(response.balance),
    withdrawableBalance: asNumber(response.withdrawable_balance),
    currency: asString(response.currency),
    currencySymbol: asString(response.currency_symbol),
    currencyRule: response.currency_rule ?? {},
    transactions: (response.transactions ?? []).map(mapTransaction),
    topupMethods: (response.topup_methods ?? [])
      .map(mapTopupMethod)
      .filter(method => method.value && method.label),
    canWithdraw: asBoolean(response.can_withdraw),
    withdrawalUrl: "/withdrawal",
    currentUser: mapCurrentUser(response.current_user, resolveMediaUrl),
  }
}

export async function searchWalletRecipients(event: H3Event, query: string): Promise<WalletRecipient[]> {
  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).get<BackendRecipientSearchResponse>(
      "wallet-recipient-search",
      { q: query },
    ),
    "Unable to search recipients.",
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return (response.items ?? []).map(item => mapRecipient(item, resolveMediaUrl))
}

export async function getWalletReceiveQr(event: H3Event, amount: number | null): Promise<WalletReceiveQr> {
  const currentUser = await getBackendCurrentUser(event)
  const baseUrl = getBackendBaseCandidates(getBackendWebBase(event))[0] ?? getBackendWebBase(event)
  const params = new URLSearchParams({
    f: "qrcode",
    s: "wallet-qr-code",
    to: String(currentUser.user_id ?? ""),
  })

  if (amount && amount > 0) {
    params.set("amount", String(amount))
  }

  return {
    imageUrl: `${baseUrl.replace(/\/+$/, "")}/requests.php?${params.toString()}`,
    amount,
  }
}

export async function sendWalletMoney(
  event: H3Event,
  input: WalletSendDraft,
): Promise<WalletMutationResult> {
  const response = assertWebSuccess(
    await createBackendWebClient(event).postForm<BackendWebMutationResponse>(
      "wallet",
      {
        user_id: input.recipientUserId,
        amount: input.amount,
        note: input.note,
      },
      { s: "send" },
    ),
    "Unable to send money.",
  )

  return {
    success: true,
    message: asString(response.message),
  }
}

export async function createWalletTopupLink(
  event: H3Event,
  input: WalletTopupDraft,
): Promise<WalletMutationResult> {
  const response = assertWebSuccess(
    await createBackendWebClient(event).postForm<BackendWebMutationResponse>(
      "wallet",
      undefined,
      {
        s: "replenish-user-account",
        amount: input.amount,
        desc: "replenish_my_balance",
      },
    ),
    "Unable to start wallet top-up.",
  )
  const redirectUrl = asString(response.url)

  if (!redirectUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: webErrorMessage(response, "PayPal did not return an approval URL."),
      data: response,
    })
  }

  return {
    success: true,
    message: asString(response.message),
    redirectUrl,
  }
}

export async function uploadWalletBankTransfer(
  event: H3Event,
  input: WalletTopupDraft,
): Promise<WalletMutationResult> {
  const currentUser = await getBackendCurrentUser(event)
  const hash = asString(currentUser.session_hash)
  const formData = new FormData()

  formData.append("price", String(input.amount))
  formData.append("description", "Add to balance")
  formData.append("type", "wallet")

  if (hash) {
    formData.append("hash_id", hash)
  }

  if (input.receiptFile) {
    formData.append("thumbnail", input.receiptFile, input.receiptFile.name)
  }

  const response = assertWebSuccess(
    await createBackendWebClient(event).postForm<BackendWebMutationResponse, FormData>(
      "bank_transfer_wallet",
      formData,
    ),
    "Unable to upload bank transfer receipt.",
  )

  return {
    success: true,
    message: asString(response.message),
  }
}

export async function createWalletSepayQr(
  event: H3Event,
  input: WalletTopupDraft,
): Promise<WalletMutationResult> {
  const currentUser = await getBackendCurrentUser(event)
  const response = assertWebSuccess(
    await createBackendWebClient(event).postForm<BackendWebMutationResponse>(
      "sepay",
      {
        amount: input.amount,
        hash_id: asString(currentUser.session_hash),
      },
      { s: "make_qr" },
    ),
    "Unable to create SePay QR.",
  )

  return {
    success: true,
    message: asString(response.message),
    paymentId: asNumber(response.payment_id),
    amount: asNumber(response.amount),
    orderCode: asString(response.order_code),
    bankCode: asString(response.bank_code),
    accountNumber: asString(response.account_number),
    accountName: asString(response.account_name),
    qrUrl: asString(response.qr_url),
    status: asString(response.status),
  }
}

export async function checkWalletSepayTopup(
  event: H3Event,
  orderCode: string,
): Promise<WalletMutationResult> {
  const currentUser = await getBackendCurrentUser(event)
  const response = assertWebSuccess(
    await createBackendWebClient(event).postForm<BackendWebMutationResponse>(
      "sepay",
      {
        order_code: orderCode,
        hash_id: asString(currentUser.session_hash),
      },
      { s: "check" },
    ),
    "Unable to check SePay payment.",
  )

  return {
    success: true,
    message: asString(response.message),
    orderCode: asString(response.order_code),
    paid: asBoolean(response.paid),
    status: asString(response.status),
  }
}
