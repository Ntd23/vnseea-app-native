// English description: Bridges story views, reactions, and replies to the PHP backend APIs.

import { createError, readBody } from "h3"
import { assertBackendApiSuccess } from "../../../utils/backend-api-response"
import { createBackendApiClient } from "../../../utils/backend-api-client"
import { getBackendCurrentUser } from "../../../utils/backend-current-user"
import { createBackendWebClient } from "../../../utils/backend-web-client"
import {
  feedStoryReactionBackendIds,
  isFeedStoryReaction,
  type FeedStoryReactionType,
} from "../../../../src/feed/domain/constants/story-reactions"

type StoryActionBody = Partial<Record<"action" | "storyId" | "reaction" | "ownerId" | "text", unknown>>

type BackendStoryReactionResponse = {
  status?: number | string
  message?: string
  error?: string
}

type BackendStoryViewResponse = {
  api_status?: number | string
  story?: unknown
  errors?: {
    error_text?: string
  }
}

type BackendSendMessageResponse = {
  api_status?: number | string
  message_data?: unknown[]
  errors?: {
    error_text?: string
  }
}

const storyActionErrors = {
  invalidAction: "A valid story action is required.",
  invalidOwner: "A valid story owner is required.",
  invalidReaction: "A valid story reaction is required.",
  invalidStory: "A valid story id is required.",
  ownStoryReply: "You cannot reply to your own story.",
  reactFailed: "Unable to react to story.",
  replyRequired: "Reply text is required.",
  replyFailed: "Unable to reply to story.",
  viewFailed: "Unable to mark story as viewed.",
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const readStoryId = (value: unknown) => {
  const storyId = Math.floor(asNumber(value))

  if (storyId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: storyActionErrors.invalidStory,
    })
  }

  return storyId
}

export default defineEventHandler(async (event) => {
  const body = await readBody<StoryActionBody>(event) ?? {}
  const action = asString(body.action)
  const storyId = readStoryId(body.storyId)

  if (action === "react") {
    const reaction = asString(body.reaction)

    if (!isFeedStoryReaction(reaction)) {
      throw createError({
        statusCode: 400,
        statusMessage: storyActionErrors.invalidReaction,
      })
    }

    const storyReaction = reaction as FeedStoryReactionType

    const response = await createBackendWebClient(event).postForm<BackendStoryReactionResponse, URLSearchParams>(
      "status",
      new URLSearchParams(),
      {
        s: "register_reaction",
        story_id: storyId,
        reaction: feedStoryReactionBackendIds[storyReaction],
      },
    )

    if (Number(response.status ?? 0) !== 200) {
      throw createError({
        statusCode: 400,
        statusMessage: response.error || response.message || storyActionErrors.reactFailed,
        data: response,
      })
    }

    return {
      ok: true,
      storyId,
      reaction: storyReaction,
    }
  }

  if (action === "view") {
    const response = await createBackendApiClient(event).post<BackendStoryViewResponse, Record<string, unknown>>(
      "get_story_by_id",
      {
        id: storyId,
      },
    )

    if (Number(response.api_status ?? 0) !== 200) {
      throw createError({
        statusCode: 400,
        statusMessage: response.errors?.error_text || storyActionErrors.viewFailed,
        data: response,
      })
    }

    return {
      ok: true,
      storyId,
    }
  }

  if (action === "reply") {
    const ownerId = Math.floor(asNumber(body.ownerId))
    const text = asString(body.text)

    if (ownerId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: storyActionErrors.invalidOwner,
      })
    }

    if (!text) {
      throw createError({
        statusCode: 400,
        statusMessage: storyActionErrors.replyRequired,
      })
    }

    const currentUser = await getBackendCurrentUser(event)

    if (asNumber(currentUser.user_id) === ownerId) {
      throw createError({
        statusCode: 400,
        statusMessage: storyActionErrors.ownStoryReply,
      })
    }

    assertBackendApiSuccess(
      await createBackendApiClient(event).post<BackendSendMessageResponse, Record<string, unknown>>(
        "send-message",
        {
          user_id: ownerId,
          text,
          story_id: storyId,
          message_hash_id: `${Date.now()}`,
        },
      ),
      storyActionErrors.replyFailed,
    )

    return {
      ok: true,
      storyId,
      replySent: true,
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: storyActionErrors.invalidAction,
  })
})
