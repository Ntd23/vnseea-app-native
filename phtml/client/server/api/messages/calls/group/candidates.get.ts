// English description: Returns group members that can still be invited to an active group call.

import { createError, getQuery } from "h3"
import { asNumber, asString, mapGroupCallParticipant } from "./_shared"
import { callBackend } from "../_shared"

type BackendCandidatesResponse = {
  status?: number | string
  candidates?: Record<string, unknown>[]
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = asNumber(query.id)
  const groupId = asNumber(query.groupId)

  if (id <= 0 || groupId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid group call id and group id are required.",
    })
  }

  const response = await callBackend<BackendCandidatesResponse>(
    event,
    "get_group_call_candidates",
    {
      call_id: id,
      group_id: groupId,
    },
  )

  const items = (Array.isArray(response.candidates) ? response.candidates : [])
    .map(candidate => mapGroupCallParticipant(event, candidate))
    .map(candidate => ({
      userId: candidate.userId,
      name: candidate.name,
      username: asString(candidate.username) || undefined,
      avatar: candidate.avatar,
    }))
    .filter(candidate => candidate.userId > 0 && candidate.name)

  return { items }
})
