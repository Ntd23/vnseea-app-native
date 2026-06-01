// English description: Coordinates inbox state, realtime message refresh, typing, and group member management for the messages page.

import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue"
import { useMessagesInbox } from "../composables/useMessagesInbox"
import { useMessageRealtime } from "../composables/useMessageRealtime"
import { createApiMessagesRepository } from "../../infrastructure/repositories/ApiMessagesRepository"
import type {
  MessageComposerDraft,
  MessageContact,
  MessageGroupCandidate,
  MessageGroupCreateCandidate,
  MessageGroupUpdateDraft,
} from "../../domain/types/messages.types"

export function useMessagesPageVM() {
  const { t } = useI18n()
  const toast = useToast()
  const repository = createApiMessagesRepository()
  const inbox = useMessagesInbox(repository)
  const realtime = useMessageRealtime({
    repository,
    activeTab: inbox.activeTab,
    selectedContact: inbox.selectedContact,
    refreshInbox: async () => await inbox.refreshInbox(),
    refreshThread: async () => await inbox.refreshThread(),
    setRemoteTyping: inbox.setRemoteTyping,
    setGroupContactTyping: inbox.setGroupContactTyping,
    setUserContactTyping: inbox.setUserContactTyping,
  })
  const groupCandidateQuery = ref("")
  const debouncedGroupCandidateQuery = ref("")
  const isUpdatingGroupMembers = ref(false)
  const isUpdatingGroupDetails = ref(false)
  const createGroupModalOpen = ref(false)
  const createGroupName = ref("")
  const createGroupQuery = ref("")
  const createGroupCandidatesRaw = ref<MessageGroupCreateCandidate[]>([])
  const createGroupSelectedCandidates = ref<MessageGroupCreateCandidate[]>([])
  const createGroupAvatarFile = ref<File | null>(null)
  const createGroupAvatarPreviewUrl = ref("")
  const createGroupErrorMessage = ref("")
  const isCreatingGroup = ref(false)
  const createGroupCandidatesPending = ref(false)
  const onlineStatusRefreshTimer = shallowRef<ReturnType<typeof window.setInterval> | null>(null)
  const selectedCreateGroupUserIds = computed(() =>
    new Set(createGroupSelectedCandidates.value.map(candidate => candidate.userId)),
  )
  const createGroupCandidates = computed(() =>
    createGroupCandidatesRaw.value.filter(candidate => !selectedCreateGroupUserIds.value.has(candidate.userId)),
  )
  let createGroupSearchToken = 0

  const selectedGroupId = computed(() => {
    const contact = inbox.selectedContact.value

    if (contact?.type !== "group") {
      return 0
    }

    return contact.groupId ?? 0
  })

  const {
    data: groupDetails,
    status: groupDetailsStatus,
    refresh: refreshGroupDetails,
  } = useAsyncData(
    () => selectedGroupId.value > 0
      ? `messages:group-details:${selectedGroupId.value}`
      : "messages:group-details:none",
    () => selectedGroupId.value > 0
      ? repository.getGroupDetails(selectedGroupId.value)
      : Promise.resolve(null),
    {
      watch: [selectedGroupId],
      default: () => null,
    },
  )

  const isContactOnline = (contact: MessageContact) => {
    if (contact.type !== "group") {
      return contact.isOnline
    }

    if (groupDetails.value?.groupId !== contact.groupId) {
      return contact.isOnline
    }

    return contact.isOnline
      || groupDetails.value.members.some(member => !member.isSelf && member.isOnline)
  }

  const activeGroupTypingAvatarUrl = computed(() => {
    const typingUserId = inbox.remoteTypingUserId.value

    if (typingUserId <= 0 || groupDetails.value?.groupId !== selectedGroupId.value) {
      return ""
    }

    return groupDetails.value.members.find(member => member.userId === typingUserId)?.avatarUrl || ""
  })

  const logOnlineState = (source: string) => {
    if (!import.meta.dev || !import.meta.client) {
      return
    }

    const selected = inbox.selectedContact.value
    const visibleContacts = inbox.filteredContacts.value.map(contact => ({
      id: contact.id,
      type: contact.type,
      name: contact.name,
      isOnline: isContactOnline(contact),
      rawIsOnline: contact.isOnline,
      status: contact.status,
      lastSeenAt: contact.lastSeenAt,
      memberCount: contact.memberCount,
    }))
    const selectedGroupMembers = groupDetails.value?.members.map(member => ({
      userId: member.userId,
      name: member.name,
      isOnline: Boolean(member.isOnline),
      isSelf: member.isSelf,
      isOwner: member.isOwner,
    })) ?? []

    console.table(visibleContacts)
    console.info("[messages:online-state]", {
      source,
      activeTab: inbox.activeTab.value,
      selected: selected
        ? {
            id: selected.id,
            type: selected.type,
            name: selected.name,
            isOnline: isContactOnline(selected),
            rawIsOnline: selected.isOnline,
            status: selected.status,
            lastSeenAt: selected.lastSeenAt,
            groupId: selected.groupId,
            userId: selected.userId,
          }
        : null,
      selectedGroupMembers,
    })
  }

  const {
    data: groupCandidates,
    status: groupCandidatesStatus,
    refresh: refreshGroupCandidates,
  } = useAsyncData<MessageGroupCandidate[]>(
    () => selectedGroupId.value > 0
      ? `messages:group-candidates:${selectedGroupId.value}:${debouncedGroupCandidateQuery.value}`
      : "messages:group-candidates:none",
    () => selectedGroupId.value > 0
      ? repository.searchGroupCandidates(selectedGroupId.value, debouncedGroupCandidateQuery.value)
      : Promise.resolve([]),
    {
      watch: [selectedGroupId, debouncedGroupCandidateQuery],
      default: () => [],
    },
  )

  const syncActiveTypingState = async () => {
    const contact = inbox.selectedContact.value

    if (inbox.activeTab.value !== "user" || contact?.type !== "user" || !contact.userId) {
      inbox.clearRemoteTyping()
      return
    }

    await realtime.syncTypingState(contact.userId)
  }

  const stopComposerTyping = async () => {
    const contact = inbox.selectedContact.value

    if (!contact) {
      return
    }

    await realtime.stopTyping(contact)
  }

  const startComposerTyping = async () => {
    const contact = inbox.selectedContact.value

    if (!contact) {
      return
    }

    await realtime.startTyping(contact)
  }

  const sendMessage = async (input: MessageComposerDraft) => {
    await inbox.sendMessage(input)
    await stopComposerTyping()
  }

  const resolveErrorMessage = (error: unknown, fallback: string) => {
    if (!error || typeof error !== "object") {
      return fallback
    }

    const normalized = error as {
      data?: {
        statusMessage?: string
        message?: string
      }
      statusMessage?: string
      message?: string
    }

    return normalized.data?.statusMessage
      || normalized.statusMessage
      || normalized.data?.message
      || normalized.message
      || fallback
  }

  const revokeCreateGroupAvatarPreview = () => {
    if (createGroupAvatarPreviewUrl.value.startsWith("blob:")) {
      URL.revokeObjectURL(createGroupAvatarPreviewUrl.value)
    }

    createGroupAvatarPreviewUrl.value = ""
  }

  const resetCreateGroupModal = () => {
    createGroupSearchToken += 1
    createGroupName.value = ""
    createGroupQuery.value = ""
    createGroupCandidatesRaw.value = []
    createGroupSelectedCandidates.value = []
    createGroupCandidatesPending.value = false
    createGroupErrorMessage.value = ""
    createGroupAvatarFile.value = null
    revokeCreateGroupAvatarPreview()
  }

  const closeCreateGroupModal = () => {
    createGroupModalOpen.value = false
    resetCreateGroupModal()
  }

  const openCreateGroupModal = () => {
    createGroupErrorMessage.value = ""
    createGroupModalOpen.value = true
  }

  const setCreateGroupAvatar = (file: File | null) => {
    createGroupAvatarFile.value = file
    revokeCreateGroupAvatarPreview()

    if (file) {
      createGroupAvatarPreviewUrl.value = URL.createObjectURL(file)
    }
  }

  const addCreateGroupParticipant = (candidate: MessageGroupCreateCandidate) => {
    if (selectedCreateGroupUserIds.value.has(candidate.userId)) {
      return
    }

    createGroupSelectedCandidates.value = [
      ...createGroupSelectedCandidates.value,
      candidate,
    ]
  }

  const removeCreateGroupParticipant = (userId: number) => {
    createGroupSelectedCandidates.value = createGroupSelectedCandidates.value.filter(
      candidate => candidate.userId !== userId,
    )
  }

  const submitCreateGroup = async () => {
    if (isCreatingGroup.value) {
      return false
    }

    isCreatingGroup.value = true
    createGroupErrorMessage.value = ""

    try {
      const result = await repository.createGroup({
        name: createGroupName.value,
        recipientIds: createGroupSelectedCandidates.value.map(candidate => candidate.userId),
        avatar: createGroupAvatarFile.value,
      })

      inbox.activeTab.value = "group"
      inbox.query.value = ""
      await inbox.refreshInbox()
      await nextTick()

      if (result.groupId) {
        const createdGroup = inbox.filteredContacts.value.find(contact =>
          contact.type === "group" && contact.groupId === result.groupId,
        )

        if (createdGroup) {
          await inbox.selectContact(createdGroup)
        }
      }

      closeCreateGroupModal()

      toast.add({
        title: t("pages.messagesPage.groupCreateSuccessTitle"),
        description: t("pages.messagesPage.groupCreateSuccessDescription"),
        color: "success",
      })

      return true
    }
    catch (error) {
      createGroupErrorMessage.value = resolveErrorMessage(
        error,
        t("pages.messagesPage.groupCreateErrorDescription"),
      )
      return false
    }
    finally {
      isCreatingGroup.value = false
    }
  }

  const refreshActiveGroupState = async () => {
    if (selectedGroupId.value <= 0) {
      return
    }

    await refreshGroupDetails()

    await refreshGroupCandidates()

    await inbox.refreshInbox()
  }

  const addGroupMembers = async (userIds: number[]) => {
    const normalizedUserIds = [...new Set(userIds.map(Number).filter(userId => Number.isFinite(userId) && userId > 0))]

    if (selectedGroupId.value <= 0 || normalizedUserIds.length === 0 || isUpdatingGroupMembers.value) {
      return false
    }

    isUpdatingGroupMembers.value = true

    try {
      await repository.addGroupMembers(selectedGroupId.value, normalizedUserIds)
      await refreshActiveGroupState()
      toast.add({
        title: t("pages.messagesPage.groupInviteSuccessTitle"),
        description: t("pages.messagesPage.groupInviteSuccessDescription"),
        color: "success",
      })
      return true
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.groupInviteErrorTitle"),
        description: t("pages.messagesPage.groupInviteErrorDescription"),
        color: "error",
      })
      return false
    }
    finally {
      isUpdatingGroupMembers.value = false
    }
  }

  const addGroupMember = async (userId: number) => await addGroupMembers([userId])

  const removeGroupMember = async (userId: number) => {
    if (selectedGroupId.value <= 0 || userId <= 0 || isUpdatingGroupMembers.value) {
      return false
    }

    isUpdatingGroupMembers.value = true

    try {
      await repository.removeGroupMember(selectedGroupId.value, userId)
      await refreshActiveGroupState()
      toast.add({
        title: t("pages.messagesPage.groupKickSuccessTitle"),
        description: t("pages.messagesPage.groupKickSuccessDescription"),
        color: "success",
      })
      return true
    }
    catch {
      toast.add({
        title: t("pages.messagesPage.groupKickErrorTitle"),
        description: t("pages.messagesPage.groupKickErrorDescription"),
        color: "error",
      })
      return false
    }
    finally {
      isUpdatingGroupMembers.value = false
    }
  }

  const updateGroupDetails = async (input: Omit<MessageGroupUpdateDraft, "groupId">) => {
    if (selectedGroupId.value <= 0 || isUpdatingGroupDetails.value) {
      return false
    }

    isUpdatingGroupDetails.value = true

    try {
      await repository.updateGroup({
        groupId: selectedGroupId.value,
        name: input.name,
        avatar: input.avatar,
      })
      await refreshActiveGroupState()
      toast.add({
        title: "Đã cập nhật nhóm",
        description: "Thông tin nhóm đã được cập nhật.",
        color: "success",
      })
      return true
    }
    catch (error) {
      toast.add({
        title: "Không thể cập nhật nhóm",
        description: resolveErrorMessage(error, "Vui lòng kiểm tra tên nhóm hoặc ảnh đại diện rồi thử lại."),
        color: "error",
      })
      return false
    }
    finally {
      isUpdatingGroupDetails.value = false
    }
  }

  watchDebounced(
    groupCandidateQuery,
    (value: string) => {
      debouncedGroupCandidateQuery.value = value.trim()
    },
    { debounce: 250, maxWait: 500 },
  )

  watchDebounced(
    createGroupQuery,
    async (value: string) => {
      const keyword = value.trim()
      const requestToken = ++createGroupSearchToken

      if (!createGroupModalOpen.value || !keyword) {
        createGroupCandidatesRaw.value = []
        createGroupCandidatesPending.value = false
        return
      }

      createGroupCandidatesPending.value = true

      try {
        const candidates = await repository.searchCreateGroupParticipants(keyword)

        if (requestToken === createGroupSearchToken) {
          createGroupCandidatesRaw.value = candidates
        }
      }
      catch {
        if (requestToken === createGroupSearchToken) {
          createGroupCandidatesRaw.value = []
        }
      }
      finally {
        if (requestToken === createGroupSearchToken) {
          createGroupCandidatesPending.value = false
        }
      }
    },
    { debounce: 250, maxWait: 500 },
  )

  watch(
    () => [
      inbox.activeTab.value,
      inbox.selectedContact.value?.type || "",
      inbox.selectedContact.value?.userId || 0,
      inbox.selectedContact.value?.groupId || 0,
    ] as const,
    async ([, nextType], [, prevType, prevUserId, prevGroupId]) => {
      if (prevType === "user" && prevUserId > 0) {
        await realtime.stopTyping({ type: "user", userId: prevUserId } as MessageContact)
      }

      if (prevType === "group" && prevGroupId > 0) {
        await realtime.stopTyping({ type: "group", groupId: prevGroupId } as MessageContact)
      }

      if (nextType !== "user") {
        const contact = inbox.selectedContact.value

        if (contact?.type === "group") {
          inbox.setRemoteTyping(inbox.isContactTyping(contact))
          return
        }

        inbox.clearRemoteTyping()
        return
      }

      await syncActiveTypingState()
    },
  )

  watch(selectedGroupId, () => {
    groupCandidateQuery.value = ""
    debouncedGroupCandidateQuery.value = ""
  }, { immediate: true })

  watch(
    [
      () => inbox.filteredContacts.value.map(contact => `${contact.id}:${isContactOnline(contact) ? 1 : 0}:${contact.status}:${contact.lastSeenAt ?? 0}`).join("|"),
      () => groupDetails.value?.members.map(member => `${member.userId}:${member.isOnline ? 1 : 0}`).join("|") ?? "",
    ],
    () => logOnlineState("watch"),
    { immediate: true },
  )

  onMounted(() => {
    void realtime.start()
    void syncActiveTypingState()

    onlineStatusRefreshTimer.value = window.setInterval(() => {
      void inbox.refreshInbox()

      if (selectedGroupId.value > 0) {
        void refreshGroupDetails()
      }

      logOnlineState("interval")
    }, 30000)
  })

  onBeforeUnmount(() => {
    if (onlineStatusRefreshTimer.value) {
      window.clearInterval(onlineStatusRefreshTimer.value)
      onlineStatusRefreshTimer.value = null
    }

    revokeCreateGroupAvatarPreview()
    void realtime.stop()
  })

  return {
    ...inbox,
    addCreateGroupParticipant,
    addGroupMember,
    addGroupMembers,
    closeCreateGroupModal,
    createGroupAvatarFile,
    createGroupAvatarPreviewUrl,
    createGroupCandidates,
    createGroupCandidatesPending,
    createGroupErrorMessage,
    createGroupModalOpen,
    createGroupName,
    createGroupQuery,
    createGroupSelectedCandidates,
    groupCandidateQuery,
    groupCandidates,
    groupCandidatesPending: computed(() => groupCandidatesStatus.value === "pending"),
    groupDetails,
    groupDetailsPending: computed(() => groupDetailsStatus.value === "pending"),
    activeGroupTypingAvatarUrl,
    isCreatingGroup,
    isContactOnline,
    isUpdatingGroupDetails,
    isUpdatingGroupMembers,
    openCreateGroupModal,
    removeGroupMember,
    removeCreateGroupParticipant,
    sendMessage,
    setCreateGroupAvatar,
    startComposerTyping,
    stopComposerTyping,
    submitCreateGroup,
    updateGroupDetails,
    realtimeConnected: realtime.connected,
    pollingFallbackActive: realtime.pollingFallbackActive,
    isContactTyping: inbox.isContactTyping,
  }
}
