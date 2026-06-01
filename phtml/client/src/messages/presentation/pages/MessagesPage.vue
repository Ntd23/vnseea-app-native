<!-- Description: Renders the messages workspace with a docked desktop user detail pane while preserving mobile slideovers and group management flows. -->
<template>
  <div class="h-full min-h-0 w-full overflow-hidden bg-white">
    <div class="flex h-full min-h-0 overflow-hidden">
      <aside
        class="messages-page__left h-full min-h-0 shrink-0 border-r border-[#e5e7eb] bg-white"
        :class="{ 'messages-page__left--mobile-hidden': !mobileListOpen }"
      >
        <MessagesChatList
          v-model:active-tab="activeTab"
          v-model:query="query"
          v-model:multi-text="multiText"
          v-model:multi-file="multiFile"
          v-model:multi-record="multiRecord"
          :multi-pending="isMultiSending"
          :status-message="multiFeedbackMessage"
          :status-tone="multiFeedbackTone"
          :all-visible-recipients-selected="allVisibleRecipientsSelected"
          :contacts="filteredContacts"
          :is-contact-online="isContactOnline"
          :is-contact-typing="isContactTyping"
          :message-tag-labels="messageTagLabels"
          :active-tag-filter="activeTagFilter"
          :pending="inboxPending"
          :selected-contact-id="selectedContact?.id"
          :selected-recipient-ids="selectedRecipientIds"
          :selected-recipients="selectedRecipients"
          :tabs="tabs"
          :marking-read="isMarkingRead"
          @create-group="openCreateGroupModal"
          @mark-all-read="markAllAsRead"
          @select-user="handleSelectContact"
          @toggle-all-recipients="toggleAllVisibleRecipients"
          @send-multi="sendMultiMessage"
          @manage-tags="openTagModal"
          @update:active-tag-filter="setActiveTagFilter"
          @open-chat="handleOpenChatFromMulti"
        />
      </aside>

      <main
        class="messages-page__main h-full min-h-0 min-w-0 flex-1 flex-col bg-white"
        :class="{ 'messages-page__main--mobile-hidden': mobileListOpen }"
      >
        <MessagesChatWindow
          :active-tab="activeTab"
          :contact="selectedContact"
          :empty-description="chatEmptyDescription"
          :empty-thread-label="emptyThreadLabel"
          :empty-title="chatEmptyTitle"
          :group-details="groupDetails"
          :group-typing-avatar-url="activeGroupTypingAvatarUrl"
          :inbox-pending="inboxPending"
          :is-pending="threadPending"
          :is-typing="isTyping"
          :messages="messages"
          :active-reaction-picker-id="activeReactionPickerId"
          :reply-target="replyTarget"
          :reply-title="replyTitle"
          :reply-preview-text="replyPreviewText"
          :reply-preview-media-url="replyPreviewMediaUrl"
          :call-action-pending="isCallActionPending"
          :deleting-conversation="isDeletingConversation"
          :user-detail-docked="showDesktopUserDetailPane"
          @typing-start="startComposerTyping"
          @typing-stop="stopComposerTyping"
          @toggle-info="infoPanelOpen = !infoPanelOpen"
          @load-more="loadOlderMessages"
          @send="sendMessage"
          @toggle-reaction-picker="toggleReactionPicker"
          @select-reaction="reactToThreadMessage"
          @reply-message="replyToThreadMessage"
          @delete-message="deleteThreadMessage"
          @clear-reply="clearReplyTarget"
          @start-call="startSelectedContactCall"
          @delete-conversation="deleteSelectedConversation"
          @back="handleBackToList"
        />
      </main>

      <aside
        v-if="showDesktopUserDetailPane"
        class="messages-page__detail hidden h-full min-h-0 shrink-0 border-l border-[#e5e7eb] bg-[#fcfdff] xl:flex"
      >
        <MessagesUserDetailPanel
          :contact="selectedContact"
          :deleting-conversation="isDeletingConversation"
          :empty-description="infoEmptyDescription"
          :empty-title="infoEmptyTitle"
          @delete-conversation="deleteSelectedConversation"
        />
      </aside>
    </div>

    <USlideover
      v-if="selectedContact"
      v-model:open="infoPanelOpen"
      :title="infoPanelTitle"
      :ui="{
        content: 'sm:max-w-[380px] p-0',
        body: 'p-0 sm:p-0',
      }"
    >
      <template #body>
        <div class="h-[100dvh] sm:h-full">
          <MessagesUserDetailPanel
            v-if="selectedContact.type === 'user'"
            :contact="selectedContact"
            :deleting-conversation="isDeletingConversation"
            :empty-description="infoEmptyDescription"
            :empty-title="infoEmptyTitle"
            @delete-conversation="deleteSelectedConversation"
          />
          <MessagesMessageSidePanel
            v-else
            :contact="selectedContact"
            :group-candidate-query="groupCandidateQuery"
            :group-candidates="groupCandidates"
            :group-candidates-pending="groupCandidatesPending"
            :group-details="groupDetails"
            :group-details-pending="groupDetailsPending"
            :messages="messages"
            :updating-group-details="isUpdatingGroupDetails"
            :updating-group-members="isUpdatingGroupMembers"
            :empty-description="infoEmptyDescription"
            :empty-title="infoEmptyTitle"
            :deleting-conversation="isDeletingConversation"
            @update:group-candidate-query="updateGroupCandidateQuery"
            @update-group="updateGroupDetails"
            @add-group-member="addGroupMember"
            @add-group-members="addGroupMembers"
            @remove-group-member="removeGroupMember"
            @delete-conversation="deleteSelectedConversation"
          />
        </div>
      </template>
    </USlideover>

    <MessagesCreateGroupModal
      v-model:open="createGroupOpenModel"
      v-model:name="createGroupName"
      v-model:query="createGroupQuery"
      v-model:avatar="createGroupAvatarModel"
      :avatar-preview-url="createGroupAvatarPreviewUrl"
      :candidates="createGroupCandidates"
      :error-message="createGroupErrorMessage"
      :pending="isCreatingGroup"
      :search-pending="createGroupCandidatesPending"
      :selected-candidates="createGroupSelectedCandidates"
      @select-candidate="addCreateGroupParticipant"
      @remove-candidate="removeCreateGroupParticipant"
      @submit="submitCreateGroup"
    />

    <UModal v-model:open="tagModalOpen" :title="$t('pages.messagesPage.tagModalTitle')" :ui="{ content: 'sm:max-w-[640px]' }">
      <template #body>
        <div class="messages-tag-modal">
          <div class="messages-tag-modal__tabs">
            <button
              type="button"
              class="messages-tag-modal__tab"
              :class="{ 'messages-tag-modal__tab--active': tagModalTab === 'assign' }"
              @click="tagModalTab = 'assign'"
            >
              {{ $t("pages.messagesPage.tagAssignTab") }}
            </button>
            <button
              type="button"
              class="messages-tag-modal__tab"
              :class="{ 'messages-tag-modal__tab--active': tagModalTab === 'manage' }"
              @click="tagModalTab = 'manage'"
            >
              {{ $t("pages.messagesPage.tagManageTab") }}
            </button>
          </div>

          <section v-if="tagModalTab === 'assign'" class="messages-tag-modal__panel">
            <h3 class="messages-tag-modal__title">{{ $t("pages.messagesPage.tagListTitle") }}</h3>
            <div class="messages-tag-modal__list">
              <div
                v-for="tag in messageTagLabels"
                :key="tag.id"
                class="messages-tag-modal__row"
              >
                <span class="messages-tag-modal__name">
                  <span class="messages-tag-modal__dot" :style="{ backgroundColor: tag.color }" />
                  {{ tag.name }}
                </span>
                <button
                  type="button"
                  class="messages-tag-modal__action"
                  :class="contactHasTag(tag.id) ? 'messages-tag-modal__action--danger' : 'messages-tag-modal__action--primary'"
                  :disabled="isUpdatingTags"
                  @click="toggleContactTag(tag.id)"
                >
                  {{ contactHasTag(tag.id) ? $t("pages.messagesPage.remove") : $t("pages.messagesPage.attach") }}
                </button>
              </div>
              <p v-if="messageTagLabels.length === 0" class="messages-tag-modal__empty">
                {{ $t("pages.messagesPage.tagEmpty") }}
              </p>
            </div>
            <p class="messages-tag-modal__hint">
              {{ $t("pages.messagesPage.tagApplyHint") }}
            </p>
          </section>

          <section v-else class="messages-tag-modal__panel">
            <h3 class="messages-tag-modal__title">{{ $t("pages.messagesPage.tagManageListTitle") }}</h3>
            <div class="messages-tag-modal__create">
              <UInput v-model="newTagName" :placeholder="$t('pages.messagesPage.tagCreatePlaceholder')" size="lg" />
              <input v-model="newTagColor" type="color" class="messages-tag-modal__color">
              <UButton
                size="lg"
                :loading="isUpdatingTags"
                :disabled="newTagName.trim().length === 0"
                @click="submitCreateTag"
              >
                {{ $t("pages.messagesPage.create") }}
              </UButton>
            </div>

            <div class="messages-tag-modal__list">
              <div
                v-for="tag in messageTagLabels"
                :key="tag.id"
                class="messages-tag-modal__row"
              >
                <span class="messages-tag-modal__name">
                  <span class="messages-tag-modal__dot" :style="{ backgroundColor: tag.color }" />
                  {{ tag.name }}
                </span>
                <button
                  type="button"
                  class="messages-tag-modal__action messages-tag-modal__action--danger"
                  :disabled="isUpdatingTags"
                  @click="deleteTagLabel(tag.id)"
                >
                  {{ $t("pages.messagesPage.delete") }}
                </button>
              </div>
              <p v-if="messageTagLabels.length === 0" class="messages-tag-modal__empty">
                {{ $t("pages.messagesPage.tagEmpty") }}
              </p>
            </div>
          </section>

          <div class="messages-tag-modal__footer">
            <UButton color="neutral" variant="soft" size="lg" @click="tagModalOpen = false">
              {{ $t("pages.messagesPage.close") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import MessagesChatList from "../components/ChatList.vue"
import MessagesCreateGroupModal from "../components/CreateGroupModal.vue"
import MessagesChatWindow from "../components/ChatWindow.vue"
import MessagesMessageSidePanel from "../components/MessageSidePanel.vue"
import MessagesUserDetailPanel from "../components/UserDetailPanel.vue"
import { useMessageCalls } from "../../application/composables/useMessageCalls"
import { useMessagesPageVM } from "../../application/view-models/useMessagesPageVM"
import type { MessageCallLogAction, MessageCallType } from "../../domain/types/calls.types"
import type { MessageContact } from "../../domain/types/messages.types"

const { t } = useI18n()
const infoPanelOpen = ref(false)
const tagModalOpen = ref(false)
const tagModalTab = ref<"assign" | "manage">("assign")
const tagModalContact = ref<MessageContact | null>(null)
const newTagName = ref("")
const newTagColor = ref("#3b82f6")
const mobileListOpen = ref(true)
const {
  isCallActionPending,
  joinGroupCall,
  startCall,
  startGroupCall,
} = useMessageCalls()
const {
  activeGroupTypingAvatarUrl,
  activeReactionPickerId,
  activeTagFilter,
  activeTab,
  addCreateGroupParticipant,
  addGroupMember,
  addGroupMembers,
  attachTag,
  allVisibleRecipientsSelected,
  closeCreateGroupModal,
  clearReplyTarget,
  createGroupAvatarFile,
  createGroupAvatarPreviewUrl,
  createGroupCandidates,
  createGroupCandidatesPending,
  createGroupErrorMessage,
  createGroupModalOpen,
  createGroupName,
  createGroupQuery,
  createGroupSelectedCandidates,
  filteredContacts,
  groupCandidateQuery,
  groupCandidates,
  groupCandidatesPending,
  groupDetails,
  groupDetailsPending,
  inboxPending,
  isContactTyping,
  isContactOnline,
  isCreatingGroup,
  isDeletingConversation,
  isMarkingRead,
  isUpdatingGroupDetails,
  isMultiSending,
  isTyping,
  isUpdatingGroupMembers,
  loadOlderMessages,
  messages,
  messageTagLabels,
  multiFeedbackMessage,
  multiFeedbackTone,
  multiFile,
  multiRecord,
  multiText,
  openCreateGroupModal: openCreateGroupModalVm,
  query,
  removeCreateGroupParticipant,
  removeGroupMember,
  reactToThreadMessage,
  replyPreviewMediaUrl,
  replyPreviewText,
  replyTarget,
  replyTitle,
  selectedContact,
  selectedRecipientIds,
  selectedRecipients,
  createTagLabel,
  deleteSelectedConversation,
  deleteThreadMessage,
  deleteTagLabel,
  detachTag,
  markAllAsRead,
  isUpdatingTags,
  selectContact,
  setActiveTagFilter,
  setCreateGroupAvatar,
  replyToThreadMessage,
  sendMessage,
  sendMultiMessage,
  submitCreateGroup,
  updateGroupDetails,
  startComposerTyping,
  stopComposerTyping,
  tabs,
  threadPending,
  toggleAllVisibleRecipients,
  toggleReactionPicker,
} = useMessagesPageVM()

const chatEmptyTitle = computed(() =>
  activeTab.value === "multi"
    ? t("pages.messagesPage.multiTabTitle")
    : t("pages.messagesPage.noConversationSelectedTitle"),
)

const chatEmptyDescription = computed(() =>
  activeTab.value === "multi"
    ? t("pages.messagesPage.multiTabDescription")
    : t("pages.messagesPage.noConversationSelectedDescription"),
)

const infoEmptyTitle = computed(() =>
  activeTab.value === "multi"
    ? t("pages.messagesPage.multiTabTitle")
    : t("pages.messagesPage.infoPanelEmptyTitle"),
)

const infoEmptyDescription = computed(() =>
  activeTab.value === "multi"
    ? t("pages.messagesPage.multiTabDescription")
    : t("pages.messagesPage.infoPanelEmptyDescription"),
)

const emptyThreadLabel = computed(() =>
  t("pages.messagesPage.emptyThread"),
)

const showDesktopUserDetailPane = computed(() =>
  activeTab.value === "user" && selectedContact.value?.type === "user",
)

const infoPanelTitle = computed(() =>
  selectedContact.value?.type === "user"
    ? t("pages.messagesPage.profile")
    : t("pages.messagesPage.info"),
)

const createGroupOpenModel = computed({
  get: () => createGroupModalOpen.value,
  set: (value: boolean) => {
    if (value) {
      openCreateGroupModalVm()
      return
    }

    closeCreateGroupModal()
  },
})

const createGroupAvatarModel = computed({
  get: () => createGroupAvatarFile.value,
  set: (value: File | null) => {
    setCreateGroupAvatar(value ?? null)
  },
})

const tagModalLiveContact = computed(() => {
  const userId = tagModalContact.value?.userId ?? 0

  return filteredContacts.value.find(contact => contact.userId === userId)
    ?? tagModalContact.value
})

watch(
  () => selectedContact.value
    ? `${selectedContact.value.type}:${selectedContact.value.userId ?? selectedContact.value.groupId ?? selectedContact.value.id}`
    : "",
  () => {
    infoPanelOpen.value = false
  },
)

watch(showDesktopUserDetailPane, (value) => {
  if (value) {
    infoPanelOpen.value = false
  }
})

function openCreateGroupModal() {
  mobileListOpen.value = true
  openCreateGroupModalVm()
}

async function handleSelectContact(contact: MessageContact) {
  await selectContact(contact)

  if (activeTab.value !== "multi") {
    mobileListOpen.value = false
  }
}

function handleOpenChatFromMulti(contact: MessageContact) {
  activeTab.value = "user"
  handleSelectContact(contact)
}

function handleBackToList() {
  mobileListOpen.value = true
  infoPanelOpen.value = false
}

async function startSelectedContactCall(input: MessageCallType | MessageCallLogAction) {
  if (typeof input === "object" && input.action === "join" && input.callId) {
    await joinGroupCall(input.callId)
    return
  }

  const type = typeof input === "object" ? input.type : input
  const contact = selectedContact.value

  if (!contact) {
    return
  }

  if (contact.type === "group") {
    await startGroupCall(contact, type)
    return
  }

  if (contact.type === "user") {
    await startCall(contact, type)
  }
}

function updateGroupCandidateQuery(value: string) {
  groupCandidateQuery.value = value
}

function openTagModal(contact: MessageContact) {
  tagModalContact.value = contact
  tagModalTab.value = "assign"
  tagModalOpen.value = true
}

function contactHasTag(tagId: number) {
  return Boolean(tagModalLiveContact.value?.tags?.some(tag => tag.id === tagId))
}

async function toggleContactTag(tagId: number) {
  const contact = tagModalLiveContact.value

  if (!contact) {
    return
  }

  if (contactHasTag(tagId)) {
    await detachTag(contact, tagId)
  }
  else {
    await attachTag(contact, tagId)
  }
}

async function submitCreateTag() {
  const name = newTagName.value.trim()

  if (!name) {
    return
  }

  const created = await createTagLabel({
    name,
    color: newTagColor.value,
  })

  if (created) {
    newTagName.value = ""
    tagModalTab.value = "assign"
  }
}

</script>

<style scoped>
.messages-page__left {
  width: min(520px, 100vw);
  height: 100%;
  overflow: hidden;
}

.messages-page__main {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.messages-page__detail {
  width: 320px;
}

.messages-tag-modal {
  max-height: min(68vh, 560px);
  overflow-y: auto;
  padding: 4px 0 0;
}

.messages-tag-modal__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 3px solid #e5e7eb;
  margin: 0 0 20px;
}

.messages-tag-modal__tab {
  height: 44px;
  color: #6b7280;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
  border-bottom: 3px solid transparent;
  margin-bottom: -3px;
}

.messages-tag-modal__tab--active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.messages-tag-modal__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-tag-modal__title {
  color: #1f2937;
  font-size: 16px;
  font-weight: 800;
}

.messages-tag-modal__list {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.12);
}

.messages-tag-modal__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
}

.messages-tag-modal__row:last-child {
  border-bottom: 0;
}

.messages-tag-modal__name {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #374151;
  font-size: 15px;
  font-weight: 600;
}

.messages-tag-modal__dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.messages-tag-modal__action {
  min-width: 82px;
  height: 36px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.messages-tag-modal__action:disabled {
  opacity: 0.65;
}

.messages-tag-modal__action--primary {
  background: #3b82f6;
}

.messages-tag-modal__action--danger {
  background: #ef4444;
}

.messages-tag-modal__hint,
.messages-tag-modal__empty {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.messages-tag-modal__empty {
  padding: 18px 12px;
}

.messages-tag-modal__create {
  display: grid;
  grid-template-columns: 1fr 46px auto;
  gap: 8px;
  align-items: center;
}

.messages-tag-modal__color {
  width: 46px;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.messages-tag-modal__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

@media (min-width: 768px) {
  .messages-page__left {
    width: clamp(390px, 28vw, 520px);
  }
}

@media (min-width: 1536px) {
  .messages-page__detail {
    width: 360px;
  }
}

@media (max-width: 767.98px) {
  .messages-page__left--mobile-hidden,
  .messages-page__main--mobile-hidden {
    display: none;
  }
}
</style>
