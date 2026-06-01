import { getHeader, getRouterParam, readBody, readMultipartFormData } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { resolveGroupRecordBySlug } from "../_shared"

type UpdateGroupBody = {
  name?: string
  slug?: string
  summary?: string
  website?: string
  address?: string
  locationLabel?: string
  privacy?: "public" | "private" | "secret"
  category?: string
  joinApproval?: string | boolean
  postApproval?: string | boolean
  allowMemberInvites?: string | boolean
  showMemberDirectory?: string | boolean
  welcomePostEnabled?: string | boolean
  tags?: string
  guidelines?: string
}

type BackendUpdateGroupResponse = {
  api_status?: number | string
  message?: string
  errors?: {
    error_text?: string
  }
}

const toBackendPrivacy = (value: UpdateGroupBody["privacy"]) =>
  value === "private" || value === "secret" ? 2 : 1

const toBackendBoolean = (value: unknown) => {
  if (value === true || value === "true" || value === "on" || value === "1") return 1
  return 0
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const contentType = getHeader(event, "content-type") || ""
  const client = createBackendApiClient(event)
  const group = await resolveGroupRecordBySlug(event, slug)

  let body: UpdateGroupBody = {}
  let avatarFile: { data: Buffer; filename?: string; type?: string } | null = null
  let bannerFile: { data: Buffer; filename?: string; type?: string } | null = null

  if (contentType.includes("multipart/form-data")) {
    const parts = await readMultipartFormData(event)
    if (parts) {
      for (const part of parts) {
        if (part.name === "avatar") {
          avatarFile = { data: part.data, filename: part.filename, type: part.type }
        }
        else if (part.name === "banner") {
          bannerFile = { data: part.data, filename: part.filename, type: part.type }
        }
        else if (part.name) {
          body[part.name as keyof UpdateGroupBody] = part.data.toString() as any
        }
      }
    }
  }
  else {
    body = await readBody<UpdateGroupBody>(event)
  }

  const toBackendPrivacyValue = (value: unknown) => {
    if (value === "2" || value === 2 || value === "private") return 2
    if (value === "3" || value === 3 || value === "secret") return 3
    return 1
  }

  const toBackendJoinPrivacy = (value: unknown) => {
    if (value === true || value === "true" || value === "1" || value === 1 || value === "on") return 2
    return 1
  }

  const toBackendPostPrivacy = (value: unknown) => {
    if (value === true || value === "true" || value === "1" || value === 1 || value === "on") return 1
    return 0
  }

  const payload: any = {
    group_id: group.id,
    group_name: String(body.slug || group.slug).trim(),
    group_title: String(body.name || group.name).trim(),
    about: String(body.summary || group.summary).trim(),
    category: String(body.category || group.category).trim(),
    privacy: toBackendPrivacyValue(body.privacy || group.privacy),
    join_privacy: toBackendJoinPrivacy(body.joinApproval ?? (group as any).joinApproval),
  }

  // Use FormData for backend request if files are present
  if (avatarFile || bannerFile) {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    if (avatarFile) {
      formData.append("avatar", new Blob([avatarFile.data], { type: avatarFile.type || "image/jpeg" }), avatarFile.filename || "avatar.jpg")
    }
    if (bannerFile) {
      formData.append("cover", new Blob([bannerFile.data], { type: bannerFile.type || "image/jpeg" }), bannerFile.filename || "cover.jpg")
    }

    assertBackendApiSuccess(
      await client.post<BackendUpdateGroupResponse>("update-group-data", formData),
      "Unable to update group.",
    )
  }
  else {
    assertBackendApiSuccess(
      await client.post<BackendUpdateGroupResponse>("update-group-data", payload),
      "Unable to update group.",
    )
  }

  return await resolveGroupRecordBySlug(event, String(body.slug || slug))
})
