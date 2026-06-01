// English description: Declines a pending backend group call invitation.

import { callBackend } from "../_shared"

const asNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const response = await callBackend(event, "decline_group_call_invite", {
    call_id: asNumber(body.id),
  })

  return {
    ok: asNumber(response.status) === 200,
  }
})
