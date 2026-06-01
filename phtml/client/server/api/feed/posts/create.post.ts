// English description: Creates a new timeline post through the backend API v2 new_post endpoint, including text, feeling, image, and video uploads.

import { createError, getCookie, getHeader, readBody, readMultipartFormData } from "h3"
import { mapPostRecord } from "../_shared"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { getBackendCurrentUser } from "../../../utils/backend-current-user"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { createBackendWebClient } from "../../../utils/backend-web-client"
import { postBackendApiUpload } from "../../../utils/backend-api-upload"
import type { FeedPostRecord } from "../../../../src/feed/domain/types/feed.types"

type BackendCreatePostResponse = {
  api_status?: number | string
  post_data?: Record<string, unknown>
  errors?: {
    error_text?: string
  }
}

type BackendSharePostResponse = {
  status?: number | string
  post_id?: number | string
  message?: string
}

type BackendGetPostResponse = {
  api_status?: number | string
  post_data?: Record<string, unknown>
  errors?: {
    error_text?: string
  }
}

type CreatePostPayload = {
  text: string
  audience: string
  feeling: string
  imageFile: {
    filename?: string
    type?: string
    data: Buffer
  } | null
  videoFile: {
    filename?: string
    type?: string
    data: Buffer
  } | null
  pageId?: number
  eventId?: number
  groupId?: number
  sharedPostId?: number
  colorId?: number
  pollAnswers: string[]
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const mapAudienceToPrivacy = (value: string) => {
  if (value === "friends" || value === "connections") return "1"
  if (value === "group") return "2"
  if (value === "private" || value === "only-me") return "3"
  return "0"
}

const allowedFeelings = new Set([
  "happy",
  "loved",
  "sad",
  "so_sad",
  "angry",
  "confused",
  "smirk",
  "broke",
  "expressionless",
  "cool",
  "funny",
  "tired",
  "lovely",
  "blessed",
  "shocked",
  "sleepy",
  "pretty",
  "bored",
])

const parseJsonPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<CreatePostPayload> => {
  const body = await readBody<Record<string, unknown>>(event)

  return {
    text: typeof body.text === "string" ? body.text.trim() : "",
    audience: typeof body.audience === "string" ? body.audience.trim() : "public",
    feeling: typeof body.feeling === "string" ? body.feeling.trim() : "",
    imageFile: null,
    videoFile: null,
    pageId: body.pageId ? Number(body.pageId) : undefined,
    eventId: body.eventId ? Number(body.eventId) : undefined,
    groupId: body.groupId ? Number(body.groupId) : undefined,
    sharedPostId: body.sharedPostId ? Number(body.sharedPostId) : undefined,
    colorId: body.colorId ? Number(body.colorId) : undefined,
    pollAnswers: Array.isArray(body.pollAnswers)
      ? body.pollAnswers.map(asString).filter(Boolean)
      : [],
  }
}

const parseMultipartPayload = async (event: Parameters<typeof defineEventHandler>[0]): Promise<CreatePostPayload> => {
  const parts = await readMultipartFormData(event) ?? []
  const payload: CreatePostPayload = {
    text: "",
    audience: "public",
    feeling: "",
    imageFile: null,
    videoFile: null,
    pageId: undefined,
    eventId: undefined,
    groupId: undefined,
    colorId: undefined,
    pollAnswers: [],
  }

  for (const part of parts) {
    if (!part.name) {
      continue
    }

    if (part.filename) {
      const file = {
        filename: part.filename,
        type: part.type,
        data: part.data,
      }

      if (part.name === "postPhotos[]" || part.name === "postPhotos") {
        payload.imageFile = file
      }
      else if (part.name === "postVideo") {
        payload.videoFile = file
      }

      continue
    }

    const value = part.data.toString().trim()

    if (part.name === "text") payload.text = value
    if (part.name === "audience") payload.audience = value || "public"
    if (part.name === "feeling") payload.feeling = value
    if (part.name === "pageId") payload.pageId = Number(value)
    if (part.name === "eventId") payload.eventId = Number(value)
    if (part.name === "groupId") payload.groupId = Number(value)
    if (part.name === "sharedPostId") payload.sharedPostId = Number(value)
    if (part.name === "colorId" || part.name === "post_color") payload.colorId = Number(value)
    if (part.name === "answer[]" || part.name === "answer") payload.pollAnswers.push(value)
  }

  payload.pollAnswers = payload.pollAnswers.map(answer => answer.trim()).filter(Boolean)

  return payload
}

export default defineEventHandler(async (event) => {
  const currentUser = await getBackendCurrentUser(event)
  const currentUserId = asString(currentUser.user_id)
  const appSessionToken = asString(getCookie(event, "user_id"))
  const contentType = getHeader(event, "content-type") || ""
  const payload = contentType.includes("multipart/form-data")
    ? await parseMultipartPayload(event)
    : await parseJsonPayload(event)

  if (!payload.text && !payload.imageFile && !payload.videoFile && !payload.feeling && !payload.sharedPostId && !payload.pollAnswers.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post content is required.",
    })
  }

  if (payload.pollAnswers.length > 0 && (!payload.text || payload.pollAnswers.length < 2)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Poll question and at least two answers are required.",
    })
  }

  if (payload.feeling && !allowedFeelings.has(payload.feeling)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Post feeling is invalid.",
    })
  }

  if (!currentUserId || !appSessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
    })
  }

  if (payload.sharedPostId) {
    const shareTarget = payload.groupId
      ? "group"
      : payload.pageId
        ? "page"
        : "timeline"
    const shareTargetId = payload.groupId ?? payload.pageId ?? currentUserId
    const webClient = createBackendWebClient(event)
    const shareResponse = await webClient.request<BackendSharePostResponse>({
      query: {
        f: "share_post_on",
        s: shareTarget,
        type_id: shareTargetId,
        post_id: payload.sharedPostId,
        text: payload.text,
      },
    })
    const status = Number(shareResponse.status ?? 0)

    if (status < 200 || status >= 300) {
      throw createError({
        statusCode: 400,
        statusMessage: shareResponse.message || "Unable to share post.",
        data: {
          backendResponse: shareResponse,
          payload: {
            sharedPostId: payload.sharedPostId,
            shareTarget,
            targetId: shareTargetId,
          },
        },
      })
    }

    let createdPost: FeedPostRecord | null = null
    const createdPostId = Number(shareResponse.post_id ?? 0)

    if (createdPostId > 0) {
      try {
        const response = assertBackendApiSuccess(
          await createBackendApiClient(event).post<BackendGetPostResponse, Record<string, unknown>>(
            "get-post-data",
            {
              post_id: createdPostId,
              fetch: "post_data",
            },
          ),
          "Unable to load shared post.",
        )
        createdPost = response.post_data ? mapPostRecord(response.post_data) : null
      }
      catch {
        createdPost = null
      }
    }

    return {
      ok: true,
      post: createdPost,
    }
  }

  const requestBody = payload.imageFile || payload.videoFile
    ? new FormData()
    : new URLSearchParams()

  requestBody.append("postText", payload.text)
  requestBody.append("postPrivacy", mapAudienceToPrivacy(payload.audience))
  requestBody.append("user_id", currentUserId)
  requestBody.append("s", appSessionToken)

  if (payload.pageId) {
    requestBody.append("page_id", String(payload.pageId))
  }

  if (payload.eventId) {
    requestBody.append("event_id", String(payload.eventId))
  }

  if (payload.groupId) {
    requestBody.append("group_id", String(payload.groupId))
  }

  if (payload.feeling) {
    requestBody.append("feeling_type", "feelings")
    requestBody.append("feeling", payload.feeling)
  }

  if (payload.colorId) {
    requestBody.append("post_color", String(payload.colorId))
  }

  for (const answer of payload.pollAnswers) {
    requestBody.append("answer[]", answer)
  }

  if (payload.imageFile) {
    requestBody.append(
      "postPhotos[]",
      new File([payload.imageFile.data], payload.imageFile.filename || "post-image.jpg", {
        type: payload.imageFile.type || "image/jpeg",
      }),
    )
  }

  if (payload.videoFile) {
    requestBody.append(
      "postVideo",
      new File([payload.videoFile.data], payload.videoFile.filename || "post-video.mp4", {
        type: payload.videoFile.type || "video/mp4",
      }),
    )
  }

  const backendResponse = await postBackendApiUpload<BackendCreatePostResponse>(
    event,
    "new_post",
    requestBody,
  )

  let response: BackendCreatePostResponse

  try {
    response = assertBackendApiSuccess(
      backendResponse,
      "Unable to create post.",
    )
  }
  catch (error) {
    throw createError({
      statusCode: Number((error as { statusCode?: number }).statusCode || 400),
      statusMessage: (error as { statusMessage?: string }).statusMessage || "Unable to create post.",
      data: {
        backendResponse,
        payload: {
          textLength: payload.text.length,
          audience: payload.audience,
          pageId: payload.pageId,
          eventId: payload.eventId,
          groupId: payload.groupId,
          hasUserId: Boolean(currentUserId),
          hasSession: Boolean(appSessionToken),
        },
      },
    })
  }

  const createdPost = response.post_data
    ? mapPostRecord(response.post_data)
    : null

  return {
    ok: true,
    post: createdPost as FeedPostRecord | null,
  }
})
