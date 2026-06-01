// English description: Searches real backend users that can receive wallet transfers.

import { getQuery } from "h3"
import { searchWalletRecipients } from "./_shared"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const keyword = typeof query.q === "string" ? query.q.trim() : ""

  if (keyword.length < 2 && !/^\d+$/.test(keyword)) {
    return []
  }

  return await searchWalletRecipients(event, keyword)
})
