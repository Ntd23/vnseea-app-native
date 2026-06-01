// English description: Runs create or remove poke actions through the backend poke endpoint.

import { createError, readBody } from "h3"
import { runPokeAction } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const action = String(body.action ?? "").trim()

  if (action !== "create" && action !== "remove") {
    throw createError({
      statusCode: 400,
      statusMessage: "Poke action is invalid.",
    })
  }

  return await runPokeAction(event, {
    action,
    userId: Number(body.userId ?? 0) || undefined,
    pokeId: Number(body.pokeId ?? 0) || undefined,
  })
})
