<!-- Description: Renders the inbox sidebar with search, user/group tabs, and the multi-send panel for text, file, and recording drafts. -->
<template>
  <div class="flex h-full flex-col bg-white">

    <!-- ── Header: Search + Actions ─────────────────── -->
    <div class="shrink-0 px-4 pt-5 pb-3">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Icon name="i-ph-magnifying-glass" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            :value="query"
            type="search"
            class="cl-search"
            :placeholder="$t('pages.messagesPage.searchPlaceholder')"
            @input="emit('update:query', ($event.target as HTMLInputElement).value)"
          >
        </div>

        <UTooltip :text="markAllLabel">
          <button class="cl-icon-btn" type="button" :disabled="markingRead" @click="emit('mark-all-read')">
            <Icon v-if="!markingRead" name="i-ph-list-checks-bold" class="h-4.5 w-4.5" />
            <Icon v-else name="i-ph-spinner-gap-bold" class="h-4.5 w-4.5 animate-spin" />
          </button>
        </UTooltip>

        <UTooltip :text="createGroupLabel">
          <button class="cl-icon-btn cl-icon-btn--primary" type="button" @click="emit('create-group')">
            <Icon name="i-ph-pencil-simple-bold" class="h-4.5 w-4.5" />
          </button>
        </UTooltip>
      </div>

      <!-- ── Tabs ──────────────────────────────────── -->
      <div class="mt-4 flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--bg-muted)] p-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="cl-tab"
          :class="activeTab === tab.id ? 'cl-tab--active' : ''"
          @click="emit('update:activeTab', tab.id)"
        >
          <div class="relative">
            <Icon :name="tab.icon" class="h-4 w-4" />
            <span
              v-if="tab.id === 'multi' && selectedRecipients.length > 0"
              class="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white"
            >
              {{ selectedRecipients.length }}
            </span>
          </div>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- ── Multi-send composer panel ────────────────── -->
    <div v-if="activeTab === 'multi'" class="cl-multi-panel">
      <div class="cl-multi-header">
        <div class="cl-multi-title">
          <span class="cl-multi-title-icon">
            <Icon name="i-ph-paper-plane-tilt-duotone" class="h-4 w-4" />
          </span>
          <span>{{ $t("pages.messagesPage.composeTitle") }}</span>
        </div>
        <span class="cl-selected-count">{{ selectedCountLabel }}</span>
      </div>

      <div class="cl-multi-stack">
        <section class="cl-filter-card">
          <div class="cl-field-heading">
            <Icon name="i-ph-tag-duotone" class="h-3.5 w-3.5" />
            <span>{{ tagFilterLabel }}</span>
          </div>
          <select
            class="cl-select"
            :value="activeTagFilter"
            @change="emit('update:activeTagFilter', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ chooseTagLabel }}</option>
            <option value="0">{{ allTaggedUsersLabel }}</option>
            <option
              v-for="tag in messageTagLabels ?? []"
              :key="tag.id"
              :value="String(tag.id)"
            >
              {{ tag.name }}
            </option>
          </select>

          <div v-if="activeTagFilter" class="cl-tag-filter-status">
            <div class="cl-avatar-stack" aria-hidden="true">
              <UAvatar
                v-for="recipient in selectedAvatarRecipients"
                :key="recipient.id"
                :src="recipient.avatarUrl"
                :alt="recipient.name"
                size="xs"
                class="cl-stacked-avatar"
              />
              <span v-if="selectedOverflowCount > 0" class="cl-stacked-more">
                +{{ selectedOverflowCount }}
              </span>
            </div>
            <p>{{ tagFilterStatus }}</p>
          </div>
        </section>

        <section>
          <div class="cl-recipient-heading">
            <div class="cl-field-heading cl-field-heading--inline">
              <Icon name="i-ph-users-three-duotone" class="h-3.5 w-3.5" />
              <span>
                {{ $t("pages.messagesPage.sendTo") }}
              </span>
            </div>
            <label class="cl-select-all">
              <input
                type="checkbox"
                :checked="allVisibleRecipientsSelected"
                class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                @change="emit('toggle-all-recipients')"
              >
              <span>{{ $t("pages.messagesPage.selectAll") }}</span>
            </label>
          </div>
          <div class="cl-recipient-box" :class="{ 'cl-recipient-box--empty': selectedRecipients.length === 0 }">
            <div v-if="selectedRecipients.length > 0" class="cl-recipient-chips">
              <div
                v-for="recipient in selectedPreviewRecipients"
                :key="recipient.id"
                class="cl-recipient-chip"
              >
                <UAvatar :src="recipient.avatarUrl" :alt="recipient.name" size="xs" />
                <span>{{ recipient.name }}</span>
                <button
                  type="button"
                  class="cl-recipient-remove"
                  :title="$t('pages.messagesPage.remove')"
                  @click.stop="emit('select-user', recipient)"
                >
                  <Icon name="i-ph-x-bold" class="h-2.5 w-2.5" />
                </button>
              </div>
              <span v-if="selectedChipOverflowCount > 0" class="cl-recipient-chip cl-recipient-chip--more">
                +{{ selectedChipOverflowCount }}
              </span>
            </div>
            <span v-else class="cl-recipient-empty">{{ $t("pages.messagesPage.noRecipientsSelected") }}</span>
          </div>
        </section>

        <UTextarea
          :model-value="multiText"
          autoresize
          :rows="3"
          :placeholder="$t('pages.messagesPage.messagePlaceholder')"
          :ui="{ base: 'rounded-[var(--radius-md)] border border-[var(--border-light)] bg-white shadow-none text-sm' }"
          @update:model-value="emit('update:multiText', String($event || ''))"
        />

        <div class="cl-upload-box">
          <UFileUpload
            v-model="multiFileModel"
            :multiple="false"
            layout="list"
            highlight
            :label="$t('pages.messagesPage.chooseFile')"
            :description="$t('pages.messagesPage.attachmentOptional')"
            class="w-full"
          />
        </div>

        <UAlert
          v-if="permissionDenied || errorMessage"
          color="error"
          variant="subtle"
          icon="i-ph-warning-circle-duotone"
          :title="$t('pages.messagesPage.recordPermissionTitle')"
          :description="permissionDenied ? $t('pages.messagesPage.recordPermissionDenied') : errorMessage"
          class="rounded-[var(--radius-md)]"
        />

        <UAlert
          v-if="statusMessage && statusTone !== 'success'"
          :color="statusColor"
          variant="subtle"
          :description="statusMessage"
          class="rounded-[var(--radius-md)]"
        />

        <div class="cl-multi-actions">
          <div class="flex items-center gap-2">
            <UButton
              type="button"
              icon="i-ph-paper-plane-tilt-bold"
              class="rounded-full px-4 btn-primary"
              size="sm"
              :loading="multiPending"
              :disabled="multiPending || !canSendMulti"
              @click="emit('send-multi')"
            >
              {{ multiPending ? $t("pages.messagesPage.multiSendingButton") : $t("pages.messagesPage.sendMessage") }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Contact list ──────────────────────────── -->
    <UScrollArea class="min-h-0 flex-1 px-3 pb-3">
      <div class="space-y-0.5">
        <MessagesChatListItem
          v-for="contact in contacts"
          :key="contact.id"
          :avatar-url="contact.avatarUrl"
          :is-active="isContactActive(contact)"
          :is-typing="activeTab !== 'multi' && isContactTyping(contact)"
          :is-online="isContactOnline(contact)"
          :name="contact.name"
          :preview="contact.preview"
          :show-select="activeTab === 'multi'"
          :show-tag-action="activeTab === 'user' && contact.type === 'user'"
          :status="getContactStatus(contact)"
          :tags="contact.tags ?? []"
          :time="contact.time"
          :type="contact.type"
          :unread-count="contact.unreadCount"
          @click="emit('select-user', contact)"
          @manage-tags="emit('manage-tags', contact)"
          @open-chat="emit('open-chat', contact)"
        />

        <div v-if="pending && contacts.length === 0" class="space-y-0.5" aria-hidden="true">
          <div
            v-for="i in skeletonRowCount"
            :key="i"
            class="cl-skeleton-item"
            :class="{ 'cl-skeleton-item--active': i === 1 }"
          >
            <div class="cl-skeleton-avatar">
              <USkeleton class="cl-skeleton-avatar-shape" />
              <span v-if="activeTab !== 'group' && i === 1" class="cl-skeleton-online-dot" />
            </div>
            <div class="cl-skeleton-body">
              <div class="cl-skeleton-row cl-skeleton-row--top">
                <USkeleton class="cl-skeleton-name" :class="{ 'cl-skeleton-name--wide': i % 3 === 0 }" />
                <USkeleton class="cl-skeleton-time" />
              </div>
              <USkeleton class="cl-skeleton-status" :class="{ 'cl-skeleton-status--group': activeTab === 'group' }" />
              <div class="cl-skeleton-row cl-skeleton-row--bottom">
                <USkeleton class="cl-skeleton-preview" :class="{ 'cl-skeleton-preview--wide': i % 2 === 0 }" />
              </div>
              <div class="cl-skeleton-tags-row">
                <USkeleton class="cl-skeleton-tag" />
                <USkeleton v-if="activeTab === 'user' && i === 3" class="cl-skeleton-color-tag" />
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="contacts.length === 0"
          class="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-10 text-center"
        >
          <Icon name="i-ph-chat-circle-dashed-duotone" class="h-8 w-8 text-[var(--text-tertiary)]" />
          <span class="text-sm text-[var(--text-secondary)]">{{ emptyLabel }}</span>
        </div>
      </div>
    </UScrollArea>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue"
import { useMessageRecorder } from "../../application/composables/useMessageRecorder"
import type { MessageContact, MessageRecordDraft, MessageTab, MessageTabKey, MessageUserTag } from "../../domain/types/messages.types"
import MessagesChatListItem from "./ChatListItem.vue"

const multiRecordModel = defineModel<MessageRecordDraft | null>("multiRecord", { default: null })

const props = defineProps<{
  activeTab: MessageTabKey
  activeTagFilter?: string
  allVisibleRecipientsSelected?: boolean
  contacts: MessageContact[]
  isContactOnline?: (contact: MessageContact) => boolean
  isContactTyping: (contact: MessageContact) => boolean
  messageTagLabels?: MessageUserTag[]
  pending?: boolean
  query: string
  selectedContactId?: string
  selectedRecipientIds?: number[]
  selectedRecipients: MessageContact[]
  tabs: MessageTab[]
  markingRead?: boolean
  multiText: string
  multiFile: File | null
  multiPending?: boolean
  statusMessage?: string
  statusTone?: "neutral" | "success" | "warning" | "error"
}>()

const { t } = useI18n()
const emit = defineEmits<{
  "select-user": [user: MessageContact]
  "create-group": []
  "mark-all-read": []
  "manage-tags": [user: MessageContact]
  "toggle-all-recipients": []
  "update:activeTab": [tab: MessageTabKey]
  "update:activeTagFilter": [tagId: string]
  "update:query": [value: string]
  "update:multiText": [value: string]
  "update:multiFile": [value: File | null]
  "send-multi": []
  "open-chat": [user: MessageContact]
}>()

const {
  isSupported, isRecording, permissionDenied, errorMessage,
  durationMs, recordDraft, startRecording, stopRecording, clearRecording,
} = useMessageRecorder()

const multiFileModel = computed<File | null>({
  get: () => props.multiFile,
  set: (file) => { emit("update:multiFile", file ?? null) },
})

watch(recordDraft, (draft) => { multiRecordModel.value = draft })
watch(() => props.multiFile, (file) => { if (file && recordDraft.value) clearRecording() })
watch(() => multiRecordModel.value, (draft) => {
  if (!draft && recordDraft.value && !isRecording.value) clearRecording()
})

const markAllLabel = computed(() => t("pages.messagesPage.markAllRead"))
const createGroupLabel = computed(() => t("pages.messagesPage.newGroupChat"))
const loadingLabel = computed(() => t("pages.messagesPage.loadingConversations"))
const skeletonRowCount = computed(() => props.activeTab === "group" ? 5 : 7)
const tagFilterLabel = computed(() => t("pages.messagesPage.label"))
const chooseTagLabel = computed(() => t("pages.messagesPage.chooseTag"))
const allTaggedUsersLabel = computed(() => t("pages.messagesPage.allTaggedUsers"))
const activeRecordDraft = computed(() => multiRecordModel.value || recordDraft.value)
const resultLabel = computed(() =>
  props.activeTab === "multi"
    ? t("pages.messagesPage.availableRecipients")
    : t("pages.messagesPage.visibleConversations"),
)
const emptyLabel = computed(() =>
  props.activeTab === "multi"
    ? t("pages.messagesPage.noRecipientsAvailable")
    : t("pages.messagesPage.noMatchingConversations"),
)
const selectedCountLabel = computed(() =>
  t("pages.messagesPage.selectedRecipientsCount", { count: props.selectedRecipients.length }),
)
const selectedAvatarRecipients = computed(() => props.selectedRecipients.slice(0, 5))
const selectedOverflowCount = computed(() => Math.max(props.selectedRecipients.length - selectedAvatarRecipients.value.length, 0))
const selectedPreviewRecipients = computed(() => props.selectedRecipients.slice(0, 10))
const selectedChipOverflowCount = computed(() => Math.max(props.selectedRecipients.length - selectedPreviewRecipients.value.length, 0))
const tagFilterStatus = computed(() => {
  if (!props.activeTagFilter) return ""
  const label = props.activeTagFilter === "0"
    ? allTaggedUsersLabel.value
    : props.messageTagLabels?.find(tag => String(tag.id) === props.activeTagFilter)?.name || chooseTagLabel.value
  return t("pages.messagesPage.filteringBy", { label })
})
const canSendMulti = computed(() =>
  props.selectedRecipients.length > 0
  && (props.multiText.trim().length > 0 || Boolean(props.multiFile) || Boolean(activeRecordDraft.value)),
)
const formattedRecordDuration = computed(() => {
  const src = isRecording.value ? durationMs.value : (activeRecordDraft.value?.durationMs ?? durationMs.value)
  const total = Math.max(Math.floor(src / 1000), 0)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
})
const statusColor = computed(() => {
  if (props.statusTone === "success") return "success"
  if (props.statusTone === "warning") return "warning"
  if (props.statusTone === "error") return "error"
  return "neutral"
})

function isContactActive(contact: MessageContact) {
  if (props.activeTab === "multi")
    return Boolean(contact.userId && props.selectedRecipientIds?.includes(contact.userId))
  return props.selectedContactId === contact.id
}

function isContactOnline(contact: MessageContact) {
  return props.isContactOnline?.(contact) ?? contact.isOnline
}

function getContactStatus(contact: MessageContact) {
  if (contact.type === "group" && contact.memberCount)
    return t("pages.messagesPage.groupMembersStatus", { count: contact.memberCount })
  if (contact.type === "user" && isContactOnline(contact))
    return t("pages.messagesPage.activeNow")
  return contact.status || t("pages.messagesPage.activeRecently")
}

async function handleRecordButton() {
  if (isRecording.value) { await stopRecordingDraft(); return }
  emit("update:multiFile", null)
  await startRecording()
}

async function stopRecordingDraft() { await stopRecording() }
function discardRecording() { clearRecording(); multiRecordModel.value = null }
</script>

<style scoped>
/* Search input */
.cl-search {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  background: var(--bg-muted);
  color: var(--text-primary);
  font-size: var(--text-body);
  font-family: var(--font-primary);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}
.cl-search:focus {
  border-color: var(--border-strong);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06);
}
.cl-search::placeholder { color: var(--text-tertiary); }

