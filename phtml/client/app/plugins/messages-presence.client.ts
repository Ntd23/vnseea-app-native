// English description: Keeps chat presence alive for the whole browser app session, not only the messages route.

type PresenceAction = "online" | "offline"

const API_PATH = "/_api/messages/presence"
const HEARTBEAT_INTERVAL_MS = 25_000
const TAB_TTL_MS = 45_000
const TAB_ID_KEY = "messages:presence-tab-id"
const TABS_KEY = "messages:presence-tabs"

const createTabId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}:${Math.random().toString(36).slice(2)}`

const readPresenceTabs = () => {
  try {
    return JSON.parse(localStorage.getItem(TABS_KEY) || "{}") as Record<string, number>
  }
  catch {
    return {}
  }
}

const writePresenceTabs = (tabs: Record<string, number>) => {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
  }
  catch {
    // Presence still falls back to server TTL if tab coordination storage is unavailable.
  }
}

const postPresence = async (action: PresenceAction) => {
  await $fetch(API_PATH, {
    method: "POST",
    body: { action },
  })
}

const beaconPresence = (action: PresenceAction) => {
  const body = JSON.stringify({ action })
  const blob = new Blob([body], { type: "application/json" })

  if (navigator.sendBeacon?.(API_PATH, blob)) {
    return
  }

  void fetch(API_PATH, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined)
}

export default defineNuxtPlugin(() => {
  const tabId = (() => {
    try {
      const existingTabId = sessionStorage.getItem(TAB_ID_KEY)
      const nextTabId = existingTabId || createTabId()
      sessionStorage.setItem(TAB_ID_KEY, nextTabId)
      return nextTabId
    }
    catch {
      return createTabId()
    }
  })()
  let isClosing = false

  const touchCurrentTab = () => {
    const now = Date.now()
    const tabs = readPresenceTabs()

    for (const [id, expiresAt] of Object.entries(tabs)) {
      if (expiresAt <= now) {
        delete tabs[id]
      }
    }

    tabs[tabId] = now + TAB_TTL_MS
    writePresenceTabs(tabs)
  }

  const closeCurrentTab = () => {
    if (isClosing) {
      return
    }

    isClosing = true

    const now = Date.now()
    const tabs = readPresenceTabs()
    delete tabs[tabId]

    const hasOtherOpenTab = Object.entries(tabs).some(([id, expiresAt]) =>
      id !== tabId && expiresAt > now,
    )

    writePresenceTabs(tabs)

    if (!hasOtherOpenTab) {
      beaconPresence("offline")
    }
  }

  const markOnline = async () => {
    touchCurrentTab()

    try {
      await postPresence("online")
    }
    catch {
      // Presence is best-effort and should not interrupt navigation.
    }
  }

  void markOnline()

  const heartbeat = window.setInterval(() => {
    void markOnline()
  }, HEARTBEAT_INTERVAL_MS)

  window.addEventListener("pagehide", closeCurrentTab)
  window.addEventListener("beforeunload", closeCurrentTab)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void markOnline()
    }
  })

  window.addEventListener("unload", () => {
    window.clearInterval(heartbeat)
  })
})
