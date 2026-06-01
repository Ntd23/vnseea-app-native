// English description: Bridges funding donations to the backend funding pay action.

import { readBody } from "h3"
import { donateFundingCampaign } from "./_shared"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: number; amount?: number }>(event)

  return await donateFundingCampaign(event, body)
})
