// English description: Orchestrates the right-sidebar chat widget with real inbox data, mini-thread loading, quick send actions, and user online presence refresh.

import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue"
import type { Socket } from "socket.io-client"
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"
import type { MessageContact, MessageItem, MessageRecordDraft, MessageSendDraft, MessageTagsPayload, MessageThread, MessageUserTag } from "../../../messages/domain/types/messages.types"
import type { MessagesRepository } from "../../../messages/domain/repositories/MessagesRepository"
import { createApiMessagesRepository } from "../../../messages/infrastructure/repositories/ApiMessagesRepository"

type ChatWidgetTab = "send" | "contacts" | "groups"
type MiniChatDraft = {
  tempId: number
  text: string
  file: File | null
  record: MessageRecordDraft | null
}
type MiniChatSession = {
  contactId: string
  message: string
  attachFile: File | null
  attachFilePreviewUrl?: string | null
  thread: MessageThread
  isLoading: boolean
  isLoadingMore: boolean
  isSending: boolean
  minimized: boolean
  openedAt: number
  sendQueue?: MiniChatDraft[]
}
type MiniChatSessionView = MiniChatSession & {
  contact: MessageContact
  messages: MessageItem[]
  canSend: boolean
}

const INBOX_REFRESH_INTERVAL_MS = 6000
const MAX_MINI_CHAT_SESSIONS = 2

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase()
}

function filterContacts(contacts: MessageContact[], keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword)

  if (!normalizedKeyword) {
    return contacts
  }

  return contacts.filter((contact) => {
    const searchable = [
      contact.name,
      contact.status,
      contact.preview,
      ...(contact.members ?? []),
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(normalizedKeyword)
  })
}

function mergeUserTags(left: MessageUserTag[] = [], right: MessageUserTag[] = []) {
  const tags = new Map<number, MessageUserTag>()

  for (const tag of [...left, ...right]) {
    if (tag.id > 0) {
      tags.set(tag.id, tag)
    }
  }

  return [...tags.values()]
}

function mergeContactTags(contact: MessageContact, taggedContact?: MessageContact) {
  if (!taggedContact) {
    return contact
  }

  return {
    ...contact,
    tags: mergeUserTags(contact.tags, taggedContact.tags),
  }
}

function createEmptyThread(): MessageThread {
  return {
    messages: [],
    typing: false,
  }
}

function sortMiniMessages(messages: MessageItem[]) {
  return [...messages].sort((left, right) => {
    const leftTimestamp = left.timestamp ?? 0
    const rightTimestamp = right.timestamp ?? 0

    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp
    }

    return left.id - right.id
  })
}

function decorateMiniMessages(messages: MessageItem[]) {
  return sortMiniMessages(messages).map((message, index, list) => {
    const nextMessage = list[index + 1]
    const previousMessage = list[index - 1]
    const isGroupThread = message.threadType === "group"
    const senderChangedFromPrevious = !previousMessage
      || previousMessage.isMine
      || previousMessage.senderId !== message.senderId
    const senderChangedToNext = !nextMessage
      || nextMessage.isMine !== message.isMine
      || (isGroupThread && !message.isMine && nextMessage.senderId !== message.senderId)

    return {
      ...message,
      isLast: senderChangedToNext,
      showAuthor: isGroupThread && !message.isMine && Boolean(message.authorName) && senderChangedFromPrevious,
      showTime: !previousMessage || Math.abs((message.timestamp ?? 0) - (previousMessage.timestamp ?? 0)) > 1800,
    }
  })
}

function formatLastSeenLabel(lastSeenAt: number | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (!lastSeenAt || lastSeenAt <= 0) {
    return ""
  }

  const diffInSeconds = Math.max(Math.floor(Date.now() / 1000) - lastSeenAt, 0)
  const minutes = Math.max(1, Math.floor(diffInSeconds / 60))

  if (minutes < 60) {
    return t("navigation.chatWidget.activeMinutesAgo", { count: minutes })
  }

  const hours = Math.max(1, Math.floor(minutes / 60))

  if (hours < 24) {
    return t("navigation.chatWidget.activeHoursAgo", { count: hours })
  }

  const days = Math.max(1, Math.floor(hours / 24))

  if (days < 7) {
    return t("navigation.chatWidget.activeDaysAgo", { count: days })
  }

  const weeks = Math.max(1, Math.floor(days / 7))

  if (weeks < 5) {
    return t("navigation.chatWidget.activeWeeksAgo", { count: weeks })
  }

  const months = Math.max(1, Math.floor(days / 30))

  if (months < 12) {
    return t("navigation.chatWidget.activeMonthsAgo", { count: months })
  }

  const years = Math.max(1, Math.floor(days / 365))
  return t("navigation.chatWidget.activeYearsAgo", { count: years })
}

