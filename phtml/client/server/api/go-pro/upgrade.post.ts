// English description: Bridges Pro package upgrade requests to the backend upgrade endpoint.

import { readBody } from "h3"
import { upgradeGoPro } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ type?: string }>(event)

  return await upgradeGoPro(event, String(body.type ?? ""))
})
