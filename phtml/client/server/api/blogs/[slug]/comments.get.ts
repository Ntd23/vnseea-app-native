// English description: Returns normalized comments for a backend blog article.

import { createError, getRouterParam } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../../utils/backend-media-url"
import { appRoutes } from "../../../../src/shared-kernel/application/constants/route-registry"
import { feedStoryReactionByBackendId } from "../../../../src/feed/domain/constants/story-reactions"
import type { FeedCommentRecord } from "../../../../src/feed/domain/types/feed.types"

type BackendEntity = Record<string, any>

type BackendBlogCommentsResponse = {
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

const asArray = (value: unknown): BackendEntity[] =>
  Array.isArray(value)
    ? value.map(item => asEntity(item))
    : []

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
  const reaction = asEntity(entity.reaction)
  const selectedReaction = reaction.is_reacted
    ? feedStoryReactionByBackendId[firstString(reaction, ["type"])] ?? null
    : asString(entity.is_comment_liked) === "1" || entity.is_comment_liked === true
      ? "Like"
      : null

  return {
    id: firstNumber(entity, ["id", "comment_id"]),
    author,
    authorAvatarUrl: resolveMediaUrl(firstString(user, ["avatar_full", "avatar"])),
    authorPath: username ? appRoutes.profile(username) : undefined,
    role: username ? `@${username}` : author,
    text: stripHtml(firstString(entity, ["text", "Orginaltext", "comment"])),
    time: firstString(entity, ["time_text", "posted"]),
    reactionsCount: firstNumber(reaction, ["count", "reactions_count", "total"]),
    selectedReaction,
    repliesCount: firstNumber(entity, ["replies", "replies_num", "reply_count", "replies_count"]),
    replies: asArray(entity.replies).map(reply => mapBlogComment(reply, resolveMediaUrl)),
  }
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const blogId = Number.parseInt(slug, 10)

  if (!Number.isInteger(blogId) || blogId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Blog not found.",
    })
  }

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendBlogCommentsResponse, Record<string, unknown>>(
      "blogs",
      {
        type: "get_comments",
        blog_id: blogId,
        limit: 20,
      },
    ),
    "Unable to load blog comments.",
  )
  const resolveMediaUrl = createBackendMediaUrlResolver(event)

  return (response.data ?? []).map(comment => mapBlogComment(comment, resolveMediaUrl))
})
