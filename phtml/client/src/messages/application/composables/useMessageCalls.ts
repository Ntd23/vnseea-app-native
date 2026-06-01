// Description: Coordinates one-to-one message call state, PHP call polling, and LiveKit sessions.

import type { Ref } from "vue"
import type {
  MessageCallSession,
  MessageCallStatus,
  MessageCallType,
} from "../../domain/types/calls.types"
import type { MessageContact } from "../../domain/types/messages.types"
import { createApiMessageCallsRepository } from "../../infrastructure/repositories/ApiMessageCallsRepository"

type RingingCall = {
  id: number
  type: MessageCallType
  direction: "incoming" | "outgoing"
  peer: {
    name: string
    avatar?: string
  }
}

type RingingGroupCall = {
  id: number
  type: MessageCallType
  direction: "incoming" | "outgoing"
  groupId: number
  groupName: string
  avatar?: string
  url?: string
}

type ActiveGroupCall = {
  id: number
  type: MessageCallType
}

type MessageCallOptions = {
  pollIncoming?: boolean | Ref<boolean>
}

const POLL_INTERVAL_MS = 2000
const INCOMING_POLL_INTERVAL_MS = 5000
const NO_ANSWER_MS = 43000
let outgoingPoll: ReturnType<typeof setInterval> | null = null
let incomingPoll: ReturnType<typeof setInterval> | null = null
let noAnswerTimer: ReturnType<typeof setTimeout> | null = null
let incomingPollPending = false
let incomingPollingConsumers = 0
let nextIncomingPollType: MessageCallType = "video"

