// English description: Maps backend PHP funding API records into the funding bounded-context catalog shape.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import type { FundingCampaign, FundingCatalog, FundingDonation, FundingTabKey } from "../../../src/funding/domain/types/funding.types"

type BackendEntity = Record<string, unknown>

type BackendFundingResponse = {
  api_status?: number | string
  can_create?: boolean
  currency?: string
  currency_symbol?: string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

type BackendMutationResponse = {
  api_status?: number | string
  message?: string
  errors?: {
    error_text?: string
  }
}

type BackendFundingDetailResponse = {
  api_status?: number | string
  can_create?: boolean
  currency?: string
  currency_symbol?: string
  data?: BackendEntity
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const asBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true"

const formatBackendDate = (value: unknown) => {
  const timestamp = asNumber(value)
  if (!timestamp) return ""
  return new Date(timestamp * 1000).toISOString()
}

const mapDonation = (
  item: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
): FundingDonation => {
  const user = (item.user_data ?? {}) as BackendEntity
  const userId = asNumber(item.user_id) || asNumber(user.user_id) || asNumber(user.id)

  return {
    id: asNumber(item.id),
    userId,
    supporterName: asString(user.name || user.username) || `#${userId}`,
    supporterAvatarUrl: resolveMediaUrl(user.avatar),
    amount: asNumber(item.amount),
    donatedAt: formatBackendDate(item.time),
  }
}

const mapFundingCampaign = (
  item: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
  currentUserId = 0,
  forceManage = false,
): FundingCampaign => {
  const user = (item.user_data ?? {}) as BackendEntity
  const id = asNumber(item.id)
  const progress = asNumber(item.bar)
  const ownerId = asNumber(item.user_id) || asNumber(user.user_id) || asNumber(user.id)
  const canManage = forceManage || (currentUserId > 0 && ownerId === currentUserId)
  const amount = asNumber(item.amount)
  const raised = asNumber(item.raised)
  const isCompleted = amount > 0 && raised >= amount
  const donations = Array.isArray(item.recent_donations)
    ? item.recent_donations.map(donation => mapDonation(donation as BackendEntity, resolveMediaUrl))
    : []

  return {
    id,
    hashedId: asString(item.hashed_id) || String(id),
    title: asString(item.title),
    description: asString(item.description).replace(/<br\s*\/?>/gi, "\n"),
    ownerId,
    imageUrl: resolveMediaUrl(item.image),
    ownerName: asString(user.name || user.username),
    ownerAvatarUrl: resolveMediaUrl(user.avatar),
    ownerUrl: asString(user.url),
    createdAt: formatBackendDate(item.time),
    amount,
    raised,
    progress: Math.max(0, Math.min(100, progress)),
    donorCount: asNumber(item.all_donation) || donations.length,
    donated: asBoolean(item.is_donate),
    canDonate: currentUserId > 0 && ownerId !== currentUserId && !isCompleted,
    canManage,
    isCompleted,
    donations,
    detailUrl: `/show_fund/${asString(item.hashed_id) || id}`,
    editUrl: `/edit_fund/${asString(item.hashed_id) || id}`,
  }
}

export async function fetchFundingCatalog(
  event: H3Event,
  query: { tab?: FundingTabKey; offset?: number | null; limit?: number },
): Promise<FundingCatalog> {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const currentUser = await getBackendCurrentUser(event).catch(() => null)
  const currentUserId = asNumber(currentUser?.user_id)
  const type = query.tab === "mine" ? "user_funding" : "funding"
  const limit = query.limit && query.limit > 0 ? query.limit : 9
  const response = await client.post<BackendFundingResponse>("funding", {
    type,
    limit,
    offset: query.offset || 0,
  })

  const data = assertBackendApiSuccess(response, "Unable to load funding campaigns.")
  const items = (data.data ?? []).map(item =>
    mapFundingCampaign(item, resolveMediaUrl, currentUserId, query.tab === "mine"),
  )

  return {
    items,
    canCreate: Boolean(data.can_create),
    currency: asString(data.currency),
    currencySymbol: asString(data.currency_symbol),
    hasMore: items.length >= limit,
    nextOffset: items.length ? items[items.length - 1]!.id : null,
  }
}

export async function fetchFundingDetail(event: H3Event, id: string) {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const currentUser = await getBackendCurrentUser(event).catch(() => null)
  const currentUserId = asNumber(currentUser?.user_id)
  const response = await client.post<BackendFundingDetailResponse>("funding", {
    type: "get_by_id",
    fund_id: id,
  })
  const data = assertBackendApiSuccess(response, "Unable to load funding campaign.")

  if (!data.data || Array.isArray(data.data)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Funding campaign not found.",
    })
  }

  return {
    campaign: mapFundingCampaign(data.data, resolveMediaUrl, currentUserId),
    canCreate: Boolean(data.can_create),
    currency: asString(data.currency),
    currencySymbol: asString(data.currency_symbol),
  }
}

export async function donateFundingCampaign(
  event: H3Event,
  body: { id?: number; amount?: number },
) {
  if (!body.id || !body.amount || body.amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Funding id and amount are required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendMutationResponse>("funding", {
    type: "pay",
    id: body.id,
    amount: body.amount,
  })

  assertBackendApiSuccess(response, "Unable to donate to funding campaign.")

  return { ok: true }
}

export async function updateFundingCampaign(
  event: H3Event,
  body: { id?: number; title?: string; description?: string; amount?: number },
) {
  if (!body.id || !body.title || !body.description || !body.amount || body.amount <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Funding id, title, description, and amount are required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendMutationResponse>("funding", {
    type: "edit",
    id: body.id,
    title: body.title,
    description: body.description,
    amount: body.amount,
  })

  assertBackendApiSuccess(response, "Unable to update funding campaign.")

  return { ok: true }
}

export async function deleteFundingCampaign(event: H3Event, body: { id?: number }) {
  if (!body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Funding id is required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendMutationResponse>("funding", {
    type: "delete",
    id: body.id,
  })

  assertBackendApiSuccess(response, "Unable to delete funding campaign.")

  return { ok: true }
}
