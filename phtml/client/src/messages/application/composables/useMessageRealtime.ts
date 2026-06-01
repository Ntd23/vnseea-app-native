// English description: Synchronizes messages inbox, active threads, and typing state through Socket.IO with status-sync fallback for the active user thread.

import { computed, ref, shallowRef, watch } from "vue"
import type { Ref } from "vue"
import type { Socket } from "socket.io-client"
import type { MessagesRepository } from "../../domain/repositories/MessagesRepository"
import type { MessageContact, MessageTabKey } from "../../domain/types/messages.types"

const POLLING_INTERVAL_MS = 10000
const TYPING_IDLE_TIMEOUT_MS = 2400
const TYPING_HEARTBEAT_INTERVAL_MS = 1800
const TYPING_STATUS_SYNC_INTERVAL_MS = 2000

type MessageRealtimeOptions = {
  repository: MessagesRepository
  activeTab: Ref<MessageTabKey>
  selectedContact: Ref<MessageContact | null>
  refreshInbox: () => Promise<unknown>
  refreshThread: () => Promise<unknown>
  setRemoteTyping: (value: boolean, userId?: number) => void
  setGroupContactTyping: (groupId: number, value: boolean) => void
  setUserContactTyping: (userId: number, value: boolean) => void
}

type TypingTarget = {
  key: string
  type: "user" | "group"
  userId: number
  groupId: number
}

type TypingPayload = {
  senderId?: number | string
  userId?: number | string
  recipientId?: number | string
  groupId?: number | string
}

