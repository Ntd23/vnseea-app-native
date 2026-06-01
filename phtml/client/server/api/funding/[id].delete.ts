// English description: Bridges funding campaign deletion to the backend funding delete API.

import { getRouterParam } from "h3"
import { deleteFundingCampaign } from "./_shared"

export default defineEventHandler(async (event) => {
  return await deleteFundingCampaign(event, {
    id: Number(getRouterParam(event, "id")),
  })
})