/* Icon buttons */
.cl-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  flex-shrink: 0;
}
.cl-icon-btn:hover { background: var(--bg-surface-hover); color: var(--text-primary); border-color: var(--border-default); }
.cl-icon-btn:disabled { opacity: 0.5; cursor: default; }

.cl-icon-btn--primary {
  background: var(--bg-brand);
  color: #ffffff;
  border-color: transparent;
}
.cl-icon-btn--primary:hover { background: var(--bg-brand-hover); color: #ffffff; }

/* Tab pills */
.cl-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  font-family: var(--font-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  white-space: nowrap;
}
.cl-tab:hover:not(.cl-tab--active) {
  background: rgba(255,255,255,0.6);
  color: var(--text-primary);
}
.cl-tab--active {
  background: var(--bg-surface);
  color: var(--color-primary-600);
  font-weight: var(--weight-semibold);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px var(--border-light);
}

.cl-multi-panel {
  display: flex;
  max-height: min(620px, calc(100% - 118px));
  min-height: 0;
  flex: 0 1 auto;
  flex-direction: column;
  border-bottom: 1px solid var(--border-light);
  background: #f8fafc;
  padding: 14px 16px 0;
}

.cl-multi-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.cl-multi-title {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.cl-multi-title-icon {
  display: inline-flex;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(0, 0, 255, 0.06);
  color: var(--color-primary-600);
}

.cl-selected-count {
  display: inline-flex;
  min-height: 24px;
  flex-shrink: 0;
  align-items: center;
  border: 1px solid var(--border-light);
  border-radius: 999px;
  background: #ffffff;
  padding: 3px 9px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.cl-multi-stack {
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 16px;
  padding-right: 2px;
  scrollbar-width: thin;
}

.cl-multi-stack::-webkit-scrollbar {
  width: 6px;
}

.cl-multi-stack::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.cl-filter-card,
.cl-recipient-box,
.cl-upload-box {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: #ffffff;
}

.cl-filter-card {
  padding: 11px;
}

.cl-field-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cl-field-heading--inline {
  margin-bottom: 0;
}

.cl-recipient-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}

.cl-select-all {
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.cl-tag-filter-status {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.35;
}

.cl-tag-filter-status p {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cl-avatar-stack {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding-left: 6px;
}

.cl-stacked-avatar,
.cl-stacked-more {
  margin-left: -6px;
  box-shadow: 0 0 0 2px #ffffff;
}

.cl-stacked-more {
  display: inline-flex;
  min-width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--color-primary-600);
  font-size: 10px;
  font-weight: 800;
}

.cl-recipient-box {
  min-height: 48px;
  padding: 8px;
}

.cl-recipient-box--empty {
  display: flex;
  align-items: center;
  border-style: dashed;
  background: #fafbfe;
  padding: 11px 12px;
}

.cl-recipient-chips {
  display: flex;
  max-height: 88px;
  flex-wrap: wrap;
  gap: 6px;
  overflow-y: auto;
  padding-right: 2px;
}

.cl-recipient-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(0, 0, 255, 0.08);
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.04);
  padding: 3px 8px 3px 3px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.cl-recipient-chip span:not(.cl-recipient-chip--more) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cl-recipient-remove {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: var(--text-tertiary);
  transition: all 0.15s ease;
}

.cl-recipient-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.cl-recipient-chip--more {
  padding: 5px 9px;
  background: #f1f5f9;
  color: var(--text-tertiary);
}

.cl-recipient-empty {
  color: var(--text-tertiary);
  font-size: 13px;
}

.cl-upload-box {
  padding: 11px;
}

.cl-multi-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: end;
  gap: 12px;
  border-top: 1px solid var(--border-light);
  background: #f8fafc;
  padding: 12px 0 14px;
}

/* Select */
.cl-select {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  background: #fafbfe;
  color: var(--text-primary);
  font-size: var(--text-body);
  font-family: var(--font-primary);
  outline: none;
  cursor: pointer;
  transition: border-color var(--duration-fast);
}
.cl-select:focus { border-color: var(--border-strong); }

.cl-skeleton-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  min-height: 92px;
}

