// English description: Bridges Nuxt settings updates to the same PHP requests.php handlers used by phtml settings.

import { createError, deleteCookie, getHeader, readBody, readMultipartFormData, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendWebClient } from "../../utils/backend-web-client"

type SettingsUpdateBody = Record<string, string | number | boolean | null | undefined>
type SettingsFilePart = {
  name?: string
  filename?: string
  type?: string
  data: Buffer
}

type BackendWebSettingsResponse = {
  status?: number | string
  message?: string
  errors?: string[] | Record<string, string> | string
  location?: string
  [key: string]: unknown
}

type SectionConfig = {
  action: string
  fields: string[]
  subAction?: (payload: SettingsUpdateBody) => string | undefined
  transform?: (payload: SettingsUpdateBody) => SettingsUpdateBody
}

const yesNo = (value: unknown) => {
  if (value === true || value === 1 || value === "1" || value === "on" || value === "enabled") {
    return "1"
  }

  return "0"
}

const text = (value: unknown) =>
  value === undefined || value === null ? "" : String(value)

const isFiniteNumberLike = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return false
  }

  return Number.isFinite(Number(value))
}

const normalizeVerified = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "verified"
    ? "verified"
    : "notVerified"

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()

const normalizeBackendError = (errors: BackendWebSettingsResponse["errors"]) => {
  if (!errors) return undefined
  if (typeof errors === "string") return stripHtml(errors)
  if (Array.isArray(errors)) return stripHtml(errors.join(" "))

  return stripHtml(Object.values(errors).join(" "))
}

const supportedSections: Record<string, SectionConfig> = {
  general: {
    action: "update_general_settings",
    fields: [
      "username",
      "email",
      "phone_number",
      "birthday",
      "gender",
      "country_id",
      "verified",
      "wallet",
      "weather_unit",
    ],
    transform: payload => ({
      ...payload,
      country: payload.country_id ?? payload.country,
      verified: payload.verified === undefined ? undefined : normalizeVerified(payload.verified),
    }),
  },
  profile: {
    action: "update_profile_setting",
    fields: [
      "first_name",
      "last_name",
      "website",
      "about",
      "working",
      "working_link",
      "address",
      "lat",
      "lng",
      "school",
      "relationship",
      "completed",
      "skills",
      "languages",
    ],
    transform: payload => ({
      ...payload,
      completed: payload.completed ? "on" : "",
    }),
  },
  privacy: {
    action: "update_privacy_settings",
    fields: [
      "message_privacy",
      "follow_privacy",
      "friend_privacy",
      "post_privacy",
      "showlastseen",
      "confirm_followers",
      "show_activities_privacy",
      "visit_privacy",
      "birth_privacy",
      "status",
      "share_my_location",
      "share_my_data",
    ],
  },
  emailNotifications: {
    action: "update_email_settings",
    fields: [
      "e_liked",
      "e_shared",
      "e_wondered",
      "e_commented",
      "e_followed",
      "e_liked_page",
      "e_visited",
      "e_mentioned",
      "e_joined_group",
      "e_accepted",
      "e_profile_wall_post",
      "e_sentme_msg",
    ],
    transform: payload => Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, yesNo(value)]),
    ),
  },
  notifications: {
    action: "update_notifications_settings",
    fields: [
      "e_liked",
      "e_shared",
      "e_wondered",
      "e_commented",
      "e_followed",
      "e_liked_page",
      "e_visited",
      "e_mentioned",
      "e_joined_group",
      "e_accepted",
      "e_profile_wall_post",
      "e_memory",
    ],
    transform: payload => Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, yesNo(value)]),
    ),
  },
  socialLinks: {
    action: "update_socialinks_setting",
    fields: ["facebook", "linkedin", "vk", "instagram", "twitter", "youtube"],
  },
  avatar: {
    action: "update_images_setting",
    fields: ["avatar", "cover"],
  },
  password: {
    action: "update_user_password",
    fields: ["current_password", "new_password", "repeat_new_password"],
  },
  twoFactor: {
    action: "update_two_factor",
    fields: ["two_factor", "phone_number", "code", "factor_method"],
    subAction: payload => {
      if (payload.code) return "verify_code"
      if (payload.two_factor === "disable") return "disable"

      return "enable"
    },
    transform: payload => ({
      ...payload,
      two_factor: payload.two_factor === "disable" ? "disable" : payload.two_factor,
      factor_method: payload.factor_method || "two_factor",
    }),
  },
  deleteAccount: {
    action: "delete_user_account",
    fields: ["password"],
  },
}

