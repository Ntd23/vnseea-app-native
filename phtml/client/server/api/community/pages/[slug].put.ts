// English description: Updates an existing community page in the PHP backend and returns the refreshed record.

import { getHeader, getRouterParam, readBody, readMultipartFormData } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../../utils/backend-current-user"
import { mapCommunityPageRecord, resolvePageRecordBySlug } from "../_shared"

type BackendPageDetailResponse = {
  api_status?: number | string
  page_data?: Record<string, unknown>
  errors?: {
    error_text?: string
  }
}

const normalizeExternalUrl = (value: unknown) => {
  const url = String(value || "").trim()

  if (!url) {
    return ""
  }

  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const isValidExternalUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  }
  catch {
    return false
  }
}

const appendOptionalUrl = (formData: FormData, key: string, value: unknown) => {
  const normalized = normalizeExternalUrl(value)

  if (!normalized || isValidExternalUrl(normalized)) {
    formData.append(key, normalized)
  }
}

const numberText = (value: unknown) => {
  const normalized = Number(value)

  return Number.isFinite(normalized) ? String(normalized) : ""
}

const mapPageCtaInputToBackendId = (value: unknown) => {
  const input = String(value || "").trim().toLowerCase()

  if (!input) return ""
  if (/^\d+$/.test(input)) return input

  // Technical values and common synonyms (including Vietnamese labels)
  if (input === "catalog" || input.includes("shop") || input.includes("product") || input.includes("sản phẩm") || input.includes("mua sắm") || input.includes("cửa hàng")) return "2"
  if (input === "message" || input.includes("message") || input.includes("quote") || input.includes("chat") || input.includes("nhắn tin") || input.includes("gửi tin nhắn") || input.includes("messenger")) return "11"
  if (input === "call" || input.includes("call") || input.includes("phone") || input.includes("gọi") || input.includes("điện thoại")) return "16"
  if (input === "booking" || input.includes("book") || input.includes("schedule") || input.includes("đặt lịch") || input.includes("đặt chỗ")) return "5"
  if (input === "follow" || input.includes("follow") || input.includes("read more") || input.includes("theo dõi")) return "1"
  if (input === "view" || input.includes("view") || input.includes("learn") || input.includes("xem ngay") || input.includes("tìm hiểu")) return "3"

  return ""
}

const mapPageCategoryToBackendId = (value: unknown) => {
  const input = String(value || "").trim().toLowerCase()

  if (!input) return "2" // Default to Local Business
  if (/^\d+$/.test(input)) return input

  if (input === "local-business") return "2"
  if (input === "creator") return "5"
  if (input === "brand") return "4"
  if (input === "education") return "13"
  if (input === "organization") return "3"
  if (input === "service") return "12"

  return "2"
}

const getUploadMimeType = (file: { type?: string, filename?: string }) => {
  if (file.type) return file.type

  const extension = String(file.filename || "").split(".").pop()?.toLowerCase()
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "gif":
      return "image/gif"
    case "webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const client = createBackendApiClient(event)
  const page = await resolvePageRecordBySlug(event, slug)

  const contentType = getHeader(event, "content-type")
  let body: any = {}
  const files: any = {}

  if (contentType?.includes("multipart/form-data")) {
    const formData = await readMultipartFormData(event)
    if (formData) {
      formData.forEach((item) => {
        if (item.name) {
          if (item.filename) {
            files[item.name] = item
          }
          else {
            body[item.name] = item.data.toString()
          }
        }
      })
    }
  }

  console.log(`[API Bridge] Updating page: ${slug}`, { 
    body, 
    files: Object.keys(files).map(k => ({ name: k, size: files[k].data?.length, type: files[k].type })) 
  })

  const formData = new FormData()
  formData.append("page_id", String(page.id))
  formData.append("page_name", String(body.slug || page.slug).trim())
  formData.append("page_title", String(body.name || page.name).trim())
  formData.append("page_description", String(body.summary || page.summary).trim())
  formData.append("page_category", mapPageCategoryToBackendId(body.category || page.category))
  formData.append("address", String(body.locationLabel || body.location?.address || "").trim())
  if (numberText(body.lat || body.location?.lat)) {
    formData.append("lat", numberText(body.lat || body.location?.lat))
  }
  if (numberText(body.lng || body.location?.lng)) {
    formData.append("lng", numberText(body.lng || body.location?.lng))
  }
  if (String(body.placeId || body.place_id || body.location?.placeId || "").trim()) {
    formData.append("page_place_id", String(body.placeId || body.place_id || body.location?.placeId || "").trim())
  }
  formData.append("company", String(body.ownerLabel || "").trim())
  appendOptionalUrl(formData, "website", body.website)
  formData.append("call_action_type", mapPageCtaInputToBackendId(body.ctaLabel) || "0")

  const ctaUrl = normalizeExternalUrl(body.responseLabel)
  if (ctaUrl && isValidExternalUrl(ctaUrl)) {
    formData.append("call_action_type_url", ctaUrl)
  }
  
  // Settings / Toggles
  if (body.allowMessages !== undefined) formData.append("users_post", body.allowMessages === "1" || body.allowMessages === true ? "1" : "0")

  for (const key of ["facebook", "twitter", "instgram", "linkedin", "youtube", "vk"]) {
    const value = String(body[key] || "").trim()
    if (value) {
      formData.append(key, value)
    }
  }

  if (files.avatar) {
    // Using a Blob with type and filename ensures the multipart part has Content-Type and filename
    const avatarBlob = new Blob([files.avatar.data], { type: getUploadMimeType(files.avatar) })
    formData.append("avatar", avatarBlob, files.avatar.filename || "avatar.jpg")
  }
  if (files.banner) {
    const bannerBlob = new Blob([files.banner.data], { type: getUploadMimeType(files.banner) })
    formData.append("cover", bannerBlob, files.banner.filename || "cover.jpg")
  }

  const updateResponse = await client.post<any>("update-page-data", formData)
  console.log("[API Bridge] Update response:", updateResponse)
  
  assertBackendApiSuccess(
    updateResponse,
    "Unable to update page.",
  )

  try {
    const currentUser = await getBackendCurrentUser(event)
    const detailResponse = assertBackendApiSuccess(
      await client.post<BackendPageDetailResponse, Record<string, unknown>>(
        "get-page-data",
        { page_id: page.id },
      ),
      "Unable to load updated page.",
    )

    if (detailResponse.page_data) {
      return mapCommunityPageRecord(detailResponse.page_data, {
        currentUserId: Number(currentUser.user_id ?? 0),
      })
    }

    return await resolvePageRecordBySlug(event, String(body.slug || slug))
  } catch (error) {
    // If resolve fails after a successful backend save, return the updated local record as fallback
    // to avoid a misleading "save failed" error in the UI.
    return {
      ...page,
      name: String(body.name || page.name).trim(),
      slug: String(body.slug || page.slug).trim(),
      summary: String(body.summary || page.summary).trim(),
      category: String(body.category || page.category).trim(),
    }
  }
})

