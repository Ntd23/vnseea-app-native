// English description: Polls the PHP call tables for a pending one-to-one incoming call.

import { callBackend, normalizeCallType } from "./_shared"

const parseIncomingHtml = (html: unknown) => {
  const raw = typeof html === "string" ? html : ""
  const nameMatch = raw.match(/<p><b>(.*?)<\/b>/i)
  const avatarMatch = raw.match(/<img[^>]+src=["']([^"']+)["']/i)

  return {
    name: nameMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "Contact",
    avatar: avatarMatch?.[1] || "",
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = normalizeCallType(query.type)
  const response = await callBackend(event, "check_incoming_audio_call", {
    call_type: type,
  })
  const status = Number(response.status ?? 204)

  if (status !== 200) {
    return null
  }

  const peer = parseIncomingHtml(response.html)

  return {
    id: Number(response.call_id ?? 0),
    type: normalizeCallType(response.call_type || type),
    peer: {
      id: 0,
      name: peer.name,
      avatar: peer.avatar,
    },
  }
})
