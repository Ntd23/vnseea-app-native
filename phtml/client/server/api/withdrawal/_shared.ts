// English description: Maps backend withdrawal API responses and proxies withdrawal requests.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import type {
  WithdrawalHistoryItem,
  WithdrawalMethod,
  WithdrawalMutationResult,
  WithdrawalOverview,
  WithdrawalRequestDraft,
  WithdrawalStatus,
} from "../../../src/withdrawal/domain/types/withdrawal.types"

type BackendEntity = Record<string, unknown>

type BackendWithdrawalOverviewResponse = {
  api_status?: number | string
  balance?: number | string
  wallet_balance?: number | string
  minimum_amount?: number | string
  currency?: string
  currency_symbol?: string
  currency_rule?: BackendEntity
  methods?: BackendEntity[]
  history?: BackendEntity[]
  bank_enabled?: boolean
  paypal_email?: string
  has_pending_request?: boolean
}

type BackendWebMutationResponse = {
  status?: number | string
  api_status?: number | string
  message?: string
  error?: string
  errors?: string[] | {
    error_text?: string
  }
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

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()

const mapStatus = (status: unknown): WithdrawalStatus => {
  if (status === 1 || status === "1" || status === "approved") return "approved"
  if (status === 2 || status === "2" || status === "declined" || status === "rejected") return "declined"
  return "pending"
}

const webErrorMessage = (response: BackendWebMutationResponse, fallback: string) => {
  if (Array.isArray(response.errors)) {
    return response.errors.map(error => stripHtml(asString(error))).filter(Boolean).join("\n") || fallback
  }

  if (response.errors && typeof response.errors === "object") {
    return stripHtml(asString(response.errors.error_text)) || fallback
  }

  return stripHtml(asString(response.error || response.message)) || fallback
}

const assertWebSuccess = (response: BackendWebMutationResponse, fallback: string) => {
  const status = Number(response.status ?? response.api_status ?? 0)

  if (status >= 200 && status < 300) {
    return response
  }

  throw createError({
    statusCode: 400,
    statusMessage: webErrorMessage(response, fallback),
    data: response,
  })
}

const mapMethod = (item: BackendEntity): WithdrawalMethod => ({
  value: asString(item.value),
  label: asString(item.label),
})

const mapHistoryItem = (item: BackendEntity): WithdrawalHistoryItem => ({
  id: asNumber(item.id),
  amount: asNumber(item.amount),
  method: asString(item.method),
  requested: asString(item.requested),
  requestedAt: asNumber(item.requested_at),
  status: mapStatus(item.status),
  transferInfo: asString(item.transfer_info),
})

export async function fetchWithdrawalOverview(event: H3Event): Promise<WithdrawalOverview> {
  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).get<BackendWithdrawalOverviewResponse>("withdrawal-overview"),
    "Unable to load withdrawal.",
  )

  return {
    balance: asNumber(response.balance),
    walletBalance: asNumber(response.wallet_balance),
    minimumAmount: asNumber(response.minimum_amount),
    currency: asString(response.currency),
    currencySymbol: asString(response.currency_symbol),
    currencyRule: response.currency_rule ?? {},
    methods: (response.methods ?? [])
      .map(mapMethod)
      .filter(method => method.value && method.label),
    history: (response.history ?? []).map(mapHistoryItem),
    bankEnabled: asBoolean(response.bank_enabled),
    paypalEmail: asString(response.paypal_email),
    hasPendingRequest: asBoolean(response.has_pending_request),
  }
}

export async function submitWithdrawalRequest(
  event: H3Event,
  input: WithdrawalRequestDraft,
): Promise<WithdrawalMutationResult> {
  const currentUser = await getBackendCurrentUser(event)
  const body: Record<string, string | number> = {
    withdraw_method: input.method,
    amount: input.amount,
  }

  if (currentUser.session_hash) {
    body.hash_id = currentUser.session_hash
  }

  if (input.method === "paypal") {
    body.paypal_email = input.paypalEmail ?? ""
  }
  else if (input.method === "bank") {
    body.iban = input.iban ?? ""
    body.country = input.country ?? ""
    body.full_name = input.fullName ?? ""
    body.swift_code = input.swiftCode ?? ""
    body.address = input.address ?? ""
  }
  else {
    body.transfer_to = input.transferTo ?? ""
  }

  const response = assertWebSuccess(
    await createBackendWebClient(event).postForm<BackendWebMutationResponse>(
      "request_payment",
      body,
    ),
    "Unable to request withdrawal.",
  )

  return {
    success: true,
    message: stripHtml(asString(response.message)),
  }
}
