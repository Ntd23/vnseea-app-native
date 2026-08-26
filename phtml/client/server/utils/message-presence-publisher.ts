// English description: Publishes authenticated message presence transitions to the internal Socket.IO relay.

import type { H3Event } from "h3"

type MessagePresenceChange = {
  userId: number
  online: boolean
}

export async function publishMessagePresenceChange(
  event: H3Event,
  change: MessagePresenceChange,
) {
  const config = useRuntimeConfig(event)
  const internalUrl = String(config.realtimeInternalUrl || "").trim().replace(/\/+$/, "")
  const secret = String(config.realtimeSecret || "").trim()

  if (!internalUrl || !secret || change.userId <= 0) {
    return false
  }

  try {
    await $fetch(`${internalUrl}/internal/messages/presence/publish`, {
      method: "POST",
      headers: {
        "x-realtime-secret": secret,
      },
      body: {
        userId: change.userId,
        online: change.online,
        occurredAt: Date.now(),
      },
      timeout: 800,
    })

    return true
  }
  catch {
    // Realtime delivery is best-effort; periodic inbox refresh remains authoritative.
    return false
  }
}
