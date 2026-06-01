// English description: Pinia store that keeps notification count, list, realtime socket state, and polling fallback in sync.

import { defineStore } from "pinia"
import { computed, ref, shallowRef } from "vue"
import type { Socket } from "socket.io-client"
import type { NotificationItem, NotificationSummary } from "../../domain/types/notification.types"
import { createApiNotificationsRepository } from "../../infrastructure/repositories/ApiNotificationsRepository"

const emptySummary = (): NotificationSummary => ({
  items: [],
  unreadCount: 0,
  hasMore: false,
  nextOffset: null,
})

const POLLING_INTERVAL_MS = 10000
type HeaderRefreshTarget = "navigation" | "requests"
type HeaderRefreshHandler = (target: HeaderRefreshTarget) => void | Promise<void>

export const useNotificationCenterStore = defineStore("notification-center", () => {
  const summary = ref<NotificationSummary>(emptySummary())
  const loading = ref(false)
  const hydrated = ref(false)
  const connected = ref(false)
  const connecting = ref(false)
  const lastEventAt = ref<number | null>(null)
  const errorMessage = ref("")
  const soundEnabled = ref(true)
  const realtimeUnavailable = ref(false)
  const socket = shallowRef<Socket | null>(null)
  const pollTimer = shallowRef<ReturnType<typeof window.setInterval> | null>(null)
  const headerRefreshHandlers = new Set<HeaderRefreshHandler>()

  const items = computed<NotificationItem[]>(() => summary.value.items)
  const unreadCount = computed(() => summary.value.unreadCount)

  const applySummary = (nextSummary: NotificationSummary) => {
    summary.value = {
      items: Array.isArray(nextSummary.items) ? nextSummary.items : [],
      unreadCount: Number(nextSummary.unreadCount || 0),
      hasMore: nextSummary.hasMore === true,
      nextOffset: nextSummary.nextOffset || null,
    }
  }

  const notifyHeaderRefresh = async (target: HeaderRefreshTarget) => {
    await Promise.allSettled(
      Array.from(headerRefreshHandlers).map(handler => handler(target)),
    )
  }

  function subscribeHeaderRefresh(handler: HeaderRefreshHandler) {
    headerRefreshHandlers.add(handler)

    return () => {
      headerRefreshHandlers.delete(handler)
    }
  }

  async function hydrate(force = false) {
    if (loading.value) {
      return summary.value
    }

    if (hydrated.value && !force) {
      return summary.value
    }

    loading.value = true
    errorMessage.value = ""

    try {
      const repository = createApiNotificationsRepository()
      applySummary(await repository.getSummary())
      await notifyHeaderRefresh("navigation")
      hydrated.value = true
      return summary.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to load notifications."
      hydrated.value = true
      return summary.value
    }
    finally {
      loading.value = false
    }
  }

  const stopPolling = () => {
    if (import.meta.client && pollTimer.value) {
      window.clearInterval(pollTimer.value)
      pollTimer.value = null
    }
  }

  const startPolling = () => {
    if (!import.meta.client || pollTimer.value) {
      return
    }

    pollTimer.value = window.setInterval(() => {
      if (realtimeUnavailable.value) {
        void connectSocket(true)
      }

      if (!connected.value) {
        void hydrate(true)
      }
    }, POLLING_INTERVAL_MS)
  }

  async function refreshFromRealtimeEvent(options: { showToast?: boolean } = {}) {
    const previousItemIds = new Set(summary.value.items.map(item => item.id))
    lastEventAt.value = Date.now()
    await hydrate(true)

    if (options.showToast !== false && import.meta.client) {
      const newestItem = summary.value.items.find(item => item.isUnread && !previousItemIds.has(item.id))

      if (newestItem) {
        const toast = useToast()
        toast.add({
          title: newestItem.title,
          description: newestItem.body,
          icon: newestItem.icon,
          color: "primary",
        })
      }
    }
  }

  async function connectSocket(allowRetry = false) {
    if (!import.meta.client || socket.value || connecting.value || (realtimeUnavailable.value && allowRetry !== true)) {
      return
    }

    const runtimeConfig = useRuntimeConfig()
    const realtimeUrl = String(runtimeConfig.public.realtimeUrl || "").trim()

    if (!realtimeUrl) {
      realtimeUnavailable.value = true
      startPolling()
      return
    }

    connecting.value = true

    try {
      const repository = createApiNotificationsRepository()
      const auth = await repository.getRealtimeToken()

      if (!auth.enabled || !auth.token || !auth.url) {
        realtimeUnavailable.value = true
        connected.value = false
        startPolling()
        return
      }

      const { io } = await import("socket.io-client")
      const realtimeSocket = io(auth.url, {
        auth: {
          token: auth.token,
        },
        transports: ["websocket"],
        timeout: 5000,
        reconnection: false,
      })

      realtimeSocket.on("connect", () => {
        connected.value = true
        realtimeUnavailable.value = false
        errorMessage.value = ""
      })

      realtimeSocket.on("disconnect", () => {
        connected.value = false
        socket.value = null
        startPolling()
      })

      realtimeSocket.on("connect_error", async () => {
        connected.value = false
        realtimeUnavailable.value = true
        socket.value = null
        realtimeSocket.disconnect()
        startPolling()

        try {
          const nextAuth = await repository.getRealtimeToken()
          if (nextAuth.enabled && nextAuth.token) {
            errorMessage.value = ""
          }
        }
        catch {
          // Polling keeps the badge fresh when realtime auth cannot refresh.
        }
      })

      realtimeSocket.on("notification:new", () => {
        void refreshFromRealtimeEvent()
      })

      realtimeSocket.on("notification:counts-changed", () => {
        void refreshFromRealtimeEvent({ showToast: false })
      })

      realtimeSocket.on("navigation:counts-changed", () => {
        void notifyHeaderRefresh("navigation")
      })

      realtimeSocket.on("request:new", () => {
        void notifyHeaderRefresh("navigation")
        void notifyHeaderRefresh("requests")
      })

      realtimeSocket.on("group-chat-request:new", () => {
        void notifyHeaderRefresh("navigation")
        void notifyHeaderRefresh("requests")
      })

      realtimeSocket.on("messages:count", () => {
        void notifyHeaderRefresh("navigation")
      })

      socket.value = realtimeSocket
      startPolling()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Realtime notifications are unavailable."
      connected.value = false
      realtimeUnavailable.value = true
      socket.value = null
      startPolling()
    }
    finally {
      connecting.value = false
    }
  }

  async function startRealtime() {
    if (!import.meta.client) {
      return
    }

    realtimeUnavailable.value = false
    await hydrate()
    await connectSocket()
    startPolling()
  }

  function stopRealtime() {
    stopPolling()

    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }

    connected.value = false
    connecting.value = false
  }

  async function markRead() {
    const previousSummary = summary.value
    summary.value = {
      ...summary.value,
      items: summary.value.items.map(item => ({
        ...item,
        isUnread: false,
      })),
      unreadCount: 0,
    }
    hydrated.value = true
    void notifyHeaderRefresh("navigation")

    try {
      const repository = createApiNotificationsRepository()
      const nextSummary = await repository.markRead()
      applySummary({
        ...nextSummary,
        items: nextSummary.items.map(item => ({
          ...item,
          isUnread: false,
        })),
        unreadCount: 0,
      })
      await notifyHeaderRefresh("navigation")
    }
    catch (error) {
      summary.value = previousSummary
      errorMessage.value = error instanceof Error ? error.message : "Unable to mark notifications as read."
      await notifyHeaderRefresh("navigation")
    }
  }

  async function markOneRead(id: string | number) {
    const normalizedId = String(id)

    if (!normalizedId) {
      return
    }

    const targetItem = summary.value.items.find(item => item.id === normalizedId)

    if (!targetItem?.isUnread) {
      return
    }

    try {
      const repository = createApiNotificationsRepository()
      applySummary(await repository.markOneRead(normalizedId))
      await notifyHeaderRefresh("navigation")
      hydrated.value = true
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to mark notification as read."
    }
  }

  async function deleteNotification(id: string | number) {
    const normalizedId = String(id)

    if (!normalizedId) {
      return
    }

    try {
      const repository = createApiNotificationsRepository()
      await repository.deleteNotification(normalizedId)
      summary.value = {
        ...summary.value,
        items: summary.value.items.filter(item => item.id !== normalizedId),
        unreadCount: Math.max(0, summary.value.unreadCount - (summary.value.items.find(item => item.id === normalizedId)?.isUnread ? 1 : 0)),
      }
      await notifyHeaderRefresh("navigation")
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to delete notification."
    }
  }

  async function toggleSound() {
    try {
      const repository = createApiNotificationsRepository()
      const response = await repository.toggleSound()
      soundEnabled.value = response.soundEnabled
      return response
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to update notification sound."
      return { soundEnabled: soundEnabled.value }
    }
  }

  return {
    summary,
    items,
    unreadCount,
    loading,
    hydrated,
    connected,
    connecting,
    lastEventAt,
    errorMessage,
    soundEnabled,
    hydrate,
    startRealtime,
    stopRealtime,
    markRead,
    markOneRead,
    deleteNotification,
    toggleSound,
    subscribeHeaderRefresh,
  }
})
