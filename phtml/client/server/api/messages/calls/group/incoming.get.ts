// English description: Polls the backend for pending group call invitations.

import { callBackend, normalizeCallType } from "../_shared"
import { createBackendMediaUrlResolver } from "../../../../utils/backend-media-url"
import { buildGroupCallRoute } from "./_shared"

const asNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

const parseIncomingHtml = (html: unknown) => {
  const raw = typeof html === "string" ? html : ""
  const nameMatch =
    raw.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i)
    || raw.match(/<p><b>(.*?)<\/b>/i)
    || raw.match(/<b[^>]*>(.*?)<\/b>/i)
  const avatarMatch = raw.match(/<img[^>]+src=["']([^"']+)["']/i)

  return {
    name: nameMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "Group call",
    avatar: avatarMatch?.[1] || "",
  }
}

export default defineEventHandler(async (event) => {
  const resolveBackendUrl = createBackendMediaUrlResolver(event)
  const response = await callBackend(event, "check_incoming_group_call", {})
  const status = asNumber(response.status)

  if (status !== 200) {
    return null
  }

  const peer = parseIncomingHtml(response.html)

  return {
    id: asNumber(response.call_id),
    groupId: asNumber(response.group_id),
    type: normalizeCallType(response.call_type),
    url: buildGroupCallRoute(asNumber(response.call_id), response.call_type),
    groupName: asString(response.group_name) || peer.name,
    avatar: resolveBackendUrl(response.group_avatar) || resolveBackendUrl(peer.avatar),
  }
})
