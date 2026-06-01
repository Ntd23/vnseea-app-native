// English description: Toggles group membership in the PHP browser-session backend and returns the refreshed group record.

import { createError, getRouterParam } from "h3"
import { createBackendWebClient } from "../../../../utils/backend-web-client"
import { getBackendCurrentUser } from "../../../../utils/backend-current-user"
import { resolveGroupRecordBySlug } from "../../_shared"

type BackendJoinGroupResponse = {
  status?: number | string
}

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "")
  const currentUser = await getBackendCurrentUser(event)
  const group = await resolveGroupRecordBySlug(event, slug)
  const client = createBackendWebClient(event)

  const response = await client.postForm<BackendJoinGroupResponse, Record<string, unknown>>(
    "join_group",
    {
      hash_id: currentUser.session_hash,
    },
    {
      group_id: group.id,
    },
  )

  if (Number(response.status ?? 0) !== 200) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unable to update group membership.",
      data: response,
    })
  }

  return await resolveGroupRecordBySlug(event, slug)
})