.cl-skeleton-item--active {
  border-color: #dbe3ff;
  background: #f6f8ff;
}

.cl-skeleton-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
}

.cl-skeleton-avatar-shape {
  width: 44px !important;
  height: 44px !important;
  border-radius: 999px !important;
  background: #e8edf4 !important;
}

.cl-skeleton-online-dot {
  position: absolute;
  right: 0;
  bottom: 2px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid #ffffff;
  background: #3b82c4;
}

.cl-skeleton-body {
  min-width: 0;
  flex: 1;
  padding-top: 1px;
}

.cl-skeleton-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.cl-skeleton-row--bottom {
  margin-top: 7px;
  align-items: center;
}

.cl-skeleton-name {
  width: 96px;
  height: 19px;
  border-radius: 999px;
  background: #dfe5ee !important;
}

.cl-skeleton-name--wide {
  width: 118px;
}

.cl-skeleton-time {
  width: 46px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #e8edf4 !important;
}

.cl-skeleton-status {
  width: 112px;
  height: 14px;
  margin-top: 7px;
  border-radius: 999px;
  background: #e8edf4 !important;
}

.cl-skeleton-status--group {
  width: 92px;
}

.cl-skeleton-preview {
  width: 170px;
  height: 17px;
  border-radius: 999px;
  background: #e8edf4 !important;
}

.cl-skeleton-preview--wide {
  width: 220px;
}

.cl-skeleton-tags-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
}

.cl-skeleton-tag {
  width: 28px;
  height: 20px;
  border-radius: 999px;
  background: #e8edf4 !important;
}

.cl-skeleton-color-tag {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: #fde68a !important;
}
</style>
