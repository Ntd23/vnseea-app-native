// English description: Mutates WoWonder user message tags through the existing PHP tags xhr handler.

import { createError, readBody } from "h3"
import type { MessageActionResult } from "../../../src/messages/domain/types/messages.types"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendWebClient } from "../../utils/backend-web-client"

type BackendTagMutationResponse = {
  status?: number | string
  message?: string
  data?: string
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const createMutation = (body: Record<string, unknown>) => {
  const action = asString(body.action)
  const userId = asNumber(body.userId ?? body.target_user_id)
  const tagId = asNumber(body.tagId ?? body.label_id)

  if (action === "create") {
    const name = asString(body.name)
    const color = asString(body.color) || "#3b82f6"

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: "Tag name is required.",
      })
    }

    return {
      endpoint: "create_label",
      body: {
        label_name: name,
        label_color: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#3b82f6",
      },
    }
  }

  if (action === "delete") {
    if (!tagId) {
      throw createError({
        statusCode: 400,
        statusMessage: "A valid tagId is required.",
      })
    }

    return {
      endpoint: "delete_label",
      body: {
        label_id: tagId,
      },
    }
  }

  if (!userId || !tagId) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid userId and tagId are required.",
    })
  }

  if (action === "attach") {
    return {
      endpoint: "attach_label",
      body: {
        target_user_id: userId,
        label_id: tagId,
      },
    }
  }

  if (action === "detach") {
    return {
      endpoint: "detach",
      body: {
        target_user_id: userId,
        label_id: tagId,
      },
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: "A valid tag action is required.",
  })
}

export default defineEventHandler(async (event): Promise<MessageActionResult> => {
  const body = await readBody<Record<string, unknown>>(event)
  const mutation = createMutation(body)
  const currentUser = await getBackendCurrentUser(event)
  const sessionHash = asString(currentUser.session_hash)
  const client = createBackendWebClient(event)
  const response = await client.postForm<BackendTagMutationResponse>(
    "tags",
    {
      ...mutation.body,
      hash_id: sessionHash,
    },
    {
      s: mutation.endpoint,
      hash: sessionHash,
    },
  )
  const ok = asNumber(response.status) === 200

  return {
    ok,
    message: asString(response.message || response.data),
  }
})
