// Description: Loads inbox contacts and message threads from the Nuxt API bridge using backend data only.

import type {
  MessageComposerDraft,
  MessageContact,
  MessageItem,
  MessageRecordDraft,
  MessageTab,
  MessageTabKey,
  MessageTagsPayload,
  MessageThread,
  MessageUserTag,
} from "../../domain/types/messages.types"
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"
import { createApiMessagesRepository } from "../../infrastructure/repositories/ApiMessagesRepository"
import {
  buildReplyMessageText,
  getMessageDisplayText,
} from "../utils/message-bubble-content"

type MessageFeedbackTone = "neutral" | "success" | "warning" | "error"
type QueuedMessageDraft = {
  contact: MessageContact
  contactKey: string
  input: MessageComposerDraft
}

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] || "")
  }

  return typeof value === "string" ? value : ""
}

function normalizeTab(value: string): MessageTabKey {
  return value === "multi" || value === "group" ? value : "user"
}

function buildUserContactId(userId: number) {
  return `user:${userId}`
}

function buildContactKey(contact: MessageContact | null) {
  if (!contact) {
    return ""
  }

  return [
    contact.type,
    contact.userId ?? 0,
    contact.groupId ?? 0,
    contact.pageId ?? 0,
    contact.recipientId ?? 0,
    contact.id,
  ].join(":")
}

function clearRequestedThreadQuery(query: Record<string, unknown>) {
  const nextQuery = { ...query }

  delete nextQuery.userId
  delete nextQuery.groupId
  delete nextQuery.name
  delete nextQuery.avatar

  return nextQuery
}

function clearRequestedThreadQuerySilently() {
  if (!import.meta.client) {
    return
  }

  const url = new URL(window.location.href)
  url.searchParams.delete("userId")
  url.searchParams.delete("groupId")
  url.searchParams.delete("name")
  url.searchParams.delete("avatar")
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
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

function sortThreadMessages(messages: MessageItem[]) {
  return [...messages].sort((left, right) => {
    const leftTimestamp = left.timestamp ?? 0
    const rightTimestamp = right.timestamp ?? 0

    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp
    }

    return left.id - right.id
  })
}

