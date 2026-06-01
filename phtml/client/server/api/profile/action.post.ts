// English description: Runs backend-backed profile actions such as follow and poke without frontend mock state.

import { createError, readBody } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import type { ProfileActionResult } from "../../../src/profile/domain/types/profile.types"

type ProfileActionBody = {
  action?: string
  userId?: number | string
}

type BackendFollowResponse = {
  api_status?: number | string
  follow_status?: string
  status?: number | string
  can_send?: number | string
  errors?: { error_text?: string }
}

type BackendPokeResponse = {
  api_status?: number | string
  message_data?: string
  errors?: { error_text?: string }
}

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const SUPPORTED_ACTIONS = ["follow", "poke", "block", "report"] as const

export default defineEventHandler(async (event): Promise<ProfileActionResult> => {
  const body = await readBody<ProfileActionBody>(event)
  const userId = asNumber(body.userId)

  if (!body.action || !(SUPPORTED_ACTIONS as readonly string[]).includes(body.action)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported profile action.",
    })
  }

  if (userId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Profile user id is required.",
    })
  }

  const client = createBackendApiClient(event)

  // ── Poke ──────────────────────────────────────
  if (body.action === "poke") {
    const pokeResponse = await client.post<BackendPokeResponse, Record<string, unknown>>(
      "poke",
      { type: "create", user_id: userId },
    )
    const apiStatus = Number(pokeResponse?.api_status ?? 200)
    const errorId = Number((pokeResponse?.errors as any)?.error_id ?? 0)
    if (apiStatus !== 200) {
      throw createError({
        statusCode: 409,
        statusMessage: errorId === 7 ? "already_poked" : ((pokeResponse?.errors as any)?.error_text ?? "poke_failed"),
      })
    }
    return { ok: true, status: "poked" }
  }

  // ── Block ─────────────────────────────────────
  if (body.action === "block") {
    const response = await client.post<any, any>("block-user", {
      user_id: userId,
      block_action: "block",
    })
    return { ok: true, status: response.block_status || "blocked" }
  }

  // ── Report ────────────────────────────────────
  if (body.action === "report") {
    await client.post<any, any>("report_user", {
      user: userId,
      text: "Reported from profile menu",
    })
    return { ok: true, status: "reported" }
  }

  // ── Follow ────────────────────────────────────
  const currentUser = await getBackendCurrentUser(event)
  const sessionHash = typeof currentUser.session_hash === "string" ? currentUser.session_hash.trim() : ""

  if (!sessionHash) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication is required.",
      data: { reason: "Missing backend session hash." },
    })
  }

  const webClient = createBackendWebClient(event)
  const response = await webClient.postForm<BackendFollowResponse>(
    "follow_user",
    { hash_id: sessionHash },
    { following_id: userId },
  )
  const status = Number(response.status ?? response.api_status ?? 0)
  const followStatus = typeof response.follow_status === "string" ? response.follow_status.trim() : ""
  const hasBackendError = Boolean(response.errors?.error_text)
  const hasExplicitStatus = status > 0
  const looksSuccessful = followStatus.length > 0 || Number(response.can_send ?? 0) === 1

  if (hasBackendError || (!looksSuccessful && hasExplicitStatus && (status < 200 || status >= 300))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unable to update profile follow state.",
      data: response,
    })
  }

  return {
    ok: true,
    status: followStatus || "updated",
  }
})