export function useMessageCalls(
  repository = createApiMessageCallsRepository(),
  options: MessageCallOptions = {},
) {
  const ringingCall = useState<RingingCall | null>("messages:call:ringing", () => null)
  const activeSession = useState<MessageCallSession | null>("messages:call:active", () => null)
  const activeGroupCall = useState<ActiveGroupCall | null>("messages:group-call:active", () => null)
  const ringingGroupCall = useState<RingingGroupCall | null>("messages:group-call:ringing", () => null)
  const status = useState<MessageCallStatus>("messages:call:status", () => "idle")
  const errorMessage = useState("messages:call:error", () => "")
  const isCallActionPending = useState("messages:call:pending", () => false)
  const shouldPollIncoming = computed(() =>
    typeof options.pollIncoming === "object"
      ? Boolean(options.pollIncoming.value)
      : Boolean(options.pollIncoming),
  )

  const clearOutgoingTimers = () => {
    if (outgoingPoll) {
      clearInterval(outgoingPoll)
      outgoingPoll = null
    }
    if (noAnswerTimer) {
      clearTimeout(noAnswerTimer)
      noAnswerTimer = null
    }
  }

  const resetRinging = () => {
    clearOutgoingTimers()
    ringingCall.value = null
    if (!activeSession.value) {
      status.value = "idle"
    }
  }

  const endBackendCall = async (input: { id: number, type: MessageCallType, status: string, duration?: number }) => {
    await repository.endCall(input).catch(() => null)
  }

  const fetchPayload = async (id: number, type: MessageCallType) => {
    status.value = "connecting"
    const session = await repository.getSessionPayload({ id, type })
    activeSession.value = session
    ringingCall.value = null
    status.value = "active"
  }

  const pollOutgoingAnswer = (id: number, type: MessageCallType) => {
    clearOutgoingTimers()
    outgoingPoll = setInterval(async () => {
      const result = await repository.getOutgoingStatus({ id, type }).catch(() => null)

      if (!result) {
        return
      }

      if (result.status === 200) {
        clearOutgoingTimers()
        await fetchPayload(id, type).catch((error) => {
          errorMessage.value = error?.statusMessage || "Can not join call."
          status.value = "error"
        })
      }
      else if (result.status === 400) {
        clearOutgoingTimers()
        ringingCall.value = null
        status.value = "declined"
      }
    }, POLL_INTERVAL_MS)

    noAnswerTimer = setTimeout(async () => {
      clearOutgoingTimers()
      await endBackendCall({ id, type, status: "no_answer" })
      ringingCall.value = null
      status.value = "no_answer"
    }, NO_ANSWER_MS)
  }

  const startCall = async (contact: MessageContact, type: MessageCallType) => {
    if (!contact.userId || isCallActionPending.value || ringingCall.value || activeSession.value || activeGroupCall.value) {
      return
    }

    isCallActionPending.value = true
    errorMessage.value = ""

    try {
      const result = await repository.createCall({
        userId: contact.userId,
        type,
      })

      if (result.busy || result.id <= 0) {
        status.value = "busy"
        errorMessage.value = result.message || "Recipient is busy."
        return
      }

      status.value = "ringing"
      ringingCall.value = {
        id: result.id,
        type,
        direction: "outgoing",
        peer: {
          name: contact.name,
          avatar: contact.avatarUrl,
        },
      }
      pollOutgoingAnswer(result.id, type)
    }
    catch (error: any) {
      status.value = "error"
      errorMessage.value = error?.statusMessage || "Can not start call."
    }
    finally {
      isCallActionPending.value = false
    }
  }

  const startGroupCall = async (contact: MessageContact, type: MessageCallType) => {
    if (!contact.groupId || contact.type !== "group" || isCallActionPending.value || activeGroupCall.value) {
      return
    }

    isCallActionPending.value = true
    errorMessage.value = ""

    try {
      const result = await repository.createGroupCall({
        groupId: contact.groupId,
        type,
      })

      if (result.status !== 200 || result.id <= 0) {
        status.value = "error"
        errorMessage.value = "Can not start group call."
        return
      }

      ringingGroupCall.value = null
      activeGroupCall.value = {
        id: result.id,
        type: result.type,
      }
      status.value = "active"
    }
    catch (error: any) {
      status.value = "error"
      errorMessage.value = error?.statusMessage || "Can not start group call."
    }
    finally {
      isCallActionPending.value = false
    }
  }

  const answerIncomingCall = async () => {
    const call = ringingCall.value

    if (!call || call.direction !== "incoming" || isCallActionPending.value) {
      return
    }

    isCallActionPending.value = true
    errorMessage.value = ""

    try {
      status.value = "connecting"
      const session = await repository.answerCall({
        id: call.id,
        type: call.type,
      })
      activeSession.value = session
      ringingCall.value = null
      status.value = "active"
    }
    catch (error: any) {
      status.value = "error"
      errorMessage.value = error?.statusMessage || "Can not answer call."
    }
    finally {
      isCallActionPending.value = false
    }
  }

  const declineIncomingCall = async () => {
    const call = ringingCall.value

    if (!call) {
      return
    }

    clearOutgoingTimers()
    await repository.declineCall({
      id: call.id,
      type: call.type,
    }).catch(() => null)
    ringingCall.value = null
    status.value = "declined"
  }

  const cancelOutgoingCall = async () => {
    const call = ringingCall.value

    if (!call) {
      return
    }

    clearOutgoingTimers()
    await endBackendCall({ id: call.id, type: call.type, status: "cancelled" })
    ringingCall.value = null
    status.value = "idle"
  }

  const finishActiveCall = async (duration = 0) => {
    const session = activeSession.value

    if (!session) {
      return
    }

    await endBackendCall({
      id: session.id,
      type: session.type,
      status: "ended",
      duration,
    })
    activeSession.value = null
    status.value = "ended"
  }

  const pollIncoming = async (type: MessageCallType) => {
    if (ringingCall.value || ringingGroupCall.value || activeSession.value || activeGroupCall.value) {
      return
    }

    const incoming = await repository.getIncomingCall(type).catch(() => null)

    if (!incoming?.id) {
      return
    }

    ringingCall.value = {
      id: incoming.id,
      type: incoming.type,
      direction: "incoming",
      peer: {
        name: incoming.peer.name,
        avatar: incoming.peer.avatar,
      },
    }
    status.value = "ringing"
  }

  const validateCurrentIncomingCall = async () => {
    const call = ringingCall.value

    if (!call || call.direction !== "incoming") {
      return false
    }

    const incoming = await repository.getIncomingCall(call.type).catch(() => null)

    if (activeSession.value) {
      return true
    }

    if (!incoming || incoming.id !== call.id) {
      ringingCall.value = null
      status.value = "idle"
      return false
    }

    return true
  }

  const pollIncomingTypes = async () => {
    if (incomingPollPending || activeSession.value || activeGroupCall.value || (import.meta.client && document.visibilityState === "hidden")) {
      return
    }

    incomingPollPending = true

    try {
      if (ringingCall.value?.direction === "incoming") {
        const stillRinging = await validateCurrentIncomingCall()
        if (stillRinging) {
          return
        }
      }

      if (ringingCall.value) {
        return
      }

      const type = nextIncomingPollType
      nextIncomingPollType = type === "video" ? "audio" : "video"
      await pollIncoming(type)

      if (!ringingCall.value && !ringingGroupCall.value && !activeSession.value && !activeGroupCall.value) {
        const incomingGroup = await repository.getIncomingGroupCall().catch(() => null)

        if (incomingGroup?.id) {
          ringingGroupCall.value = {
            id: incomingGroup.id,
            type: incomingGroup.type,
            direction: "incoming",
            groupId: incomingGroup.groupId,
            groupName: incomingGroup.groupName,
            avatar: incomingGroup.avatar,
            url: incomingGroup.url,
          }
          status.value = "ringing"
        }
      }
    }
    finally {
      incomingPollPending = false
    }
  }

  let ownsIncomingPolling = false

  const startIncomingPolling = () => {
    if (!import.meta.client) {
      return
    }

    if (!ownsIncomingPolling) {
      incomingPollingConsumers += 1
      ownsIncomingPolling = true
    }

    if (incomingPoll) {
      return
    }

    void pollIncomingTypes()
    incomingPoll = setInterval(() => {
      void pollIncomingTypes()
    }, INCOMING_POLL_INTERVAL_MS)
  }

  const stopIncomingPolling = () => {
    if (!ownsIncomingPolling) {
      return
    }

    ownsIncomingPolling = false
    incomingPollingConsumers = Math.max(0, incomingPollingConsumers - 1)

    if (incomingPollingConsumers === 0 && incomingPoll) {
      clearInterval(incomingPoll)
      incomingPoll = null
    }
  }

  const answerGroupCall = async () => {
    const call = ringingGroupCall.value

    if (!call || isCallActionPending.value) {
      return
    }

    isCallActionPending.value = true
    errorMessage.value = ""

    try {
      const result = await repository.joinGroupCall({ id: call.id })

      if (result.status !== 200 || result.id <= 0) {
        status.value = "error"
        errorMessage.value = "Can not join group call."
        return
      }

      ringingGroupCall.value = null
      activeGroupCall.value = {
        id: result.id,
        type: result.type,
      }
      status.value = "active"
    }
    catch (error: any) {
      status.value = "error"
      errorMessage.value = error?.statusMessage || "Can not join group call."
    }
    finally {
      isCallActionPending.value = false
    }
  }

  const joinGroupCall = async (callId: number) => {
    if (!callId || isCallActionPending.value) {
      return
    }

    isCallActionPending.value = true
    errorMessage.value = ""

    try {
      const result = await repository.joinGroupCall({ id: callId })

      if (result.status !== 200 || result.id <= 0) {
        status.value = "error"
        errorMessage.value = "Can not join group call."
        return
      }

      activeGroupCall.value = {
        id: result.id,
        type: result.type,
      }
      status.value = "active"
    }
    catch (error: any) {
      status.value = "error"
      errorMessage.value = error?.statusMessage || "Can not join group call."
    }
    finally {
      isCallActionPending.value = false
    }
  }

  const declineGroupCall = async () => {
    const call = ringingGroupCall.value

    if (!call) {
      return
    }

    await repository.declineGroupCall({ id: call.id }).catch(() => null)
    ringingGroupCall.value = null
    status.value = "declined"
  }

  const cancelGroupCall = async () => {
    const call = ringingGroupCall.value

    if (!call) {
      return
    }

    await repository.leaveGroupCall({ id: call.id }).catch(() => null)
    clearOutgoingTimers()
    ringingGroupCall.value = null
    status.value = "idle"
  }

  const finishGroupCall = () => {
    activeGroupCall.value = null
    status.value = "ended"
  }

  let stopPollingWatch: (() => void) | null = null

  onMounted(() => {
    if (shouldPollIncoming.value) {
      startIncomingPolling()
    }

    stopPollingWatch = watch(shouldPollIncoming, (enabled) => {
      if (enabled) {
        startIncomingPolling()
        return
      }

      stopIncomingPolling()
    })
  })

  onBeforeUnmount(() => {
    if (stopPollingWatch) {
      stopPollingWatch()
      stopPollingWatch = null
    }
    stopIncomingPolling()
    clearOutgoingTimers()
  })

  return {
    activeSession,
    activeGroupCall,
    answerGroupCall,
    answerIncomingCall,
    cancelOutgoingCall,
    cancelGroupCall,
    declineGroupCall,
    declineIncomingCall,
    errorMessage,
    finishActiveCall,
    finishGroupCall,
    isCallActionPending,
    joinGroupCall,
    resetRinging,
    ringingGroupCall,
    ringingCall,
    startCall,
    startGroupCall,
    status,
  }
}