function decorateThreadMessages(messages: MessageItem[]) {
  return sortThreadMessages(messages).map((message, index, list) => {
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

function mergeMessages(
  current: MessageItem[],
  incoming: MessageItem[],
  mode: "prepend" | "append",
) {
  const merged = mode === "prepend"
    ? [...incoming, ...current]
    : [...current, ...incoming]

  const seen = new Set<number>()

  return decorateThreadMessages(
    merged.filter((message) => {
      if (seen.has(message.id)) {
        return false
      }

      seen.add(message.id)
      return true
    }),
  )
}

export function useMessagesInbox(
  repository = createApiMessagesRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const activeTab = ref<MessageTabKey>(normalizeTab(readQueryValue(route.query.tab)))
  const query = ref("")
  const selectedContactId = ref("")
  const ignoredRequestedThreadKey = ref("")
  const selectedRecipientIds = ref<number[]>([])
  const activeTagFilter = ref("")
  const multiText = ref("")
  const multiFile = ref<File | null>(null)
  const multiRecord = ref<MessageRecordDraft | null>(null)
  const multiFeedback = ref<{ tone: MessageFeedbackTone, message: string } | null>(null)
  const remoteTyping = ref(false)
  const remoteTypingUserId = ref(0)
  const typingContactIds = ref<string[]>([])
  const isLoadingMore = ref(false)
  const isSending = ref(false)
  const sendQueue = ref<QueuedMessageDraft[]>([])
  const isMultiSending = ref(false)
  const isMarkingRead = ref(false)
  const isDeletingConversation = ref(false)
  const isUpdatingTags = ref(false)
  const activeReactionPickerId = ref<number | null>(null)
  const replyTarget = ref<MessageItem | null>(null)

  const tabs = computed<MessageTab[]>(() => [
    { id: "multi", label: t("pages.messagesPage.sendMultiple"), icon: "i-ph-user-list-duotone" },
    { id: "user", label: t("pages.messagesPage.users"), icon: "i-ph-user-circle-duotone" },
    { id: "group", label: t("pages.messagesPage.groups"), icon: "i-ph-users-three-duotone" },
  ])

  const {
    data: inbox,
    status: inboxStatus,
    error: inboxError,
    refresh: refreshInbox,
  } = useAsyncData(
    "messages:inbox",
    () => repository.getInbox(),
    {
      default: () => [],
    },
  )

  const {
    data: messageTags,
    refresh: refreshMessageTags,
  } = useAsyncData<MessageTagsPayload>(
    "messages:tags",
    () => repository.getTags(),
    {
      default: () => ({ labels: [], contacts: [] }),
    },
  )

  const requestedUserId = computed(() => {
    const parsed = Number(readQueryValue(route.query.userId))

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  })

  const requestedGroupId = computed(() => {
    const parsed = Number(readQueryValue(route.query.groupId))

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  })

  const requestedUserName = computed(() =>
    readQueryValue(route.query.name).trim() || t("pages.messagesPage.users"),
  )
  const requestedUserAvatar = computed(() =>
    readQueryValue(route.query.avatar).trim(),
  )

  const inboxContacts = computed<MessageContact[]>(() => {
    const contacts = inbox.value ?? []
    const userId = requestedUserId.value
    const taggedByUserId = new Map(
      (messageTags.value?.contacts ?? [])
        .map(contact => [contact.userId ?? 0, contact] as const)
        .filter(([id]) => id > 0),
    )
    const mergedContacts = contacts.map(contact =>
      contact.type === "user"
        ? mergeContactTags(contact, taggedByUserId.get(contact.userId ?? 0))
        : contact,
    )

    let nextContacts = mergedContacts

    if (userId > 0 && !mergedContacts.some(contact => contact.type === "user" && contact.userId === userId)) {
      nextContacts = [
        mergeContactTags({
          id: buildUserContactId(userId),
          name: requestedUserName.value,
          status: t("pages.messagesPage.activeRecently"),
          isOnline: false,
          avatarUrl: requestedUserAvatar.value,
          tab: "user",
          type: "user",
          preview: "",
          time: "",
          unreadCount: 0,
          members: [requestedUserName.value],
          userId,
        }, taggedByUserId.get(userId)),
        ...nextContacts,
      ]
    }

    return nextContacts
  })

  const taggedRecipientSource = computed(() => {
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

  const multiRecipientSource = computed(() => {
    const tagId = activeTagFilter.value
    const baseContacts = tagId
      ? taggedRecipientSource.value
      : inboxContacts.value.filter(contact => contact.type === "user" && (contact.userId ?? 0) > 0)

    if (!tagId || tagId === "0") {
      return baseContacts
    }

    const selectedTagId = Number(tagId)

    return baseContacts.filter(contact =>
      contact.tags?.some(tag => tag.id === selectedTagId),
    )
  })

  const visibleContacts = computed(() => {
    const source = activeTab.value === "multi"
      ? multiRecipientSource.value
      : inboxContacts.value

    if (activeTab.value === "multi") {
      return source
    }

    return source.filter(contact => contact.tab === activeTab.value)
  })

  const filteredContacts = computed(() =>
    visibleContacts.value.filter((contact) => {
      const normalizedQuery = query.value.trim().toLowerCase()

      if (!normalizedQuery) {
        return true
      }

      return contact.name.toLowerCase().includes(normalizedQuery)
        || contact.preview.toLowerCase().includes(normalizedQuery)
        || (contact.tags ?? []).some(tag => tag.name.toLowerCase().includes(normalizedQuery))
    }),
  )

  const selectedRecipients = computed(() => {
    const selectedIds = new Set(selectedRecipientIds.value)

    return multiRecipientSource.value.filter(contact =>
      selectedIds.has(contact.userId ?? 0),
    )
  })

  const visibleRecipientIds = computed(() =>
    activeTab.value === "multi"
      ? filteredContacts.value
        .map(contact => contact.userId ?? 0)
        .filter(id => id > 0)
      : [],
  )

  const allVisibleRecipientsSelected = computed(() =>
    visibleRecipientIds.value.length > 0
    && visibleRecipientIds.value.every(id => selectedRecipientIds.value.includes(id)),
  )

  const selectedContact = computed<MessageContact | null>(() => {
    if (activeTab.value === "multi") {
      return null
    }

    return filteredContacts.value.find(contact => contact.id === selectedContactId.value)
      ?? filteredContacts.value[0]
      ?? null
  })

  const {
    data: thread,
    status: threadStatus,
    error: threadError,
    refresh: refreshThread,
  } = useAsyncData(
    () => selectedContact.value ? `messages:thread:${selectedContact.value.id}` : "messages:thread:none",
    () => selectedContact.value
      ? repository.getThread(selectedContact.value)
      : Promise.resolve<MessageThread>({ messages: [], typing: false }),
    {
      watch: [selectedContact],
      default: () => ({ messages: [], typing: false }),
    },
  )

  const messages = computed(() => thread.value?.messages ?? [])
  const messageTagLabels = computed(() => messageTags.value?.labels ?? [])
  const isTyping = computed(() => Boolean(thread.value?.typing || remoteTyping.value))
  const inboxPending = computed(() => inboxStatus.value === "pending")
  const threadPending = computed(() => threadStatus.value === "pending" || isLoadingMore.value || isSending.value)
  const multiFeedbackMessage = computed(() => multiFeedback.value?.message ?? "")
  const multiFeedbackTone = computed<MessageFeedbackTone>(() => multiFeedback.value?.tone ?? "neutral")
  const replyAuthor = computed(() => {
    if (!replyTarget.value) {
      return ""
    }

    if (replyTarget.value.isMine) {
      return t("pages.messagesPage.you")
    }

    return replyTarget.value.authorName || selectedContact.value?.name || ""
  })
  const replyTitle = computed(() =>
    replyAuthor.value
      ? t("navigation.chatWidget.replyingTo", { name: replyAuthor.value })
      : t("navigation.chatWidget.replyingToMessage"),
  )
  const replyPreviewText = computed(() =>
    replyTarget.value
      ? getMessageDisplayText(replyTarget.value) || replyTarget.value.mediaName || t("navigation.chatWidget.replyingToMessage")
      : t("navigation.chatWidget.replyingToMessage"),
  )
  const replyPreviewMediaUrl = computed(() =>
    replyTarget.value
    && replyTarget.value.mediaUrl
    && (replyTarget.value.mediaType === "image" || replyTarget.value.mediaType === "gif")
      ? replyTarget.value.mediaUrl
      : "",
  )

  watch(() => route.query.tab, (value) => {
    const normalizedTab = normalizeTab(readQueryValue(value))

    if (normalizedTab !== activeTab.value) {
      activeTab.value = normalizedTab
    }
  })

  watch(activeTab, (value) => {
    const currentTab = normalizeTab(readQueryValue(route.query.tab))

    if (currentTab === value) {
      return
    }

    const nextQuery = clearRequestedThreadQuery(route.query)

    if (value === "user") {
      delete nextQuery.tab
    }
    else {
      nextQuery.tab = value
    }

    router.replace({ query: nextQuery })
  })

  watch([filteredContacts, requestedUserId, requestedGroupId], ([nextContacts, userId, groupId]) => {
    if (activeTab.value === "multi") {
      selectedContactId.value = ""
      return
    }

    const requestedThreadKey = userId > 0
      ? `user:${userId}`
      : groupId > 0
        ? `group:${groupId}`
        : ""

    if (!requestedThreadKey) {
      ignoredRequestedThreadKey.value = ""
    }
    else if (requestedThreadKey === ignoredRequestedThreadKey.value) {
      userId = 0
      groupId = 0
    }

    if (groupId > 0 && activeTab.value === "group") {
      const requestedGroup = nextContacts.find(contact => contact.type === "group" && contact.groupId === groupId)

      if (requestedGroup) {
        selectedContactId.value = requestedGroup.id
        return
      }
    }

    if (userId > 0 && activeTab.value === "user") {
      const requestedContact = nextContacts.find(contact => contact.type === "user" && contact.userId === userId)

      if (requestedContact) {
        selectedContactId.value = requestedContact.id
        return
      }
    }

    if (!nextContacts.some(contact => contact.id === selectedContactId.value)) {
      selectedContactId.value = nextContacts[0]?.id ?? ""
    }
  }, { immediate: true })

  watch([activeTagFilter, filteredContacts, activeTab], async ([tagFilter]) => {
    if (activeTab.value !== "multi" || !tagFilter) {
      return
    }

    await nextTick()
    selectedRecipientIds.value = visibleRecipientIds.value
  }, { flush: "post" })

  function showThreadError() {
    toast.add({
      title: t("pages.messagesPage.threadErrorTitle"),
      description: t("pages.messagesPage.threadErrorDescription"),
      color: "error",
    })
  }

  function setMultiFeedbackMessage(
    tone: MessageFeedbackTone,
    message: string,
  ) {
    multiFeedback.value = {
      tone,
      message,
    }
  }

  function clearMultiSelection() {
    selectedRecipientIds.value = []
  }

  function clearMultiFeedbackMessage() {
    multiFeedback.value = null
  }

  function toggleRecipient(contact: MessageContact) {
    const userId = contact.userId ?? 0

    if (userId <= 0) {
      return
    }

    const nextIds = new Set(selectedRecipientIds.value)

    if (nextIds.has(userId)) {
      nextIds.delete(userId)
    }
    else {
      nextIds.add(userId)
    }

    selectedRecipientIds.value = [...nextIds]
  }

  function toggleAllVisibleRecipients() {
    const visibleIds = visibleRecipientIds.value

    if (visibleIds.length === 0) {
      return
    }

    if (allVisibleRecipientsSelected.value) {
      const visibleIdSet = new Set(visibleIds)

      selectedRecipientIds.value = selectedRecipientIds.value.filter(id => !visibleIdSet.has(id))
      return
    }

    selectedRecipientIds.value = [...new Set([
      ...selectedRecipientIds.value,
      ...visibleIds,
    ])]
  }

  async function loadThread() {
    try {
      await refreshThread()
    }
    catch {
      showThreadError()
    }
  }

  async function selectContact(contact: MessageContact) {
    if (activeTab.value === "multi") {
      toggleRecipient(contact)
      return
    }

    const requestedThreadKey = requestedUserId.value > 0
      ? `user:${requestedUserId.value}`
      : requestedGroupId.value > 0
        ? `group:${requestedGroupId.value}`
        : ""
    const selectedThreadKey = contact.type === "user" && (contact.userId ?? 0) > 0
      ? `user:${contact.userId}`
      : contact.type === "group" && (contact.groupId ?? 0) > 0
        ? `group:${contact.groupId}`
        : ""

    if (requestedThreadKey && requestedThreadKey !== selectedThreadKey) {
      ignoredRequestedThreadKey.value = requestedThreadKey
    }

    const isSameContact = activeTab.value === contact.tab
      && selectedContactId.value === contact.id

    selectedContactId.value = contact.id
    remoteTyping.value = false
    activeReactionPickerId.value = null

    if (requestedThreadKey && requestedThreadKey !== selectedThreadKey) {
      clearRequestedThreadQuerySilently()
    }

    if (!isSameContact) {
      thread.value = { messages: [], typing: false }
      replyTarget.value = null
    }

    await nextTick()
    await loadThread()
  }

  function setActiveTagFilter(tagId: string) {
    activeTagFilter.value = tagId
    multiFeedback.value = null
  }

  async function createTagLabel(input: { name: string, color: string }) {
    if (isUpdatingTags.value) {
      return false
    }

    isUpdatingTags.value = true

    try {
      const result = await repository.createTagLabel(input)
      await refreshMessageTags()
      return result.ok
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.multiNetworkErrorTitle"),
        description: t("pages.messagesPage.multiNetworkErrorDescription"),
        color: "error",
      })
      return false
    }
    finally {
      isUpdatingTags.value = false
    }
  }

  async function deleteTagLabel(tagId: number) {
    if (tagId <= 0 || isUpdatingTags.value) {
      return false
    }

    isUpdatingTags.value = true

    try {
      const result = await repository.deleteTagLabel({ tagId })
      await refreshMessageTags()

      if (activeTagFilter.value === String(tagId)) {
        activeTagFilter.value = ""
      }

      return result.ok
    }
    finally {
      isUpdatingTags.value = false
    }
  }

  async function attachTag(contact: MessageContact, tagId: number) {
    const userId = contact.userId ?? 0

    if (userId <= 0 || tagId <= 0 || isUpdatingTags.value) {
      return false
    }

    isUpdatingTags.value = true

    try {
      const result = await repository.attachTag({ userId, tagId })
      await refreshMessageTags()
      return result.ok
    }
    finally {
      isUpdatingTags.value = false
    }
  }

  async function detachTag(contact: MessageContact, tagId: number) {
    const userId = contact.userId ?? 0

    if (userId <= 0 || tagId <= 0 || isUpdatingTags.value) {
      return false
    }

    isUpdatingTags.value = true

    try {
      const result = await repository.detachTag({ userId, tagId })
      await refreshMessageTags()
      return result.ok
    }
    finally {
      isUpdatingTags.value = false
    }
  }

  async function uploadRecordDraft(input: MessageRecordDraft) {
    return await repository.uploadRecord(input.blob, input.fileName, {
      mimeType: input.mimeType,
      durationMs: input.durationMs,
    })
  }

  async function processSendQueue() {
    if (isSending.value || sendQueue.value.length === 0) {
      return
    }

    const queuedMessage = sendQueue.value[0]
    const { contact, contactKey, input } = queuedMessage
    isSending.value = true

    try {
      const uploadedRecord = input.record
        ? await uploadRecordDraft(input.record)
        : null
      const createdMessages = await repository.sendMessage(contact, {
        text: input.text,
        file: input.file,
        record: uploadedRecord,
      })
      if (buildContactKey(selectedContact.value) === contactKey) {
        thread.value = {
          messages: mergeMessages(messages.value, createdMessages, "append"),
          typing: false,
        }
        remoteTyping.value = false
      }
      sendQueue.value.shift()
      await refreshInbox()
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.sendErrorTitle"),
        description: t("pages.messagesPage.sendErrorDescription"),
        color: "error",
      })
      sendQueue.value.shift()
    }
    finally {
      isSending.value = false
      void processSendQueue()
    }
  }

  function sendMessage(input: MessageComposerDraft) {
    if (!input.text.trim() && !input.file && !input.record) {
      return
    }

    const contact = selectedContact.value

    if (!contact || activeTab.value === "multi") {
      return
    }

    const text = buildReplyMessageText({
      text: input.text,
      target: replyTarget.value,
      author: replyAuthor.value,
      fallbackLabel: t("navigation.chatWidget.replyingToMessage"),
    })

    sendQueue.value.push({
      contact,
      contactKey: buildContactKey(contact),
      input: {
        text,
        file: input.file,
        record: input.record,
      },
    })

    replyTarget.value = null
    void processSendQueue()
  }

  function patchThreadMessage(
    messageId: number,
    patcher: (message: MessageItem) => MessageItem,
  ) {
    if (!thread.value) {
      return
    }

    thread.value = {
      ...thread.value,
      messages: decorateThreadMessages(
        thread.value.messages.map(message =>
          message.id === messageId ? patcher(message) : message,
        ),
      ),
    }
  }

  function toggleReactionPicker(messageId: number) {
    activeReactionPickerId.value = activeReactionPickerId.value === messageId ? null : messageId
  }

  async function reactToThreadMessage(messageId: number, reaction: FeedStoryReactionType) {
    const target = messages.value.find(message => message.id === messageId)

    if (!target || target.isDeleted) {
      return null
    }

    const previousReaction = target.selectedReaction ?? null
    activeReactionPickerId.value = null
    patchThreadMessage(messageId, message => ({ ...message, selectedReaction: reaction }))

    try {
      const result = await repository.reactToMessage({ messageId, reaction })
      patchThreadMessage(messageId, message => ({ ...message, selectedReaction: result.reaction }))
      return result
    }
    catch {
      patchThreadMessage(messageId, message => ({ ...message, selectedReaction: previousReaction }))
      return null
    }
  }

  function replyToThreadMessage(message: MessageItem) {
    if (message.isDeleted) {
      return
    }

    replyTarget.value = message
    activeReactionPickerId.value = null
  }

  function clearReplyTarget() {
    replyTarget.value = null
  }

  async function deleteThreadMessage(message: MessageItem) {
    if (!message.isMine || message.isDeleted || message.id <= 0) {
      return null
    }

    const previousMessage = messages.value.find(item => item.id === message.id)
    activeReactionPickerId.value = null

    try {
      const result = await repository.deleteMessage({ messageId: message.id })
      patchThreadMessage(message.id, item => ({
        ...item,
        text: "",
        mediaUrl: "",
        mediaName: "",
        mediaType: undefined,
        selectedReaction: null,
        isDeleted: true,
        deletedAt: result.deletedAt,
        deletedTime: result.deletedTime,
        deletedByName: result.deletedByName,
      }))

      if (replyTarget.value?.id === message.id) {
        replyTarget.value = null
      }

      return result
    }
    catch {
      if (previousMessage) {
        patchThreadMessage(message.id, () => previousMessage)
      }

      return null
    }
  }

  async function markAllAsRead() {
    if (isMarkingRead.value) {
      return
    }

    isMarkingRead.value = true

    try {
      await repository.markAllAsRead()
      await refreshInbox()
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.markReadErrorTitle"),
        description: t("pages.messagesPage.markReadErrorDescription"),
        color: "error",
      })
    }
    finally {
      isMarkingRead.value = false
    }
  }

  async function deleteSelectedConversation() {
    const contact = selectedContact.value

    if (!contact || isDeletingConversation.value) {
      return
    }

    isDeletingConversation.value = true

    try {
      await repository.deleteConversation(contact)
      selectedContactId.value = ""
      thread.value = { messages: [], typing: false }
      await refreshInbox()
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.deleteErrorTitle"),
        description: t("pages.messagesPage.deleteErrorDescription"),
        color: "error",
      })
    }
    finally {
      isDeletingConversation.value = false
    }
  }

  async function sendMultiMessage() {
    if (isMultiSending.value) {
      return
    }

    if (selectedRecipientIds.value.length === 0) {
      setMultiFeedbackMessage("error", t("pages.messagesPage.multiMissingRecipients"))
      return
    }

    const text = multiText.value.trim()

    if (!text && !multiFile.value && !multiRecord.value) {
      setMultiFeedbackMessage("error", t("pages.messagesPage.multiMissingContent"))
      return
    }

    isMultiSending.value = true
    setMultiFeedbackMessage("neutral", t("pages.messagesPage.multiSending"))

    try {
      const uploadedRecord = multiRecord.value
        ? await uploadRecordDraft(multiRecord.value)
        : null
      const result = await repository.sendMultiMessage({
        recipientIds: selectedRecipientIds.value,
        text,
        file: multiFile.value,
        record: uploadedRecord,
      })

      if (result.invalidFile === 1) {
        setMultiFeedbackMessage("error", t("pages.messagesPage.invalidFileTooLarge"))
      }
      else if (result.invalidFile === 2) {
        setMultiFeedbackMessage("error", t("pages.messagesPage.invalidFileType"))
      }
      else if (result.invalidFile === 3) {
        setMultiFeedbackMessage("error", t("pages.messagesPage.invalidFileProOnly"))
      }
      else if (result.status === 200) {
        const successMessage = t("pages.messagesPage.multiSendSuccess", {
          count: result.sentCount,
        })

        clearMultiFeedbackMessage()
        toast.add({
          title: successMessage,
          color: "success",
        })
        multiText.value = ""
        multiFile.value = null
        multiRecord.value = null
        clearMultiSelection()
      }
      else if (result.status === 207) {
        setMultiFeedbackMessage("warning", t("pages.messagesPage.multiSendPartial", {
          sent: result.sentCount,
          failed: result.failedCount,
        }))
      }
      else if (result.status === 422) {
        setMultiFeedbackMessage("error", result.error || t("pages.messagesPage.multiMissingContent"))
      }
      else if (result.status === 500) {
        setMultiFeedbackMessage("error", t("pages.messagesPage.multiSendFailed"))
      }
      else {
        setMultiFeedbackMessage("error", result.error || t("pages.messagesPage.multiUnknownStatus"))
      }

      if (result.status === 200 || result.status === 207) {
        await refreshInbox()
      }
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.multiNetworkErrorTitle"),
        description: t("pages.messagesPage.multiNetworkErrorDescription"),
        color: "error",
      })
      setMultiFeedbackMessage("error", t("pages.messagesPage.multiNetworkErrorDescription"))
    }
    finally {
      isMultiSending.value = false
    }
  }

  function setRemoteTyping(value: boolean, userId = 0) {
    remoteTyping.value = value

    if (value) {
      remoteTypingUserId.value = userId
      return
    }

    remoteTypingUserId.value = 0
  }

  function clearRemoteTyping() {
    remoteTyping.value = false
    remoteTypingUserId.value = 0
  }

  function setTypingContact(contactId: string, value: boolean) {
    if (!contactId) {
      return
    }

    const nextIds = new Set(typingContactIds.value)

    if (value) {
      nextIds.add(contactId)
    }
    else {
      nextIds.delete(contactId)
    }

    typingContactIds.value = [...nextIds]
  }

  function setUserContactTyping(userId: number, value: boolean) {
    if (userId <= 0) {
      return
    }

    setTypingContact(buildUserContactId(userId), value)
  }

  function setGroupContactTyping(groupId: number, value: boolean) {
    if (groupId <= 0) {
      return
    }

    setTypingContact(`group:${groupId}`, value)
  }

  function isContactTyping(contact: MessageContact) {
    if (contact.type === "user") {
      const userId = contact.userId ?? 0

      return userId > 0
        && typingContactIds.value.includes(buildUserContactId(userId))
    }

    if (contact.type === "group") {
      const groupId = contact.groupId ?? 0

      return groupId > 0
        && typingContactIds.value.includes(`group:${groupId}`)
    }

    return false
  }

  async function loadOlderMessages() {
    const contact = selectedContact.value
    const firstMessageId = messages.value[0]?.id

    if (!contact || !firstMessageId || isLoadingMore.value) {
      return
    }

    isLoadingMore.value = true

    try {
      const olderThread = await repository.getThread(contact, { beforeId: firstMessageId })

      if (olderThread.messages.length > 0) {
        thread.value = {
          messages: mergeMessages(messages.value, olderThread.messages, "prepend"),
          typing: Boolean(thread.value?.typing),
        }
      }
    }
    catch {
      showThreadError()
    }
    finally {
      isLoadingMore.value = false
    }
  }

  return {
    activeReactionPickerId,
    activeTagFilter,
    activeTab,
    allVisibleRecipientsSelected,
    filteredContacts,
    inboxError,
    inboxPending,
    attachTag,
    createTagLabel,
    deleteSelectedConversation,
    deleteThreadMessage,
    deleteTagLabel,
    detachTag,
    isDeletingConversation,
    isMarkingRead,
    isMultiSending,
    isUpdatingTags,
    isTyping,
    loadOlderMessages,
    markAllAsRead,
    messages,
    messageTagLabels,
    multiFeedbackMessage,
    multiFeedbackTone,
    multiFile,
    multiRecord,
    multiText,
    query,
    refreshInbox,
    refreshMessageTags,
    refreshThread,
    reactToThreadMessage,
    remoteTypingUserId,
    replyPreviewText,
    replyPreviewMediaUrl,
    replyTarget,
    replyTitle,
    isContactTyping,
    clearReplyTarget,
    setRemoteTyping,
    setUserContactTyping,
    setGroupContactTyping,
    clearRemoteTyping,
    selectedContact,
    selectedRecipientIds,
    selectedRecipients,
    selectContact,
    setActiveTagFilter,
    replyToThreadMessage,
    sendMessage,
    sendMultiMessage,
    tabs,
    threadError,
    threadPending,
    toggleAllVisibleRecipients,
    toggleReactionPicker,
  }
}
