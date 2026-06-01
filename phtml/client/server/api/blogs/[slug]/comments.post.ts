// English description: Adds a text comment to a backend blog article and returns the normalized comment.

import { createError, getRouterParam, readBody } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../../utils/backend-media-url"
import { appRoutes } from "../../../../src/shared-kernel/application/constants/route-registry"
import type { FeedCommentRecord } from "../../../../src/feed/domain/types/feed.types"

type BackendEntity = Record<string, any>

type BackendBlogCommentResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const asEntity = (value: unknown): BackendEntity =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as BackendEntity
    : {}

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const firstString = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asString(entity[key])
    if (value) return value
  }

  return ""
}

const firstNumber = (entity: BackendEntity, keys: string[]) => {
  for (const key of keys) {
    const value = asNumber(entity[key])
    if (value > 0) return value
  }

  return 0
}

const mapBlogComment = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
): FeedCommentRecord => {
  const user = asEntity(entity.user_data || entity.publisher)
  const author = firstString(user, ["name", "username"]) || "User"
  const username = firstString(user, ["username"])

  return {
    id: firstNumber(entity, ["id", "comment_id"]),
    author,
    authorAvatarUrl: resolveMediaUrl(firstString(user, ["avatar_full", "avatar"])),
    authorPath: username ? appRoutes.profile(username) : undefined,
    role: username ? `@${username}` : author,
    text: stripHtml(firstString(entity, ["text", "Orginaltext", "comment"])),
    time: firstString(entity, ["time_text", "posted"]),
    reactionsCount: 0,
    selectedReaction: null,
    repliesCount: 0,
    replies: [],
  }
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const blogId = Number.parseInt(slug, 10)
  const body = await readBody<{ text?: string }>(event)
  const text = asString(body.text)

  if (!Number.isInteger(blogId) || blogId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Blog not found.",
    })
  }

  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: "Comment content is required.",
    })
  }

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendBlogCommentResponse, Record<string, unknown>>(
      "blogs",
      {
        type: "add_comment",
        blog_id: blogId,
        text,
      },
    ),
    "Unable to add blog comment.",
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const comment = response.data?.[0]

  if (!comment) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unable to add blog comment.",
    })
  }

  return mapBlogComment(comment, resolveMediaUrl)
})