const pickAllowedPayload = (body: SettingsUpdateBody, config: SectionConfig) => {
  const rawPayload: SettingsUpdateBody = {}

  for (const key of config.fields) {
    if (body[key] !== undefined) {
      rawPayload[key] = body[key]
    }
  }

  const transformedPayload = config.transform?.(rawPayload) ?? rawPayload
  const payload: SettingsUpdateBody = {}

  for (const [key, value] of Object.entries(transformedPayload)) {
    if (value !== undefined && value !== null) {
      payload[key] = value
    }
  }

  return payload
}

const parseSettingsBody = async (event: H3Event) => {
  const contentType = getHeader(event, "content-type") || ""

  if (!contentType.includes("multipart/form-data")) {
    return {
      body: await readBody<SettingsUpdateBody>(event),
      files: [] as SettingsFilePart[],
    }
  }

  const body: SettingsUpdateBody = {}
  const files: SettingsFilePart[] = []
  const parts = await readMultipartFormData(event) ?? []

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      files.push({
        name: part.name,
        filename: part.filename,
        type: part.type,
        data: part.data,
      })
      continue
    }

    body[part.name] = part.data.toString()
  }

  return { body, files }
}

const toBackendBody = (
  payload: SettingsUpdateBody,
  files: SettingsFilePart[],
  config: SectionConfig,
  userId: string | number,
  sessionHash: string,
) => {
  const allowedFiles = files.filter(file => file.name && config.fields.includes(file.name))

  if (allowedFiles.length === 0) {
    return {
      ...payload,
      user_id: userId,
      hash_id: sessionHash,
    }
  }

  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  }

  formData.append("user_id", String(userId))
  formData.append("hash_id", sessionHash)

  for (const file of allowedFiles) {
    const blob = new Blob([file.data], { type: file.type || "application/octet-stream" })

    formData.append(file.name!, blob, file.filename)
  }

  return formData
}

export default defineEventHandler(async (event) => {
  const { body, files } = await parseSettingsBody(event)
  const section = text(body?.section)
  const config = supportedSections[section]

  if (!config) {
    throw createError({
      statusCode: 422,
      statusMessage: "Unsupported settings section.",
    })
  }

  const currentUser = await getBackendCurrentUser(event)
  const userId = currentUser.user_id
  const sessionHash = text(currentUser.session_hash)

  if (!userId || !sessionHash) {
    deleteCookie(event, "user_id", { path: "/" })

    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  const payload = pickAllowedPayload(body, config)
  const hasAllowedFiles = files.some(file => file.name && config.fields.includes(file.name))

  if (Object.keys(payload).length === 0 && !hasAllowedFiles) {
    throw createError({
      statusCode: 422,
      statusMessage: "No supported settings fields were provided.",
    })
  }

  const client = createBackendWebClient(event)
  const response = await client.postForm<BackendWebSettingsResponse, SettingsUpdateBody | FormData>(
    config.action,
    toBackendBody(payload, files, config, userId, sessionHash),
    config.subAction
      ? { s: config.subAction(payload) ?? "" }
      : undefined,
  )

  const backendError = normalizeBackendError(response.errors)
  const backendStatus = Number(response.status ?? 0)

  if (backendError || backendStatus >= 400) {
    throw createError({
      statusCode: backendStatus >= 400 ? backendStatus : 400,
      statusMessage: backendError || stripHtml(response.message || "Unable to update settings."),
      data: response,
    })
  }

  if (backendStatus !== 200) {
    throw createError({
      statusCode: 400,
      statusMessage: stripHtml(response.message || "Unable to update settings."),
      data: response,
    })
  }

  if (section === "profile" && (isFiniteNumberLike(payload.lat) || isFiniteNumberLike(payload.lng))) {
    const coordinatePayload: Record<string, string> = {}

    if (isFiniteNumberLike(payload.lat)) {
      coordinatePayload.lat = text(payload.lat)
    }

    if (isFiniteNumberLike(payload.lng)) {
      coordinatePayload.lng = text(payload.lng)
    }

    if (Object.keys(coordinatePayload).length > 0) {
      const apiClient = createBackendApiClient(event)
      assertBackendApiSuccess(
        await apiClient.post("update-user-data", coordinatePayload),
        "Unable to update location coordinates.",
      )
    }
  }

  return {
    success: true,
    status: "updated",
    message: stripHtml(response.message || "Settings updated successfully."),
    location: response.location,
  }
})