function buildMessagesRouteQuery(contact?: MessageContact | null) {
  if (!contact) {
    return {}
  }

  if (contact.type === "group" && contact.groupId) {
    return {
      tab: "group",
      groupId: String(contact.groupId),
      name: contact.name,
    }
  }

  if (contact.type === "user" && contact.userId) {
    return {
      userId: String(contact.userId),
      name: contact.name,
    }
  }

  if (contact.type === "page" && contact.pageId && contact.recipientId) {
    return {
      userId: String(contact.recipientId),
      name: contact.name,
    }
  }

  return {}
}

const cachedInbox = ref<MessageContact[]>([])
const cachedTags = ref<MessageTagsPayload>({ labels: [], contacts: [] })
const cachedThreads = new Map<string, MessageThread>()

export function useChatWidgetVM(
  repository: MessagesRepository = createApiMessagesRepository(),
) {
  const { t } = useI18n()
  const router = useRouter()
  const toast = useToast()
  const nuxtApp = useNuxtApp()

  const activeTab = ref<ChatWidgetTab>("contacts")
  const search = ref("")
  const activeSendTagFilter = ref("")
  const sendTo = ref("")
  const sendMessage = ref("")
  const attachFile = ref<File | null>(null)
  const attachFilePreviewUrl = ref<string | null>(null)
  watch(attachFile, (newFile) => {
    if (attachFilePreviewUrl.value) {
      URL.revokeObjectURL(attachFilePreviewUrl.value)
      attachFilePreviewUrl.value = null
    }
    if (newFile && newFile.type.startsWith("image/")) {
      attachFilePreviewUrl.value = URL.createObjectURL(newFile)
    }
  })
  const selectedSendRecipientIds = ref<number[]>([])

  const miniChatAutoOpenVersion = ref(0)
  const miniChatSessions = ref<MiniChatSession[]>([])
  const isSendingQuick = ref(false)
  const socket = shallowRef<Socket | null>(null)
  const refreshTimer = shallowRef<number | null>(null)
  const unreadSnapshot = shallowRef<Map<string, { unreadCount: number, preview: string }>>(new Map())
  const hasUnreadSnapshot = ref(false)

  const {
    data: inbox,
    status: inboxStatus,
    refresh: refreshInboxData,
  } = useAsyncData(
    "navigation:chat-widget:inbox",
    async () => {
      const data = await repository.getInbox()
      if (import.meta.client) {
        cachedInbox.value = data
        try {
          sessionStorage.setItem("cache:chat-widget:inbox", JSON.stringify(data))
        }
        catch {}
      }
      return data
    },
    {
      default: () => {
        if (import.meta.client) {
          if (cachedInbox.value.length > 0) {
            return cachedInbox.value
          }
          try {
            const saved = sessionStorage.getItem("cache:chat-widget:inbox")
            if (saved) {
              const parsed = JSON.parse(saved)
              cachedInbox.value = parsed
              return parsed
            }
          }
          catch {}
        }
        return []
      },
      getCachedData(key) {
        if (cachedInbox.value.length > 0 && (!inbox || !inbox.value || inbox.value.length === 0)) {
          return cachedInbox.value
        }
        return undefined
      },
    },
  )
  const hasLoadedInboxOnce = computed(() => (inbox.value?.length ?? 0) > 0)

  const {
    data: messageTags,
  } = useAsyncData<MessageTagsPayload>(
    "navigation:chat-widget:tags",
    async () => {
      const data = await repository.getTags()
      if (import.meta.client) {
        cachedTags.value = data
        try {
          sessionStorage.setItem("cache:chat-widget:tags", JSON.stringify(data))
        }
        catch {}
      }
      return data
    },
    {
      default: () => {
        if (import.meta.client) {
          if (cachedTags.value.labels.length > 0 || cachedTags.value.contacts.length > 0) {
            return cachedTags.value
          }
          try {
            const saved = sessionStorage.getItem("cache:chat-widget:tags")
            if (saved) {
              const parsed = JSON.parse(saved)
              cachedTags.value = parsed
              return parsed
            }
          }
          catch {}
        }
        return { labels: [], contacts: [] }
      },
      getCachedData(key) {
        if ((cachedTags.value.labels.length > 0 || cachedTags.value.contacts.length > 0) && (!messageTags || !messageTags.value || (messageTags.value.labels.length === 0 && messageTags.value.contacts.length === 0))) {
          return cachedTags.value
        }
        return undefined
      },
    },
  )

  const allContacts = computed(() =>
    (inbox.value ?? []).filter(contact =>
      contact.type === "user" || contact.type === "group",
    ),
  )

  const userContacts = computed(() => {
    const taggedByUserId = new Map(
      (messageTags.value?.contacts ?? [])
        .map(contact => [contact.userId ?? 0, contact] as const)
        .filter(([id]) => id > 0),
    )

    return allContacts.value
      .filter(contact => contact.type === "user")
      .map(contact => mergeContactTags(contact, taggedByUserId.get(contact.userId ?? 0)))
  })

  const groupContacts = computed(() =>
    allContacts.value.filter(contact => contact.type === "group"),
  )

  const onlineCount = computed(() =>
    userContacts.value.filter(contact => contact.isOnline).length,
  )

  const filteredContacts = computed(() =>
    filterContacts(userContacts.value, search.value),
  )

  const filteredGroups = computed(() =>
    filterContacts(groupContacts.value, search.value),
  )

  const taggedSendRecipientSource = computed(() => {
    const contactsByUserId = new Map<number, MessageContact>()

    for (const contact of messageTags.value?.contacts ?? []) {
      const userId = contact.userId ?? 0

      if (userId <= 0) {
        continue
      }

      const current = contactsByUserId.get(userId)
      contactsByUserId.set(userId, current ? mergeContactTags(current, contact) : contact)
    }

    return [...contactsByUserId.values()]
  })

  const sendRecipientSource = computed(() => {
    const tagId = activeSendTagFilter.value
    const baseContacts = tagId ? taggedSendRecipientSource.value : userContacts.value

    if (!tagId || tagId === "0") {
      return baseContacts
    }

    const selectedTagId = Number(tagId)

    return baseContacts.filter(contact =>
      contact.tags?.some(tag => tag.id === selectedTagId),
    )
  })

  const sendCandidates = computed(() => {
    const filtered = filterContacts(sendRecipientSource.value, sendTo.value)

    return filtered
  })

  const selectedSendRecipients = computed(() => {
    const selectedIds = new Set(selectedSendRecipientIds.value)

    return sendRecipientSource.value.filter(contact =>
      selectedIds.has(contact.userId ?? 0),
    )
  })

  const activeMiniSession = computed(() =>
    miniChatSessions.value.find(session => !session.minimized) ?? miniChatSessions.value[0] ?? null,
  )
  const activeMiniContact = computed(() =>
    activeMiniSession.value
      ? allContacts.value.find(contact => contact.id === activeMiniSession.value?.contactId) ?? null
      : null,
  )
  const miniChatOpen = computed(() => miniChatSessions.value.length > 0)
  const miniChatMessage = computed({
    get: () => activeMiniSession.value?.message ?? "",
    set: (value: string) => {
      if (activeMiniSession.value) {
        activeMiniSession.value.message = value
      }
    },
  })
  const miniAttachFile = computed({
    get: () => activeMiniSession.value?.attachFile ?? null,
    set: (value: File | null) => {
      if (activeMiniSession.value) {
        activeMiniSession.value.attachFile = value
      }
    },
  })
  const miniMessages = computed<MessageItem[]>(() =>
    activeMiniSession.value ? decorateMiniMessages(activeMiniSession.value.thread.messages) : [],
  )
  const isLoadingThread = computed(() => Boolean(activeMiniSession.value?.isLoading))
  const isSendingMini = computed(() => Boolean(activeMiniSession.value?.isSending))
  const miniChatSessionsView = computed<MiniChatSessionView[]>(() => {
    const sessions: MiniChatSessionView[] = []

    for (const session of miniChatSessions.value) {
      const contact = allContacts.value.find(item => item.id === session.contactId) ?? null

      if (!contact) {
        continue
      }

      sessions.push(Object.assign(session, {
        contact,
        messages: decorateMiniMessages(session.thread.messages),
        canSend: Boolean(contact)
          && (session.message.trim().length > 0 || Boolean(session.attachFile))
          && !session.isSending,
      }))
    }

    return sessions
  })

  const visibleSendRecipientIds = computed(() =>
    sendCandidates.value
      .map(contact => contact.userId ?? 0)
      .filter(id => id > 0),
  )

  const allVisibleSendRecipientsSelected = computed(() =>
    visibleSendRecipientIds.value.length > 0
    && visibleSendRecipientIds.value.every(id => selectedSendRecipientIds.value.includes(id)),
  )

  const isLoadingInbox = computed(() => inboxStatus.value === "pending" && !hasLoadedInboxOnce.value)
  const messageTagLabels = computed(() => messageTags.value?.labels ?? [])

  const canSendQuickMessage = computed(() =>
    selectedSendRecipientIds.value.length > 0
    && (sendMessage.value.trim().length > 0 || Boolean(attachFile.value))
    && !isSendingQuick.value,
  )

  const canSendMiniMessage = computed(() =>
    Boolean(activeMiniContact.value)
    && (miniChatMessage.value.trim().length > 0 || Boolean(miniAttachFile.value))
    && !isSendingMini.value,
  )

  function buildPresenceLabel(contact: MessageContact) {
    if (contact.type === "group") {
      return t("navigation.chatWidget.groupMembers", {
        count: contact.memberCount ?? contact.members?.length ?? 0,
      })
    }

    if (contact.isOnline) {
      return t("navigation.chatWidget.onlineStatus")
    }

    const lastSeenLabel = formatLastSeenLabel(contact.lastSeenAt, t)

    if (lastSeenLabel) {
      return lastSeenLabel
    }

    return contact.status || t("navigation.chatWidget.offlineToday")
  }

  function buildPreviewLabel(contact: MessageContact) {
    return contact.preview || ""
  }

  function updateUnreadSnapshot(contacts = allContacts.value) {
    unreadSnapshot.value = new Map(
      contacts.map(contact => [contact.id, {
        unreadCount: contact.unreadCount ?? 0,
        preview: contact.preview ?? "",
      }]),
    )
    hasUnreadSnapshot.value = true
  }

  function findNewIncomingContact(contacts = allContacts.value) {
    if (!hasUnreadSnapshot.value) {
      return null
    }

    const previous = unreadSnapshot.value

    return contacts.find((contact) => {
      const prev = previous.get(contact.id)
      if (!prev) {
        const isMine = contact.preview?.startsWith("Bạn:") || contact.preview?.startsWith("You:")
        return contact.preview && !isMine
      }

      const unreadCount = contact.unreadCount ?? 0
      const preview = contact.preview ?? ""

      const unreadIncreased = unreadCount > prev.unreadCount
      const isMine = preview.startsWith("Bạn:") || preview.startsWith("You:")
      const previewChanged = preview !== prev.preview && !isMine

      return unreadIncreased || previewChanged
    }) ?? null
  }

  function clearQuickSendForm(options?: { preserveRecipient?: boolean }) {
    sendMessage.value = ""
    attachFile.value = null

    if (!options?.preserveRecipient) {
      sendTo.value = ""
      activeSendTagFilter.value = ""
      selectedSendRecipientIds.value = []
    }
  }

  function toggleSendRecipient(contact: MessageContact) {
    const userId = contact.userId ?? 0

    if (userId <= 0) {
      return
    }

    const nextIds = new Set(selectedSendRecipientIds.value)

    if (nextIds.has(userId)) {
      nextIds.delete(userId)
    }
    else {
      nextIds.add(userId)
    }

    selectedSendRecipientIds.value = [...nextIds]
  }

  function toggleAllVisibleSendRecipients() {
    const visibleIds = visibleSendRecipientIds.value

    if (visibleIds.length === 0) {
      return
    }

    if (allVisibleSendRecipientsSelected.value) {
      const visibleIdSet = new Set(visibleIds)
      selectedSendRecipientIds.value = selectedSendRecipientIds.value.filter(id => !visibleIdSet.has(id))
      return
    }

    selectedSendRecipientIds.value = [...new Set([
      ...selectedSendRecipientIds.value,
      ...visibleIds,
    ])]
  }

  function clearSendRecipients() {
    selectedSendRecipientIds.value = []
  }

  async function refreshInboxSafely(options?: { silent?: boolean }) {
    try {
      await refreshInboxData()
    }
    catch {
      if (!options?.silent) {
        toast.add({
          title: t("navigation.chatWidget.inboxErrorTitle"),
          description: t("navigation.chatWidget.inboxErrorDescription"),
          color: "error",
        })
      }
    }
  }

  async function refreshFromIncomingMessage() {
    await new Promise(resolve => setTimeout(resolve, 800))
    await refreshInboxSafely({ silent: true })

    const incomingContact = findNewIncomingContact()
    updateUnreadSnapshot()

    await refreshAllMiniThreads({ silent: true })

    if (!incomingContact) {
      return
    }

    await openMiniChat(incomingContact)
    miniChatAutoOpenVersion.value += 1
  }

  function getSessionContact(session: MiniChatSession) {
    return allContacts.value.find(contact => contact.id === session.contactId) ?? null
  }

  function findMiniSession(contactId: string) {
    return miniChatSessions.value.find(session => session.contactId === contactId) ?? null
  }

  async function refreshMiniThread(session = activeMiniSession.value, options?: { silent?: boolean }) {
    const contact = session ? getSessionContact(session) : null

    if (!contact) {
      if (session) {
        session.thread = createEmptyThread()
      }
      return
    }

    const shouldShowLoading = !options?.silent && session.thread.messages.length === 0
    if (shouldShowLoading) {
      session.isLoading = true
    }

    try {
      const incomingThread = await repository.getThread(contact)
      if (session.thread.messages.length === 0) {
        session.thread = incomingThread
      }
      else {
        const incomingTexts = new Set(incomingThread.messages.filter(m => m.isMine).map(m => m.text))
        const currentMessages = session.thread.messages.filter(msg => {
          if (msg.id < 0 && incomingTexts.has(msg.text)) {
            return false
          }
          return true
        })

        const merged = [...currentMessages, ...incomingThread.messages]
        const seen = new Set<number>()
        const unique = merged.filter((msg) => {
          if (seen.has(msg.id)) {
            return false
          }
          seen.add(msg.id)
          return true
        })
        unique.sort((a, b) => {
          const aTime = a.timestamp ?? 0
          const bTime = b.timestamp ?? 0
          if (aTime !== bTime) {
            return aTime - bTime
          }
          return a.id - b.id
        })
        session.thread.messages = unique
        session.thread.typing = incomingThread.typing
      }

      if (import.meta.client) {
        cachedThreads.set(contact.id, session.thread)
        try {
          sessionStorage.setItem(`cache:chat-widget:thread:${contact.id}`, JSON.stringify(session.thread))
        }
        catch {}
      }
    }
    catch {
      if (!options?.silent) {
        toast.add({
          title: t("navigation.chatWidget.threadErrorTitle"),
          description: t("navigation.chatWidget.threadErrorDescription"),
          color: "error",
        })
      }
    }
    finally {
      if (shouldShowLoading) {
        session.isLoading = false
      }
    }
  }

  async function refreshAllMiniThreads(options?: { silent?: boolean }) {
    await Promise.all(miniChatSessions.value.map(session => refreshMiniThread(session, options)))
  }

  async function loadOlderMiniMessages(contactId: string) {
    const session = findMiniSession(contactId)
    const contact = session ? getSessionContact(session) : null
    const firstMessageId = session?.thread.messages[0]?.id

    if (!session || !contact || !firstMessageId || session.isLoadingMore) {
      return
    }

    session.isLoadingMore = true

    try {
      const olderThread = await repository.getThread(contact, { beforeId: firstMessageId })

      if (olderThread.messages.length > 0) {
        const merged = [...olderThread.messages, ...session.thread.messages]
        const seen = new Set<number>()
        const unique = merged.filter((msg) => {
          if (seen.has(msg.id)) {
            return false
          }
          seen.add(msg.id)
          return true
        })

        unique.sort((a, b) => {
          const aTime = a.timestamp ?? 0
          const bTime = b.timestamp ?? 0
          if (aTime !== bTime) {
            return aTime - bTime
          }
          return a.id - b.id
        })

        session.thread.messages = unique
      }
    }
    catch {
      toast.add({
        title: t("navigation.chatWidget.threadErrorTitle"),
        description: t("navigation.chatWidget.threadErrorDescription"),
        color: "error",
      })
    }
    finally {
      session.isLoadingMore = false
    }
  }

  async function openMiniChat(contact: MessageContact) {
    const existingSession = findMiniSession(contact.id)

    if (existingSession) {
      existingSession.minimized = false
      existingSession.openedAt = Date.now()
      miniChatSessions.value = [
        existingSession,
        ...miniChatSessions.value.filter(session => session.contactId !== contact.id),
      ]
      await refreshMiniThread(existingSession)
      return
    }

    let cachedThread = cachedThreads.get(contact.id)
    if (!cachedThread && import.meta.client) {
      try {
        const saved = sessionStorage.getItem(`cache:chat-widget:thread:${contact.id}`)
        if (saved) {
          cachedThread = JSON.parse(saved)
          if (cachedThread) {
            cachedThreads.set(contact.id, cachedThread)
          }
        }
      }
      catch {}
    }

    const nextSession: MiniChatSession = {
      contactId: contact.id,
      message: "",
      attachFile: null,
      thread: cachedThread ?? createEmptyThread(),
      isLoading: false,
      isLoadingMore: false,
      isSending: false,
      minimized: false,
      openedAt: Date.now(),
      sendQueue: [],
    }

    miniChatSessions.value = [
      nextSession,
      ...miniChatSessions.value,
    ].slice(0, MAX_MINI_CHAT_SESSIONS)
    await refreshMiniThread(nextSession)
  }

  function closeMiniChat(contactId = activeMiniSession.value?.contactId ?? "") {
    miniChatSessions.value = miniChatSessions.value.filter(session => session.contactId !== contactId)
  }

  function minimizeMiniChat(contactId = activeMiniSession.value?.contactId ?? "") {
    const session = findMiniSession(contactId)

    if (session) {
      session.minimized = true
    }
  }

  function restoreMiniChat(contactId: string) {
    const session = findMiniSession(contactId)

    if (session) {
      session.minimized = false
      session.openedAt = Date.now()
      miniChatSessions.value = [
        session,
        ...miniChatSessions.value.filter(item => item.contactId !== contactId),
      ]
    }
  }

  async function sendMessageToContact(contact: MessageContact, draft: MessageSendDraft, session = activeMiniSession.value) {
    await repository.sendMessage(contact, draft)
    await Promise.all([
      refreshInboxSafely({ silent: true }),
      session ? refreshMiniThread(session, { silent: true }) : refreshAllMiniThreads({ silent: true }),
    ])
  }

  async function uploadRecordDraft(input: MessageRecordDraft) {
    return await repository.uploadRecord(input.blob, input.fileName, {
      mimeType: input.mimeType,
      durationMs: input.durationMs,
    })
  }

  async function sendQuickMessage() {
    if (selectedSendRecipientIds.value.length === 0) {
      toast.add({
        title: t("navigation.chatWidget.recipientRequiredTitle"),
        description: t("navigation.chatWidget.recipientRequiredDescription"),
        color: "warning",
      })
      return
    }

    if (!sendMessage.value.trim() && !attachFile.value) {
      toast.add({
        title: t("navigation.chatWidget.messageRequiredTitle"),
        description: t("navigation.chatWidget.messageRequiredDescription"),
        color: "warning",
      })
      return
    }

    isSendingQuick.value = true

    try {
      const result = await repository.sendMultiMessage({
        recipientIds: selectedSendRecipientIds.value,
        text: sendMessage.value.trim(),
        file: attachFile.value,
        record: null,
      })

      if (result.status !== 200 && result.status !== 207) {
        throw new Error(result.error || "Unable to send multi message")
      }

      await refreshInboxSafely({ silent: true })

      if (result.status === 200) {
        clearQuickSendForm()
        activeTab.value = "contacts"
        toast.add({
          title: t("pages.messagesPage.multiSendSuccess", {
            count: result.sentCount,
          }),
          color: "success",
        })
        return
      }

      toast.add({
        title: t("pages.messagesPage.multiSendPartial", {
          sent: result.sentCount,
          failed: result.failedCount,
        }),
        color: "warning",
      })
    }
    catch {
      toast.add({
        title: t("navigation.chatWidget.sendErrorTitle"),
        description: t("navigation.chatWidget.sendErrorDescription"),
        color: "error",
      })
    }
    finally {
      isSendingQuick.value = false
    }
  }

  async function processMiniSendQueue(session: MiniChatSession, contact: MessageContact) {
    if (!session.sendQueue || session.sendQueue.length === 0 || session.isSending) {
      return
    }

    const draft = session.sendQueue[0]
    session.isSending = true

    try {
      const uploadedRecord = draft.record
        ? await uploadRecordDraft(draft.record)
        : null

      const createdMessages = await repository.sendMessage(contact, {
        text: draft.text,
        file: draft.file,
        record: uploadedRecord,
      })

      const realMsg = createdMessages?.[0]
      if (realMsg) {
        session.thread.messages = session.thread.messages.map(msg =>
          msg.id === draft.tempId ? { ...realMsg, isLast: msg.isLast } : msg
        )

        const contactInInbox = inbox.value.find(c => c.id === contact.id)
        if (contactInInbox) {
          contactInInbox.preview = realMsg.text || (realMsg.mediaType ? `[${realMsg.mediaType}]` : "")
          contactInInbox.time = realMsg.time || t("navigation.chatWidget.justNow") || "Vừa xong"
        }
      } else {
        session.thread.messages = session.thread.messages.filter(msg => msg.id !== draft.tempId)
      }

      void refreshInboxSafely({ silent: true })

      if (import.meta.client) {
        cachedThreads.set(contact.id, session.thread)
        try {
          sessionStorage.setItem(`cache:chat-widget:thread:${contact.id}`, JSON.stringify(session.thread))
        }
        catch {}
      }

      session.sendQueue.shift()
    }
    catch {
      toast.add({
        title: t("navigation.chatWidget.sendErrorTitle"),
        description: t("navigation.chatWidget.sendErrorDescription"),
        color: "error",
      })
      session.thread.messages = session.thread.messages.filter(msg => msg.id !== draft.tempId)
      session.sendQueue.shift()
    }
    finally {
      session.isSending = false
      void processMiniSendQueue(session, contact)
    }
  }

  async function sendMiniMessage(options?: { contactId?: string, record?: MessageRecordDraft | null, textOverride?: string }) {
    const session = options?.contactId ? findMiniSession(options.contactId) : activeMiniSession.value
    const contact = session ? getSessionContact(session) : null
    const text = options?.textOverride ?? session?.message.trim() ?? ""
    const recordDraft = options?.record ?? null

    if (!session || !contact || (!text && !session.attachFile && !recordDraft)) {
      return
    }

    if (!session.sendQueue) {
      session.sendQueue = []
    }

    const tempId = -Math.floor(Math.random() * 1000000)
    let mediaType: MessageItem["mediaType"] = undefined
    let mediaName = ""

    if (session.attachFile) {
      mediaName = session.attachFile.name
      const fileType = session.attachFile.type
      if (fileType.startsWith("image/")) mediaType = "image"
      else if (fileType.startsWith("video/")) mediaType = "video"
      else if (fileType.startsWith("audio/")) mediaType = "audio"
      else if (fileType.includes("gif")) mediaType = "gif"
      else mediaType = "file"
    }
    else if (recordDraft) {
      mediaType = "record"
      mediaName = recordDraft.fileName
    }

    const optimisticMessage: MessageItem = {
      id: tempId,
      text,
      isMine: true,
      time: t("navigation.chatWidget.sendingStatus") || "Đang gửi...",
      timestamp: Math.floor(Date.now() / 1000),
      mediaName,
      mediaType,
      mediaUrl: recordDraft ? recordDraft.previewUrl : session.attachFile ? URL.createObjectURL(session.attachFile) : undefined,
    }

    session.thread.messages = [...session.thread.messages, optimisticMessage]

    const contactInInbox = inbox.value.find(c => c.id === contact.id)
    if (contactInInbox) {
      contactInInbox.preview = text || (mediaType ? `[${mediaType}]` : "")
      contactInInbox.time = t("navigation.chatWidget.sendingStatus") || "Đang gửi..."
    }

    session.sendQueue.push({
      tempId,
      text,
      file: session.attachFile,
      record: recordDraft,
    })

    session.message = ""
    if (session.attachFilePreviewUrl) {
      URL.revokeObjectURL(session.attachFilePreviewUrl)
      session.attachFilePreviewUrl = null
    }
    session.attachFile = null

    void processMiniSendQueue(session, contact)
  }

  async function reactToMiniMessage(messageId: number, reaction: FeedStoryReactionType) {
    if (!messageId || messageId <= 0) {
      return null
    }

    const result = await repository.reactToMessage({
      messageId,
      reaction,
    })

    miniChatSessions.value = miniChatSessions.value.map(session => ({
      ...session,
      thread: {
        ...session.thread,
        messages: session.thread.messages.map(message =>
          message.id === messageId
            ? { ...message, selectedReaction: result.reaction }
            : message,
        ),
      },
    }))

    return result
  }

  async function deleteMiniMessage(messageId: number) {
    if (!messageId || messageId <= 0) {
      return null
    }

    const result = await repository.deleteMessage({ messageId })

    miniChatSessions.value = miniChatSessions.value.map(session => ({
      ...session,
      thread: {
        ...session.thread,
        messages: session.thread.messages.map(message =>
          message.id === messageId
            ? {
                ...message,
                text: "",
                mediaUrl: "",
                mediaName: "",
                mediaType: undefined,
                selectedReaction: null,
                isDeleted: true,
                deletedAt: result.deletedAt,
                deletedTime: result.deletedTime,
                deletedByName: result.deletedByName,
              }
            : message,
        ),
      },
    }))

    return result
  }

  function onMiniFile(event: Event, contactId = activeMiniSession.value?.contactId ?? "") {
    const input = event.target as HTMLInputElement
    const session = contactId ? findMiniSession(contactId) : activeMiniSession.value
    if (session) {
      if (session.attachFilePreviewUrl) {
        URL.revokeObjectURL(session.attachFilePreviewUrl)
        session.attachFilePreviewUrl = null
      }
      const file = input.files?.[0] ?? null
      session.attachFile = file
      if (file && file.type.startsWith("image/")) {
        session.attachFilePreviewUrl = URL.createObjectURL(file)
      }
    }
    input.value = ""
  }

  function clearMiniFile(contactId = activeMiniSession.value?.contactId ?? "") {
    const session = contactId ? findMiniSession(contactId) : activeMiniSession.value
    if (session) {
      if (session.attachFilePreviewUrl) {
        URL.revokeObjectURL(session.attachFilePreviewUrl)
      }
      session.attachFile = null
      session.attachFilePreviewUrl = null
    }
  }

  function onFile(event: Event) {
    const input = event.target as HTMLInputElement
    const nextFile = input.files?.[0] ?? null
    attachFile.value = nextFile
    input.value = ""
  }

  function clearFile() {
    attachFile.value = null
  }

  async function openFullMessages(contact?: MessageContact | null) {
    await router.push({
      path: appRoutes.messages,
      query: buildMessagesRouteQuery(contact),
    })
  }

  async function openMessagesTab(tab?: "user" | "group" | "multi") {
    await router.push({
      path: appRoutes.messages,
      query: tab && tab !== "user" ? { tab } : {},
    })
  }

  function startRefreshTimer() {
    if (!import.meta.client || refreshTimer.value) {
      return
    }

    refreshTimer.value = window.setInterval(() => {
      void refreshFromIncomingMessage()
    }, INBOX_REFRESH_INTERVAL_MS)
  }

  function stopRefreshTimer() {
    if (!import.meta.client || !refreshTimer.value) {
      return
    }

    window.clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }

  async function connectRealtime() {
    if (!import.meta.client || socket.value) {
      return
    }

    try {
      const auth = await repository.getRealtimeToken()

      if (!auth.enabled || !auth.token || !auth.url) {
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
        const sessionHash = useCookie("user_id").value
        if (sessionHash) {
          realtimeSocket.emit("join", { user_id: sessionHash })
        }
      })

      realtimeSocket.on("messages:count", () => {
        void refreshFromIncomingMessage()
      })

      realtimeSocket.on("disconnect", () => {
        socket.value = null
      })

      realtimeSocket.on("connect_error", () => {
        realtimeSocket.disconnect()
        socket.value = null
      })

      socket.value = realtimeSocket
    }
    catch {
      socket.value = null
    }
  }

  watch([allContacts, messageTags], ([contacts, tagsPayload]) => {
    miniChatSessions.value = miniChatSessions.value.filter(session =>
      contacts.some(contact => contact.id === session.contactId),
    )

    const availableUserIds = new Set(
      [...contacts, ...(tagsPayload?.contacts ?? [])]
        .map(contact => contact.userId ?? 0)
        .filter(id => id > 0),
    )
    selectedSendRecipientIds.value = selectedSendRecipientIds.value.filter(id => availableUserIds.has(id))

    const contactIds = new Set(contacts.map(contact => contact.id))
    unreadSnapshot.value = new Map(
      [...unreadSnapshot.value.entries()].filter(([contactId]) => contactIds.has(contactId)),
    )
  })

  watch([activeSendTagFilter, sendCandidates], async ([tagFilter]) => {
    if (!tagFilter) {
      return
    }

    await nextTick()
    selectedSendRecipientIds.value = visibleSendRecipientIds.value
  }, { flush: "post" })

  onMounted(() => {
    startRefreshTimer()
    void refreshInboxSafely().then(() => {
      if (!hasUnreadSnapshot.value && allContacts.value.length > 0) {
        updateUnreadSnapshot(allContacts.value)
      }
    })
    void connectRealtime()

    // Fallback watcher in case initial loading or cache is empty
    if (!hasUnreadSnapshot.value) {
      const unwatch = watch(inboxStatus, (status) => {
        if (status === "success" && allContacts.value.length > 0) {
          updateUnreadSnapshot(allContacts.value)
          unwatch()
        }
      })
    }
  })

  onBeforeUnmount(() => {
    stopRefreshTimer()

    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }

    if (attachFilePreviewUrl.value) {
      URL.revokeObjectURL(attachFilePreviewUrl.value)
    }
    miniChatSessions.value.forEach((session) => {
      if (session.attachFilePreviewUrl) {
        URL.revokeObjectURL(session.attachFilePreviewUrl)
      }
    })
  })

  return {
    activeTab,
    search,
    activeSendTagFilter,
    sendTo,
    sendMessage,
    attachFile,
    attachFilePreviewUrl,
    allVisibleSendRecipientsSelected,
    sendCandidates,
    selectedSendRecipientIds,
    selectedSendRecipients,
    filteredContacts,
    filteredGroups,
    onlineCount,
    miniChatOpen,
    miniChatSessions: miniChatSessionsView,
    miniChatAutoOpenVersion,
    miniChatMessage,
    miniAttachFile,
    activeMiniContact,
    miniMessages,
    isLoadingInbox,
    isLoadingThread,
    isSendingQuick,
    isSendingMini,
    canSendQuickMessage,
    canSendMiniMessage,
    buildPresenceLabel,
    buildPreviewLabel,
    messageTagLabels,
    clearSendRecipients,
    toggleAllVisibleSendRecipients,
    toggleSendRecipient,
    openMiniChat,
    closeMiniChat,
    minimizeMiniChat,
    restoreMiniChat,
    sendQuickMessage,
    sendMiniMessage,
    reactToMiniMessage,
    deleteMiniMessage,
    onMiniFile,
    clearMiniFile,
    onFile,
    clearFile,
    openFullMessages,
    openMessagesTab,
    loadOlderMiniMessages,
  }
}
