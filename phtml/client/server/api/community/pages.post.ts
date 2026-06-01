// English description: Creates a new community page through the PHP phtml-compatible web handler.

import { createError, readBody } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { mapCommunityPageRecord } from "./_shared"

type CreatePageBody = {
  name?: string
  slug?: string
  description?: string
  category?: string
  location?: {
    address?: string
    lat?: number | string | null
    lng?: number | string | null
    placeId?: string
  }
}

type BackendCreatePageWebResponse = {
  status?: number | string
  message?: string
  errors?: string[] | Record<string, string> | string
  location?: string
  page_id?: number | string
}

type BackendPageDetailResponse = {
  api_status?: number | string
  page_data?: Record<string, unknown>
  errors?: {
    error_text?: string
  }
}

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()

const normalizeBackendError = (errors: BackendCreatePageWebResponse["errors"]) => {
  if (!errors) return ""
  if (typeof errors === "string") return stripHtml(errors)
  if (Array.isArray(errors)) return stripHtml(errors.join(" "))

  return stripHtml(Object.values(errors).join(" "))
}

const text = (value: unknown) =>
  value === undefined || value === null ? "" : String(value).trim()

const numberText = (value: unknown) => {
  const normalized = Number(value)

  return Number.isFinite(normalized) ? String(normalized) : ""
}

const mapPageCategoryToBackendId = (value: unknown) => {
  const input = text(value).toLowerCase()

  if (!input) return "2"
  if (/^\d+$/.test(input)) return input

  if (input === "local-business") return "2"
  if (input === "creator") return "5"
  if (input === "brand") return "4"
  if (input === "education") return "13"
  if (input === "organization") return "3"
  if (input === "service") return "12"

  return "2"
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreatePageBody>(event)
  const currentUser = await getBackendCurrentUser(event)
  const slug = text(body.slug)
  const address = text(body.location?.address)
  const lat = numberText(body.location?.lat)
  const lng = numberText(body.location?.lng)

  if (!address || !lat || !lng) {
    throw createError({
      statusCode: 422,
      statusMessage: "A Google address with coordinates is required.",
    })
  }

  const webClient = createBackendWebClient(event)
  const response = await webClient.postForm<BackendCreatePageWebResponse>(
    "pages",
    {
      page_name: slug,
      page_title: text(body.name),
      page_category: mapPageCategoryToBackendId(body.category),
      page_description: text(body.description),
      address,
      page_lat: lat,
      page_lng: lng,
      page_place_id: text(body.location?.placeId),
      hash_id: text(currentUser.session_hash),
    },
    { s: "create_page" },
  )

  const backendError = normalizeBackendError(response.errors)
  const backendStatus = Number(response.status ?? 0)

  if (backendError || backendStatus !== 200) {
    throw createError({
      statusCode: backendStatus >= 400 ? backendStatus : 400,
      statusMessage: backendError || stripHtml(response.message || "Unable to create page."),
      data: response,
    })
  }

  const apiClient = createBackendApiClient(event)
  const detailResponse = assertBackendApiSuccess(
    await apiClient.post<BackendPageDetailResponse, Record<string, unknown>>(
      "get-page-data",
      { page_name: slug },
    ),
    "Unable to load created page.",
  )

  return mapCommunityPageRecord(detailResponse.page_data ?? {}, {
    currentUserId: Number(currentUser.user_id ?? 0),
  })
})
