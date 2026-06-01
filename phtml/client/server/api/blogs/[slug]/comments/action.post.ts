// English description: Bridges blog comment reply and reaction actions to the PHP blogs API.

import { createError, getRouterParam, readBody } from "h3"
import { assertBackendApiSuccess } from "../../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../../../utils/backend-media-url"
import { appRoutes } from "../../../../../src/shared-kernel/application/constants/route-registry"
import {
  feedStoryReactionBackendIds,
  isFeedStoryReaction,
  type FeedStoryReactionType,
} from "../../../../../src/feed/domain/constants/story-reactions"
import type { FeedCommentRecord, FeedPostActionResult } from "../../../../../src/feed/domain/types/feed.types"

type BackendEntity = Record<string, any>

type BackendBlogActionResponse = {
  api_status?: number | string
  data?: BackendEntity[]
  message?: string
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

const normalizeBlogReaction = (reaction: string) => {
  if (!isFeedStoryReaction(reaction)) {
    return "like"
  }

  return String(feedStoryReactionBackendIds[reaction as FeedStoryReactionType])
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const blogId = Number.parseInt(slug, 10)
  const body = await readBody<Record<string, unknown>>(event)
  const action = asString(body.action)

  if (!Number.isInteger(blogId) || blogId <= 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Blog not found.",
    })
  }

  if (action === "reply") {
    const commentId = asNumber(body.commentId)
    const text = asString(body.text)
    const backendText = text.length > 2 ? text : text.padEnd(3, " ")

    if (!commentId || !text) {
      throw createError({
        statusCode: 400,
        statusMessage: "Reply text is required.",
      })
    }

    const response = assertBackendApiSuccess(
      await createBackendApiClient(event).post<BackendBlogActionResponse, Record<string, unknown>>(
        "blogs",
        {
          type: "add_reply",
          blog_id: blogId,
          comment_id: commentId,
          text: backendText,
        },
      ),
      "Unable to reply to blog comment.",
    )
    const resolveMediaUrl = createBackendMediaUrlResolver(event)
    const reply = response.data?.[0]

    if (!reply) {
      throw createError({
        statusCode: 400,
        statusMessage: "Blog reply was not returned by the backend.",
        data: response,
      })
    }

    return {
      ok: true,
      commentId: firstNumber(asEntity(reply), ["id", "comment_id"]),
      reply: mapBlogComment(reply, resolveMediaUrl),
    } satisfies FeedPostActionResult
  }

  if (action === "reaction") {
    const target = asString(body.target)
    const targetId = asNumber(body.targetId)
    const reaction = asString(body.reaction)

    if (!targetId || (target !== "comment" && target !== "reply")) {
      throw createError({
        statusCode: 400,
        statusMessage: "Comment reaction payload is invalid.",
      })
    }

    assertBackendApiSuccess(
      await createBackendApiClient(event).post<BackendBlogActionResponse, Record<string, unknown>>(
        "blogs",
        {
          type: target === "reply" ? "reply_like" : "like",
          blog_id: blogId,
          comment_id: targetId,
          reaction_type: normalizeBlogReaction(reaction),
        },
      ),
      "Unable to react to blog comment.",
    )

    return {
      ok: true,
      reaction: isFeedStoryReaction(reaction) ? reaction : "Like",
    } satisfies FeedPostActionResult
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Comment action is invalid.",
  })
})