export function useMessageRealtime(options: MessageRealtimeOptions) {
  const connected = ref(false)
  const connecting = ref(false)
  const pollingFallbackActive = ref(false)
  const socket = shallowRef<Socket | null>(null)
  const pollTimer = shallowRef<ReturnType<typeof window.setInterval> | null>(null)
  const typingIdleTimer = shallowRef<ReturnType<typeof window.setTimeout> | null>(null)
  const typingHeartbeatTimer = shallowRef<ReturnType<typeof window.setInterval> | null>(null)
  const typingStatusTimer = shallowRef<ReturnType<typeof window.setInterval> | null>(null)
  const remoteTypingTimers = shallowRef<Map<string, ReturnType<typeof window.setTimeout>>>(new Map())
  const activeTypingTargetKey = ref("")

  const isUserThread = computed(() =>
    options.activeTab.value === "user"
    && options.selectedContact.value?.type === "user"
    && (options.selectedContact.value.userId ?? 0) > 0,
  )

  const isGroupThread = computed(() =>
    options.activeTab.value === "group"
    && options.selectedContact.value?.type === "group"
    && (options.selectedContact.value.groupId ?? 0) > 0,
  )

  const resolveTypingTarget = (contact?: MessageContact | null): TypingTarget | null => {
    if (!contact) {
      return null
    }

    if (contact.type === "user" && (contact.userId ?? 0) > 0) {
      const userId = contact.userId ?? 0

      return {
        key: `user:${userId}`,
        type: "user",
        userId,
        groupId: 0,
      }
    }

    if (contact.type === "group" && (contact.groupId ?? 0) > 0) {
      const groupId = contact.groupId ?? 0

      return {
        key: `group:${groupId}`,
        type: "group",
        userId: 0,
        groupId,
      }
    }

    return null
  }

  const selectedTypingTarget = computed(() =>
    resolveTypingTarget(options.selectedContact.value),
  )

  const setTargetTyping = (target: TypingTarget, value: boolean) => {
    if (target.type === "group") {
      options.setGroupContactTyping(target.groupId, value)
    }
    else {
      options.setUserContactTyping(target.userId, value)
    }
  }

  const isSelectedTarget = (target: TypingTarget) =>
    selectedTypingTarget.value?.key === target.key

  const clearTypingIdleTimer = () => {
    if (import.meta.client && typingIdleTimer.value) {
      window.clearTimeout(typingIdleTimer.value)
      typingIdleTimer.value = null
    }
  }

  const clearRemoteTypingTimer = (targetKey: string) => {
    if (!import.meta.client || !targetKey) {
      return
    }

    const timer = remoteTypingTimers.value.get(targetKey)

    if (timer) {
      window.clearTimeout(timer)
      remoteTypingTimers.value.delete(targetKey)
    }
  }

  const clearTypingHeartbeatTimer = () => {
    if (import.meta.client && typingHeartbeatTimer.value) {
      window.clearInterval(typingHeartbeatTimer.value)
      typingHeartbeatTimer.value = null
    }
  }

  const sendTypingHeartbeat = async (target: TypingTarget) => {
    if (target.type === "user") {
      try {
        await options.repository.setTyping(target.userId)
      }
      catch {
        // Silent: typing is auxiliary state.
      }

      socket.value?.emit("message:typing", {
        recipientId: target.userId,
      })

      return
    }

    try {
      await options.repository.setGroupTyping(target.groupId)
    }
    catch {
      // Silent: typing is auxiliary state.
    }

    socket.value?.emit("message:typing", {
      groupId: target.groupId,
    })
  }

  const scheduleRemoteTypingExpiry = (target: TypingTarget) => {
    if (!import.meta.client) {
      return
    }

    clearRemoteTypingTimer(target.key)

    const timer = window.setTimeout(() => {
      setTargetTyping(target, false)

      if (isSelectedTarget(target)) {
        options.setRemoteTyping(false)
      }

      remoteTypingTimers.value.delete(target.key)
    }, TYPING_IDLE_TIMEOUT_MS + 1000)

    remoteTypingTimers.value.set(target.key, timer)
  }

  const stopTypingStatusSync = () => {
    if (import.meta.client && typingStatusTimer.value) {
      window.clearInterval(typingStatusTimer.value)
      typingStatusTimer.value = null
    }
  }

  const stopPolling = () => {
    if (import.meta.client && pollTimer.value) {
      window.clearInterval(pollTimer.value)
      pollTimer.value = null
    }
  }

  const refreshActiveThread = async () => {
    if (options.activeTab.value === "multi" || !options.selectedContact.value) {
      return
    }

    await options.refreshThread()
  }

  const refreshFromIncomingMessage = async () => {
    await options.refreshInbox()
    await refreshActiveThread()
  }

  const startPolling = () => {
    if (!import.meta.client || pollTimer.value) {
      return
    }

    pollingFallbackActive.value = true
    pollTimer.value = window.setInterval(() => {
      if (!connected.value) {
        void refreshFromIncomingMessage()
        void connectSocket(true)
      }
    }, POLLING_INTERVAL_MS)
  }

  const connectSocket = async (allowRetry = false) => {
    if (!import.meta.client || socket.value || connecting.value) {
      return
    }

    if (pollingFallbackActive.value && !allowRetry) {
      return
    }

    connecting.value = true

    try {
      const auth = await options.repository.getRealtimeToken()

      if (!auth.enabled || !auth.token || !auth.url) {
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
        pollingFallbackActive.value = false
        stopPolling()
        
        const sessionHash = useCookie("user_id").value
        if (sessionHash) {
          realtimeSocket.emit("join", { user_id: sessionHash })
        }
      })

      realtimeSocket.on("disconnect", () => {
        connected.value = false
        socket.value = null
        startPolling()
      })

      realtimeSocket.on("connect_error", () => {
        connected.value = false
        socket.value = null
        realtimeSocket.disconnect()
        startPolling()
      })

      realtimeSocket.on("messages:count", () => {
        void refreshFromIncomingMessage()
      })

      realtimeSocket.on("message:typing", (payload: TypingPayload = {}) => {
        const groupId = Number(payload.groupId || 0)
        const senderId = Number(payload.senderId || payload.userId || 0)
        const target = groupId > 0
          ? {
              key: `group:${groupId}`,
              type: "group" as const,
              userId: senderId,
              groupId,
            }
          : {
              key: `user:${senderId}`,
              type: "user" as const,
              userId: senderId,
              groupId: 0,
            }

        if ((target.type === "user" && target.userId <= 0) || (target.type === "group" && target.groupId <= 0)) {
          return
        }

        setTargetTyping(target, true)
        scheduleRemoteTypingExpiry(target)

        if (isSelectedTarget(target)) {
          options.setRemoteTyping(true, target.userId)
        }
      })

      realtimeSocket.on("message:typing-stop", (payload: TypingPayload = {}) => {
        const groupId = Number(payload.groupId || 0)
        const senderId = Number(payload.senderId || payload.userId || 0)
        const target = groupId > 0
          ? {
              key: `group:${groupId}`,
              type: "group" as const,
              userId: senderId,
              groupId,
            }
          : {
              key: `user:${senderId}`,
              type: "user" as const,
              userId: senderId,
              groupId: 0,
            }

        if ((target.type === "user" && target.userId <= 0) || (target.type === "group" && target.groupId <= 0)) {
          return
        }

        clearRemoteTypingTimer(target.key)
        setTargetTyping(target, false)

        if (isSelectedTarget(target)) {
          options.setRemoteTyping(false)
        }
      })

      socket.value = realtimeSocket
    }
    catch {
      connected.value = false
      socket.value = null
      startPolling()
    }
    finally {
      connecting.value = false
    }
  }

  const syncTypingState = async (userId: number) => {
    if (userId <= 0) {
      options.setRemoteTyping(false)
      return
    }

    try {
      const status = await options.repository.getTyping(userId)
      const typing = status.enabled && status.typing
      const target = {
        key: `user:${userId}`,
        type: "user" as const,
        userId,
        groupId: 0,
      }

      options.setRemoteTyping(typing, userId)
      options.setUserContactTyping(userId, typing)

      if (typing) {
        scheduleRemoteTypingExpiry(target)
      }
      else {
        clearRemoteTypingTimer(target.key)
      }
    }
    catch {
      options.setRemoteTyping(false)
      options.setUserContactTyping(userId, false)
      clearRemoteTypingTimer(`user:${userId}`)
    }
  }

  const syncGroupTypingState = async (groupId: number) => {
    if (groupId <= 0) {
      options.setRemoteTyping(false)
      return
    }

    try {
      const status = await options.repository.getGroupTyping(groupId)
      const typing = status.enabled && status.typing
      const target = {
        key: `group:${groupId}`,
        type: "group" as const,
        userId: status.activeUserIds?.[0] ?? 0,
        groupId,
      }

      options.setRemoteTyping(typing, target.userId)
      options.setGroupContactTyping(groupId, typing)

      if (typing) {
        scheduleRemoteTypingExpiry(target)
      }
      else {
        clearRemoteTypingTimer(target.key)
      }
    }
    catch {
      options.setRemoteTyping(false)
      options.setGroupContactTyping(groupId, false)
      clearRemoteTypingTimer(`group:${groupId}`)
    }
  }

  const startTypingStatusSync = () => {
    if (!import.meta.client || typingStatusTimer.value || (!isUserThread.value && !isGroupThread.value)) {
      return
    }

    const userId = options.selectedContact.value?.userId ?? 0
    const groupId = options.selectedContact.value?.groupId ?? 0

    if (isUserThread.value && userId <= 0) {
      options.setRemoteTyping(false)
      return
    }

    if (isGroupThread.value && groupId <= 0) {
      options.setRemoteTyping(false)
      return
    }

    if (isUserThread.value) {
      void syncTypingState(userId)
    }
    else {
      void syncGroupTypingState(groupId)
    }

    typingStatusTimer.value = window.setInterval(() => {
      const activeUserId = options.selectedContact.value?.userId ?? 0
      const activeGroupId = options.selectedContact.value?.groupId ?? 0

      if (!isUserThread.value && !isGroupThread.value) {
        stopTypingStatusSync()
        options.setRemoteTyping(false)
        return
      }

      if (isUserThread.value && activeUserId > 0) {
        void syncTypingState(activeUserId)
      }
      else if (isGroupThread.value && activeGroupId > 0) {
        void syncGroupTypingState(activeGroupId)
      }
    }, TYPING_STATUS_SYNC_INTERVAL_MS)
  }

  const stopTyping = async (contact = options.selectedContact.value) => {
    clearTypingIdleTimer()
    clearTypingHeartbeatTimer()

    const target = resolveTypingTarget(contact)

    if (!target && !activeTypingTargetKey.value) {
      activeTypingTargetKey.value = ""
      return
    }

    const activeKey = target?.key || activeTypingTargetKey.value
    activeTypingTargetKey.value = ""

    if (target?.type === "user") {
      try {
        await options.repository.clearTyping(target.userId)
      }
      catch {
        // Silent: clearing typing should not block messaging.
      }
    }

    if (target?.type === "group") {
      try {
        await options.repository.clearGroupTyping(target.groupId)
      }
      catch {
        // Silent: clearing typing should not block messaging.
      }

      socket.value?.emit("message:typing-stop", { groupId: target.groupId })
      return
    }

    if (target?.type === "user") {
      socket.value?.emit("message:typing-stop", { recipientId: target.userId })
      return
    }

    const [type, rawId] = activeKey.split(":")
    const id = Number(rawId || 0)

    if (type === "group" && id > 0) {
      try {
        await options.repository.clearGroupTyping(id)
      }
      catch {
        // Silent: clearing typing should not block messaging.
      }

      socket.value?.emit("message:typing-stop", { groupId: id })
    }
    else if (type === "user" && id > 0) {
      socket.value?.emit("message:typing-stop", { recipientId: id })
    }
  }

  const startTyping = async (contact: MessageContact) => {
    const target = resolveTypingTarget(contact)

    if (!target) {
      return
    }

    clearTypingIdleTimer()

    if (activeTypingTargetKey.value === target.key) {
      return
    }

    if (activeTypingTargetKey.value) {
      await stopTyping(null)
    }

    activeTypingTargetKey.value = target.key
    await sendTypingHeartbeat(target)

    if (import.meta.client) {
      typingHeartbeatTimer.value = window.setInterval(() => {
        void sendTypingHeartbeat(target)
      }, TYPING_HEARTBEAT_INTERVAL_MS)
    }
  }

  const start = async () => {
    if (!import.meta.client) {
      return
    }

    await connectSocket()
    startTypingStatusSync()

    if (!connected.value) {
      startPolling()
    }
  }

  const stop = async () => {
    clearTypingIdleTimer()
    clearTypingHeartbeatTimer()
    stopTypingStatusSync()
    stopPolling()
    for (const targetKey of remoteTypingTimers.value.keys()) {
      clearRemoteTypingTimer(targetKey)
    }
    await stopTyping()

    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }

    connected.value = false
    connecting.value = false
    options.setRemoteTyping(false)
  }

  watch(
    () => [
      options.activeTab.value,
      options.selectedContact.value?.type || "",
      options.selectedContact.value?.userId || 0,
      options.selectedContact.value?.groupId || 0,
    ] as const,
    ([tab, type, userId]) => {
      stopTypingStatusSync()

      if (tab === "user" && type === "user" && userId > 0) {
        startTypingStatusSync()
        return
      }

      if (tab === "group" && type === "group") {
        startTypingStatusSync()
        return
      }

      options.setRemoteTyping(false)
    },
    { immediate: true },
  )

  return {
    connected,
    connecting,
    pollingFallbackActive,
    start,
    stop,
    startTyping,
    stopTyping,
    syncTypingState,
  }
}
