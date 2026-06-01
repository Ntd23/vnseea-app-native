// English description: Returns a backend-backed forum thread detail by id.

import { getRouterParam } from "h3"
import { fetchForumThreadDetail } from "../_shared"

export default defineEventHandler(async (event) => {
  return await fetchForumThreadDetail(event, Number(getRouterParam(event, "id")) || 0)
})
