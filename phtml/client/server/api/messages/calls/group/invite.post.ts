// English description: Invites selected group members to an active group call.

import { createError } from "h3"
import { asNumber, postGroupCallForm, readGroupCallBody } from "./_shared"

type BackendInviteResponse = {
  status?: number | string
  count?: number | string
}

export default defineEventHandler(async (event) => {
  const body = await readGroupCallBody(event)
  const userIds = [...new Set(body.userIds)]

  if (body.id <= 0 || userIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group call id and at least one user id are required.",
    })
  }

  const response = await postGroupCallForm<BackendInviteResponse>(
    event,
    "add_group_call_members",
    {
      call_id: body.id,
      user_ids: userIds.join(","),
    },
  )

  return {
    ok: asNumber(response.status) === 200,
    count: asNumber(response.count),
  }
})
