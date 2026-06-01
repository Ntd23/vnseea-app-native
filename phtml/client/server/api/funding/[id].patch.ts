// English description: Bridges funding campaign updates to the backend funding edit API.

import { getRouterParam, readBody } from "h3"
import { updateFundingCampaign } from "./_shared"

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"))
  const body = await readBody<{
    title?: string
    description?: string
    amount?: number
  }>(event)

  return await updateFundingCampaign(event, {
    id,
    title: body.title?.trim(),
    description: body.description?.trim(),
    amount: Number(body.amount),
  })
})
