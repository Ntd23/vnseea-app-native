// English description: Loads reply comments for a backend blog comment.

import { createError, getQuery, getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../../../utils/backend-media-url"
import { appRoutes } from "../../../../../src/shared-kernel/application/constants/route-registry"
import type { FeedCommentRecord } from "../../../../../src/feed/domain/types/feed.types"

type BackendEntity = Record<string, any>

type BackendBlogRepliesResponse = {
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
  const query = getQuery(event)
  const commentId = Number(Array.isArray(query.commentId) ? query.commentId[0] : query.commentId ?? 0)
  const limit = Number(Array.isArray(query.limit) ? query.limit[0] : query.limit ?? 10)
  const offset = Number(Array.isArray(query.offset) ? query.offset[0] : query.offset ?? 0)

  if (!Number.isInteger(blogId) || blogId <= 0 || !Number.isFinite(commentId) || commentId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Comment id is required.",
    })
  }

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendBlogRepliesResponse, Record<string, unknown>>(
      "blogs",
      {
        type: "reply_fetch",
        comment_id: commentId,
        limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10,
        offset: Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0,
      },
    ),
    "Unable to load blog comment replies.",
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return (response.data ?? []).map(reply => mapBlogComment(reply, resolveMediaUrl))
})
