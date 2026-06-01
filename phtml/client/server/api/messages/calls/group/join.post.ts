// English description: Accepts a pending backend group call invitation and returns its join URL.

import { callBackend, normalizeCallType } from "../_shared"
import { buildGroupCallRoute } from "./_shared"

const asNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const response = await callBackend(event, "join_group_call", {
    call_id: asNumber(body.id),
  })

  return {
    status: asNumber(response.status),
    id: asNumber(response.id) || asNumber(response.call_id),
    groupId: asNumber(response.group_id),
    type: normalizeCallType(response.call_type),
    url: buildGroupCallRoute(asNumber(response.id) || asNumber(response.call_id), response.call_type),
    groupName: asString(response.group_name),
    participantCount: asNumber(response.participant_count),
  }
})
