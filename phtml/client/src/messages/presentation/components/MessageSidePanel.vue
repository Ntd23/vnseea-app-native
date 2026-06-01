<!-- Description: Renders the messages side panel with group info, members, storage, and available group-management actions. -->
<template>
  <div class="scrollbar-hide flex h-full flex-col overflow-y-auto bg-white">
    <template v-if="contact">
      <template v-if="isGroupContact">
        <div v-if="activePanel === 'info'" class="group-info-panel">
          <section class="group-info-panel__hero">
            <UChip
              :show="groupHasOnlineMember"
              color="success"
              position="bottom-right"
              :ui="{ base: '!bg-emerald-500' }"
              inset
            >
              <div
                v-if="!headerAvatarUrl"
                class="group-info-panel__avatar-fallback"
              >
                <Icon name="i-ph-users-three-fill" class="h-9 w-9" />
              </div>
              <UAvatar v-else :src="headerAvatarUrl" size="3xl" class="group-info-panel__avatar" />
            </UChip>

            <div class="group-info-panel__name-row">
              <h3>{{ headerName }}</h3>
              <button
                type="button"
                class="group-info-panel__round-icon"
                aria-label="Đổi thông tin nhóm"
                @click="openEditGroupModal"
              >
                <Icon name="i-ph-pencil-simple-bold" />
              </button>
            </div>

            <div class="group-info-panel__quick-actions">
              <button type="button" @click="activePanel = 'members'">
                <span><Icon name="i-ph-user-plus-bold"/></span>
                <em>Thêm thành viên</em>
              </button>
            </div>
          </section>

          <section class="group-info-panel__section">
            <button type="button" class="group-info-panel__section-title" @click="activePanel = 'members'">
              <span>Thành viên nhóm</span>
              <Icon name="i-ph-caret-down-bold" />
            </button>
            <button type="button" class="group-info-panel__row" @click="activePanel = 'members'">
              <Icon name="i-ph-users-three-bold" />
              <span>{{ memberCountLabel }}</span>
            </button>
          </section>

          <section class="group-info-panel__section">
            <button type="button" class="group-info-panel__section-title" @click="openStorage('media')">
              <span>Ảnh/Video</span>
              <Icon name="i-ph-caret-down-bold" />
            </button>
            <div v-if="mediaPreviewItems.length" class="group-info-panel__media-grid">
              <button
                v-for="item in mediaPreviewItems"
                :key="item.id"
                type="button"
                @click="openStorage('media')"
              >
                <NuxtImg v-if="item.mediaType !== 'video'" :src="item.mediaUrl" :alt="item.mediaName || 'Media'" />
                <video v-else :src="item.mediaUrl" muted playsinline />
                <span v-if="item.mediaType === 'video'" class="group-info-panel__play"><Icon name="i-ph-play-fill" /></span>
              </button>
            </div>
            <p v-else class="group-info-panel__empty">Chưa có Ảnh/Video được chia sẻ trong hội thoại này</p>
            <button v-if="mediaMessages.length > 0" type="button" class="group-info-panel__see-all" @click="openStorage('media')">
              Xem tất cả
            </button>
          </section>

          <section class="group-info-panel__section">
            <button type="button" class="group-info-panel__section-title" @click="openStorage('files')">
              <span>File</span>
              <Icon name="i-ph-caret-down-bold" />
            </button>
            <p v-if="fileMessages.length === 0" class="group-info-panel__empty">Chưa có File được chia sẻ trong hội thoại này</p>
            <div v-else class="group-info-panel__compact-list">
              <a v-for="item in fileMessages.slice(0, 2)" :key="item.id" :href="item.mediaUrl" target="_blank" rel="noopener noreferrer">
                <Icon name="i-ph-file-text-bold" />
                <span>{{ item.mediaName || 'File' }}</span>
              </a>
            </div>
          </section>

          <section class="group-info-panel__section">
            <button type="button" class="group-info-panel__section-title" @click="openStorage('links')">
              <span>Link</span>
              <Icon name="i-ph-caret-down-bold" />
            </button>
            <div v-if="linkItems.length" class="group-info-panel__links">
              <a v-for="item in linkItems.slice(0, 3)" :key="item.id" :href="item.url" target="_blank" rel="noopener noreferrer">
                <span class="group-info-panel__link-icon"><Icon name="i-ph-link-bold" /></span>
                <span>
                  <strong>{{ item.title }}</strong>
                  <em>{{ item.host }}</em>
                </span>
                <small>{{ item.dateLabel }}</small>
              </a>
              <button v-if="linkItems.length > 3" type="button" class="group-info-panel__see-all" @click="openStorage('links')">
                Xem tất cả
              </button>
            </div>
            <p v-else class="group-info-panel__empty">Chưa có Link được chia sẻ trong hội thoại này</p>
          </section>

          <section class="group-info-panel__section group-info-panel__section--danger">
            <button type="button" class="group-info-panel__row" :disabled="deletingConversation" @click="$emit('delete-conversation')">
              <Icon name="i-ph-trash-bold" />
              <span>Xóa lịch sử trò chuyện</span>
            </button>
            <button type="button" class="group-info-panel__row" :disabled="deletingConversation" @click="$emit('delete-conversation')">
              <Icon name="i-ph-sign-out-bold" />
              <span>Rời nhóm</span>
            </button>
          </section>
        </div>

        <div v-else-if="activePanel === 'members'" class="group-sub-panel">
          <header class="group-sub-panel__header">
            <button type="button" class="group-sub-panel__back" aria-label="Quay lại" @click="activePanel = 'info'">
              <Icon name="i-ph-caret-left-bold" />
            </button>
            <h2>Thành viên</h2>
            <span class="group-sub-panel__header-spacer" />
          </header>
          <div class="group-sub-panel__body">
            <button type="button" class="group-info-panel__see-all" @click="openAddMemberModal">
              <Icon name="i-ph-user-plus-bold" />
              Thêm thành viên
            </button>

            <div class="group-sub-panel__members-head">
              <strong>Danh sách thành viên ({{ groupMembers.length }})</strong>
            </div>
            <UInput v-model="memberSearch" placeholder="Tìm kiếm thành viên" icon="i-ph-magnifying-glass" size="lg" />

            <div class="group-sub-panel__member-list">
              <div v-for="member in filteredGroupMembers" :key="member.userId" class="group-sub-panel__member">
                <div class="group-sub-panel__member-main">
                  <UChip
                    :show="Boolean(member.isOnline)"
                    color="success"
                    position="bottom-right"
                    :ui="{ base: '!bg-emerald-500' }"
                    inset
                  >
                    <UAvatar :src="member.avatarUrl" size="lg" class="rounded-full" />
                  </UChip>
                  <div class="group-sub-panel__member-text">
                    <strong>{{ member.name }}</strong>
                    <span v-if="member.isOwner">Trưởng nhóm</span>
                    <span v-else-if="member.isSelf">Bạn</span>
                    <span v-else-if="member.username">@{{ member.username }}</span>
                  </div>
                </div>
                <div class="group-sub-panel__member-actions">
                  <UButton
                    v-if="member.profileUrl"
                    :to="member.profileUrl"
                    color="neutral"
                    variant="ghost"
                    icon="i-ph-user-circle-bold"
                    size="sm"
                    aria-label="Xem hồ sơ"
                  />
                  <UButton
                    v-if="canRemoveMember(member)"
                    color="error"
                    variant="soft"
                    icon="i-ph-trash-bold"
                    size="sm"
                    :loading="updatingGroupMembers"
                    aria-label="Xóa thành viên"
                    @click="$emit('remove-group-member', member.userId)"
                  />
                </div>
              </div>
              <p v-if="filteredGroupMembers.length === 0" class="group-sub-panel__empty">
                Không tìm thấy thành viên phù hợp.
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="activePanel === 'storage'" class="group-sub-panel">
          <header class="group-sub-panel__header">
            <button type="button" class="group-sub-panel__back" aria-label="Quay lại" @click="activePanel = 'info'">
              <Icon name="i-ph-caret-left-bold" />
            </button>
            <h2>Kho lưu trữ</h2>
            <button type="button" class="group-sub-panel__right">Chọn</button>
          </header>
          <div class="group-storage">
            <div class="group-storage__tabs">
              <button type="button" :class="{ active: storageTab === 'media' }" @click="storageTab = 'media'">Ảnh/Video</button>
              <button type="button" :class="{ active: storageTab === 'files' }" @click="storageTab = 'files'">Files</button>
              <button type="button" :class="{ active: storageTab === 'links' }" @click="storageTab = 'links'">Links</button>
            </div>
            <div class="group-storage__filters">
              <button type="button">Người gửi <Icon name="i-ph-caret-down-bold" /></button>
              <button type="button">Ngày gửi <Icon name="i-ph-caret-down-bold" /></button>
            </div>

            <div v-if="storageTab === 'media'" class="group-storage__media">
              <section v-for="group in mediaGroups" :key="group.label">
                <h3>{{ group.label }}</h3>
                <div>
                  <a v-for="item in group.items" :key="item.id" :href="item.mediaUrl" target="_blank" rel="noopener noreferrer">
                    <NuxtImg v-if="item.mediaType !== 'video'" :src="item.mediaUrl" :alt="item.mediaName || 'Media'" />
                    <video v-else :src="item.mediaUrl" muted playsinline />
                    <span v-if="item.mediaType === 'video'" class="group-info-panel__play"><Icon name="i-ph-play-fill" /></span>
                  </a>
                </div>
              </section>
              <p v-if="mediaMessages.length === 0" class="group-info-panel__empty">Chưa có Ảnh/Video được chia sẻ trong hội thoại này</p>
            </div>

            <div v-else-if="storageTab === 'files'" class="group-info-panel__compact-list">
              <a v-for="item in fileMessages" :key="item.id" :href="item.mediaUrl" target="_blank" rel="noopener noreferrer">
                <Icon name="i-ph-file-text-bold" />
                <span>{{ item.mediaName || 'File' }}</span>
              </a>
              <p v-if="fileMessages.length === 0" class="group-info-panel__empty">Chưa có File được chia sẻ trong hội thoại này</p>
            </div>

            <div v-else class="group-info-panel__links">
              <a v-for="item in linkItems" :key="item.id" :href="item.url" target="_blank" rel="noopener noreferrer">
                <span class="group-info-panel__link-icon"><Icon name="i-ph-link-bold" /></span>
                <span>
                  <strong>{{ item.title }}</strong>
                  <em>{{ item.host }}</em>
                </span>
                <small>{{ item.dateLabel }}</small>
              </a>
              <p v-if="linkItems.length === 0" class="group-info-panel__empty">Chưa có Link được chia sẻ trong hội thoại này</p>
            </div>
          </div>
        </div>

        <div v-else class="group-sub-panel">
          <header class="group-sub-panel__header">
            <button type="button" class="group-sub-panel__back" aria-label="Quay lại" @click="activePanel = 'info'">
              <Icon name="i-ph-caret-left-bold" />
            </button>
            <h2>Quản lý nhóm</h2>
            <span class="group-sub-panel__header-spacer" />
          </header>
          <div class="group-manage">
            <p><Icon name="i-ph-lock-key-bold" /> Tính năng chỉ dành cho quản trị viên</p>
            <h3>Cho phép các thành viên trong nhóm:</h3>
            <label v-for="permission in managePermissions" :key="permission" class="group-manage__permission">
              <span>{{ permission }}</span>
              <UCheckbox :model-value="true" disabled />
            </label>
            <label class="group-info-panel__toggle-row">
              <span>Chế độ phê duyệt thành viên mới <Icon name="i-ph-question-bold" /></span>
              <USwitch disabled />
            </label>
            <label class="group-info-panel__toggle-row">
              <span>Đánh dấu tin nhắn từ trưởng/phó nhóm <Icon name="i-ph-question-bold" /></span>
              <USwitch :model-value="true" disabled />
            </label>
            <label class="group-info-panel__toggle-row">
              <span>Cho phép thành viên mới đọc tin nhắn gần nhất <Icon name="i-ph-question-bold" /></span>
              <USwitch :model-value="true" disabled />
            </label>
          </div>
        </div>
      </template>

      <div v-else-if="contact.tags?.length" class="space-y-5 py-5">
        <section>
          <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{{ $t("pages.messagesPage.label") }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UBadge
              v-for="tag in contact.tags"
              :key="tag.id"
              color="primary"
              variant="soft"
              class="rounded-full px-3 py-1 font-semibold"
            >
              {{ tag.name }}
            </UBadge>
          </div>
        </section>
      </div>
    </template>

    <div v-else class="flex flex-1 items-center justify-center">
      <div class="max-w-[260px] text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary-50 text-primary-600">
          <Icon name="i-ph-chat-circle-dots-duotone" class="h-8 w-8" />
        </div>
        <h3 class="mt-5 text-base font-black text-[var(--text-primary)]">
          {{ emptyTitle }}
        </h3>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          {{ emptyDescription }}
        </p>
      </div>
    </div>

    <UModal v-model:open="editGroupModalOpen" title="Đổi thông tin nhóm" :ui="{ content: 'sm:max-w-[420px]' }">
      <template #body>
        <form class="group-edit-form" @submit.prevent="submitEditGroup">
          <div class="group-edit-form__avatar">
            <UAvatar
              v-if="editGroupAvatarPreview || headerAvatarUrl"
              :src="editGroupAvatarPreview || headerAvatarUrl"
              size="3xl"
              class="rounded-full"
            />
            <div v-else class="group-info-panel__avatar-fallback">
              <Icon name="i-ph-users-three-fill" class="h-9 w-9" />
            </div>
          </div>

          <label class="group-edit-form__field">
            <span>Tên nhóm</span>
            <UInput
              v-model="editGroupName"
              placeholder="Nhập tên nhóm"
              size="lg"
            />
          </label>

          <UFileUpload
            v-model="editGroupAvatar"
            :multiple="false"
            accept="image/*"
            layout="list"
            highlight
            label="Ảnh đại diện"
            description="Chọn ảnh mới cho nhóm"
          />

          <div class="group-edit-form__actions">
            <UButton type="button" color="neutral" variant="soft" :disabled="updatingGroupDetails" @click="closeEditGroupModal">
              Hủy
            </UButton>
            <UButton type="submit" color="primary" :loading="updatingGroupDetails" :disabled="!canSubmitEditGroup">
              Lưu
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="addMemberModalOpen" title="Thêm thành viên" :ui="{ content: 'sm:max-w-[460px]' }">
      <template #body>
        <div class="group-add-member-modal">
          <UInput
            ref="candidateSearchInput"
            :model-value="groupCandidateQuery"
            placeholder="Tìm kiếm thành viên"
            icon="i-ph-magnifying-glass-duotone"
            size="lg"
            @update:model-value="updateGroupCandidateQuery"
          />

          <div v-if="groupCandidatesPending" class="group-sub-panel__hint">Đang tìm kiếm...</div>
          <div v-else-if="groupCandidateList.length" class="group-add-member-modal__list">
            <div
              v-for="candidate in groupCandidateList"
              :key="candidate.userId"
              class="group-add-member-modal__friend"
              :class="{ 'group-add-member-modal__friend--selected': selectedCandidateIds.has(candidate.userId) }"
              @click="toggleCandidateSelection(candidate.userId)"
            >
              <UCheckbox
                :model-value="selectedCandidateIds.has(candidate.userId)"
                :disabled="updatingGroupMembers"
                @click.stop
                @update:model-value="toggleCandidateSelection(candidate.userId, Boolean($event))"
              />
              <UAvatar :src="candidate.avatarUrl" size="lg" class="rounded-full" />
              <div class="group-add-member-modal__friend-text">
                <strong>{{ candidate.name }}</strong>
                <span v-if="candidate.username">@{{ candidate.username }}</span>
                <span v-else>Có thể thêm vào nhóm</span>
              </div>
            </div>
          </div>
          <p v-else class="group-sub-panel__empty">
            Không tìm thấy bạn bè có thể thêm.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="group-add-member-modal__footer">
          <span>{{ selectedCandidateIds.size }} đã chọn</span>
          <div>
            <UButton color="neutral" variant="soft" :disabled="updatingGroupMembers" @click="closeAddMemberModal">
              Hủy
            </UButton>
            <UButton
              color="primary"
              icon="i-ph-user-plus-bold"
              :loading="updatingGroupMembers"
              :disabled="selectedCandidateIds.size === 0"
              @click="submitSelectedCandidates"
            >
              Mời
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  MessageContact,
  MessageGroupCandidate,
  MessageGroupDetails,
  MessageGroupMember,
  MessageItem,
} from "../../domain/types/messages.types"

const props = defineProps<{
  contact?: MessageContact | null
  groupCandidateQuery?: string
  groupCandidates?: MessageGroupCandidate[]
  groupCandidatesPending?: boolean
  groupDetails?: MessageGroupDetails | null
  groupDetailsPending?: boolean
  messages?: MessageItem[]
  updatingGroupDetails?: boolean
  updatingGroupMembers?: boolean
  deletingConversation?: boolean
  emptyDescription: string
  emptyTitle: string
}>()

const activePanel = ref<"info" | "members" | "storage" | "manage">("info")
const storageTab = ref<"media" | "files" | "links">("media")
const memberSearch = ref("")
const candidateSearchInput = ref<{ inputRef?: HTMLInputElement | null, $el?: HTMLElement | null } | null>(null)
const addMemberModalOpen = ref(false)
const selectedCandidateIds = ref(new Set<number>())
const editGroupModalOpen = ref(false)
const editGroupName = ref("")
const editGroupAvatar = ref<File | null>(null)
const editGroupAvatarPreview = ref("")
const emit = defineEmits<{
  "delete-conversation": []
  "update:group-candidate-query": [value: string]
  "update-group": [input: { name?: string, avatar?: File | null }]
  "add-group-member": [userId: number]
  "add-group-members": [userIds: number[]]
  "remove-group-member": [userId: number]
}>()

const isGroupContact = computed(() => props.contact?.type === "group")
const groupMembers = computed<MessageGroupMember[]>(() => {
  const detailedMembers = props.groupDetails?.members ?? []

  if (detailedMembers.length > 0) {
    return detailedMembers
  }

  return (props.contact?.members ?? []).map((name, index) => ({
    userId: -(index + 1),
    name,
    avatarUrl: "",
    isOwner: index === 0,
    isSelf: false,
  }))
})
const groupCandidateList = computed(() => props.groupCandidates ?? [])
const groupCanManage = computed(() => props.groupDetails?.canManage !== false)
const groupHasOnlineMember = computed(() =>
  Boolean(props.contact?.isOnline || groupMembers.value.some(member => !member.isSelf && member.isOnline)),
)
const mediaMessages = computed(() =>
  (props.messages ?? []).filter(message =>
    Boolean(message.mediaUrl)
    && (message.mediaType === "image" || message.mediaType === "gif" || message.mediaType === "video"),
  ),
)
const mediaPreviewItems = computed(() => mediaMessages.value.slice(0, 8))
const fileMessages = computed(() =>
  (props.messages ?? []).filter(message =>
    Boolean(message.mediaUrl)
    && !["image", "gif", "video"].includes(message.mediaType || ""),
  ),
)
const linkItems = computed(() => {
  const links: Array<{ id: string, url: string, title: string, host: string, dateLabel: string }> = []
  const matcher = /(https?:\/\/[^\s]+)/g

  for (const message of props.messages ?? []) {
    const matches = message.text.match(matcher) ?? []

    for (const url of matches) {
      links.push({
        id: `${message.id}:${url}`,
        url,
        title: buildLinkTitle(url),
        host: buildLinkHost(url),
        dateLabel: message.time || formatMessageDate(message.timestamp),
      })
    }
  }

  return links
})
const mediaGroups = computed(() => {
  const groups = new Map<string, MessageItem[]>()

  for (const item of mediaMessages.value) {
    const label = formatMessageDate(item.timestamp)
    groups.set(label, [...(groups.get(label) ?? []), item])
  }

  return [...groups.entries()].map(([label, items]) => ({ label, items }))
})
const filteredGroupMembers = computed(() => {
  const keyword = memberSearch.value.trim().toLowerCase()

  if (!keyword) {
    return groupMembers.value
  }

  return groupMembers.value.filter(member =>
    member.name.toLowerCase().includes(keyword)
    || (member.username || "").toLowerCase().includes(keyword),
  )
})
const managePermissions = [
  "Thay đổi tên & ảnh đại diện của nhóm",
  "Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại",
  "Tạo mới ghi chú, nhắc hẹn",
  "Tạo mới bình chọn",
  "Gửi tin nhắn",
]

const headerAvatarUrl = computed(() =>
  props.groupDetails?.avatarUrl || props.contact?.avatarUrl || "",
)

const headerName = computed(() =>
  props.groupDetails?.name || props.contact?.name || "",
)

const memberCountLabel = computed(() =>
  `${props.groupDetails?.memberCount ?? props.contact?.memberCount ?? 0} thành viên`,
)
const canSubmitEditGroup = computed(() =>
  Boolean(editGroupName.value.trim())
  && (
    editGroupName.value.trim() !== headerName.value
    || Boolean(editGroupAvatar.value)
  ),
)

watch(editGroupAvatar, (file) => {
  revokeEditGroupAvatarPreview()

  if (file) {
    editGroupAvatarPreview.value = URL.createObjectURL(file)
  }
})

watch(headerName, (name) => {
  if (editGroupModalOpen.value && name === editGroupName.value.trim()) {
    closeEditGroupModal()
  }
})

watch(headerAvatarUrl, (avatarUrl) => {
  if (editGroupModalOpen.value && editGroupAvatar.value && avatarUrl) {
    closeEditGroupModal()
  }
})

watch(groupCandidateList, (candidates) => {
  const availableIds = new Set(candidates.map(candidate => candidate.userId))

  selectedCandidateIds.value = new Set(
    [...selectedCandidateIds.value].filter(userId => availableIds.has(userId)),
  )
})

watch(addMemberModalOpen, (open) => {
  if (!open) {
    selectedCandidateIds.value = new Set()
  }
})

function openStorage(tab: "media" | "files" | "links") {
  storageTab.value = tab
  activePanel.value = "storage"
}

function focusCandidateSearch() {
  nextTick(() => {
    candidateSearchInput.value?.inputRef?.focus()
    candidateSearchInput.value?.$el?.querySelector<HTMLInputElement>("input")?.focus()
  })
}

function openAddMemberModal() {
  addMemberModalOpen.value = true
  emit("update:group-candidate-query", "")
  focusCandidateSearch()
}

function closeAddMemberModal() {
  addMemberModalOpen.value = false
}

function toggleCandidateSelection(userId: number, selected?: boolean) {
  if (props.updatingGroupMembers) {
    return
  }

  const next = new Set(selectedCandidateIds.value)
  const shouldSelect = selected ?? !next.has(userId)

  if (shouldSelect) {
    next.add(userId)
  }
  else {
    next.delete(userId)
  }

  selectedCandidateIds.value = next
}

function submitSelectedCandidates() {
  const userIds = [...selectedCandidateIds.value]

  if (userIds.length === 0 || props.updatingGroupMembers) {
    return
  }

  emit("add-group-members", userIds)
  closeAddMemberModal()
}

function revokeEditGroupAvatarPreview() {
  if (editGroupAvatarPreview.value.startsWith("blob:")) {
    URL.revokeObjectURL(editGroupAvatarPreview.value)
  }

  editGroupAvatarPreview.value = ""
}

function openEditGroupModal() {
  editGroupName.value = headerName.value
  editGroupAvatar.value = null
  revokeEditGroupAvatarPreview()
  editGroupModalOpen.value = true
}

function closeEditGroupModal() {
  editGroupModalOpen.value = false
  editGroupAvatar.value = null
  revokeEditGroupAvatarPreview()
}

function submitEditGroup() {
  if (!canSubmitEditGroup.value || props.updatingGroupDetails) {
    return
  }

  emit("update-group", {
    name: editGroupName.value.trim(),
    avatar: editGroupAvatar.value,
  })
}

function buildLinkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  }
  catch {
    return url
  }
}

function buildLinkTitle(url: string) {
  const host = buildLinkHost(url)

  if (host.includes("tiktok")) {
    return "TikTok"
  }

  if (host.includes("youtube") || host.includes("youtu.be")) {
    return "YouTube"
  }

  return host
}

function formatMessageDate(timestamp?: number) {
  if (!timestamp) {
    return "Không rõ ngày"
  }

  const date = new Date(timestamp * 1000)

  if (Number.isNaN(date.getTime())) {
    return "Không rõ ngày"
  }

  return `Ngày ${date.getDate()} Tháng ${date.getMonth() + 1}`
}

function updateGroupCandidateQuery(value: string | number) {
  const normalized = typeof value === "string" ? value : String(value ?? "")
  emit("update:group-candidate-query", normalized)
}

function canRemoveMember(member: MessageGroupMember) {
  return member.userId > 0 && groupCanManage.value && !member.isOwner && !member.isSelf
}

onBeforeUnmount(() => {
  revokeEditGroupAvatarPreview()
})
</script>

<style scoped>
.group-info-panel,
.group-sub-panel {
  min-height: 100%;
  background: #eef0f4;
  color: #16233a;
}

.group-info-panel__top,
.group-sub-panel__header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  min-height: 86px;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #d9dde5;
  background: #fff;
  padding: 18px;
}

.group-info-panel__top h2,
.group-sub-panel__header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.group-sub-panel__back,
.group-sub-panel__right,
.group-sub-panel__header-spacer {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.group-sub-panel__back {
  left: 18px;
  display: grid;
  height: 42px;
  width: 42px;
  place-items: center;
  border-radius: 999px;
  background: #eef0f4;
  color: #17243b;
  font-size: 22px;
}

.group-sub-panel__right,
.group-sub-panel__header-spacer {
  right: 18px;
  min-width: 42px;
  text-align: right;
  font-weight: 800;
}

.group-info-panel__hero,
.group-info-panel__section,
.group-sub-panel__body,
.group-storage,
.group-manage {
  background: #fff;
}

.group-info-panel__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 18px 20px;
}

.group-info-panel__avatar,
.group-info-panel__avatar-fallback {
  height: 72px;
  width: 72px;
  border: 3px solid #fff;
  border-radius: 999px;
  box-shadow: 0 0 0 2px #d9dde5;
}

.group-info-panel__avatar-fallback {
  display: grid;
  place-items: center;
  background: #dce6ff;
  color: #1e5ad7;
}

.group-info-panel__name-row {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-info-panel__name-row h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.group-info-panel__round-icon {
  display: grid;
  height: 32px;
  width: 32px;
  place-items: center;
  border-radius: 999px;
  background: #eef0f4;
  color: #536075;
  font-size: 18px;
}

.group-info-panel__round-icon:disabled,
.group-info-panel__quick-actions button:disabled,
.group-info-panel__section-title:disabled,
.group-info-panel__row:disabled,
.group-info-panel__see-all:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.group-info-panel__quick-actions {
  margin-top: 22px;
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.group-info-panel__quick-actions button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.group-info-panel__quick-actions span {
  display: grid;
  height: 44px;
  width: 44px;
  place-items: center;
  border-radius: 999px;
  background: #eef0f4;
  color: #17243b;
  font-size: 22px;
}

.group-info-panel__quick-actions em {
  max-width: 74px;
  color: #38455c;
  font-size: 14px;
  font-style: normal;
  line-height: 1.35;
}

.group-info-panel__section {
  margin-top: 8px;
  padding: 0 18px 18px;
}

.group-info-panel__section-title,
.group-info-panel__row,
.group-info-panel__toggle-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  color: #17243b;
  text-align: left;
}

.group-info-panel__section-title {
  justify-content: space-between;
  padding: 18px 0;
  font-size: 19px;
  font-weight: 800;
}

.group-info-panel__row,
.group-info-panel__toggle-row {
  padding: 12px 0;
  font-size: 16px;
}

.group-info-panel__row > svg,
.group-info-panel__toggle-row svg {
  flex: 0 0 auto;
  font-size: 24px;
}

.group-info-panel__row small {
  color: #8d96a8;
  font-size: 14px;
}

.group-info-panel__row--muted {
  color: #99a2b2;
}

.group-info-panel__toggle-row {
  justify-content: space-between;
}

.group-info-panel__toggle-row > span {
  display: flex;
  align-items: center;
  gap: 14px;
}

.group-info-panel__section--danger .group-info-panel__row:nth-child(n + 2) {
  color: #c53a35;
}

.group-info-panel__media-grid,
.group-storage__media section > div {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.group-info-panel__media-grid button,
.group-storage__media a {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  background: #eef0f4;
}

.group-info-panel__media-grid img,
.group-info-panel__media-grid video,
.group-storage__media img,
.group-storage__media video {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.group-info-panel__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 30px;
  text-shadow: 0 1px 8px rgb(0 0 0 / 55%);
}

.group-info-panel__see-all {
  margin-top: 16px;
  display: flex;
  min-height: 40px;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 4px;
  background: #e6e9ee;
  color: #17243b;
  font-size: 17px;
  font-weight: 800;
}

.group-info-panel__empty {
  margin: 0;
  padding: 4px 18px 12px;
  color: #667085;
  text-align: center;
  line-height: 1.5;
}

.group-info-panel__compact-list,
.group-info-panel__links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-info-panel__compact-list a,
.group-info-panel__links a {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #17243b;
}

.group-info-panel__compact-list svg {
  flex: 0 0 auto;
  font-size: 24px;
}

.group-info-panel__link-icon {
  display: grid;
  height: 50px;
  width: 50px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #d2d7df;
  border-radius: 6px;
  background: #eef0f4;
  font-size: 22px;
}

.group-info-panel__links a > span:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.group-info-panel__links strong,
.group-info-panel__links em {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-info-panel__links em,
.group-info-panel__links small {
  color: #1e5ad7;
  font-style: normal;
}

.group-info-panel__links small {
  color: #667085;
}

.group-sub-panel__body,
.group-storage,
.group-manage {
  min-height: calc(100vh - 86px);
  padding: 20px 18px;
}

.group-sub-panel__hint {
  padding: 10px 0;
  color: #667085;
  font-size: 14px;
}

.group-sub-panel__member-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.group-sub-panel__member {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  box-shadow: 0 1px 4px rgb(15 23 42 / 6%);
}

.group-sub-panel__member-main {
  min-width: 0;
  flex: 1;
}

.group-sub-panel__members-head {
  margin: 24px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 17px;
}

.group-sub-panel__member {
  min-height: 66px;
  padding: 10px;
}

.group-sub-panel__member-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-sub-panel__member-text {
  min-width: 0;
}

.group-sub-panel__member-text strong,
.group-sub-panel__member-text span {
  display: block;
}

.group-sub-panel__member-text strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 800;
}

.group-sub-panel__member-text span {
  color: #667085;
  font-size: 14px;
}

.group-sub-panel__member-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.group-sub-panel__empty {
  margin: 0;
  padding: 18px 8px;
  color: #667085;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
}

.group-storage__tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-bottom: 1px solid #d9dde5;
}

.group-storage__tabs button {
  padding: 0 0 14px;
  color: #17243b;
  font-size: 16px;
  font-weight: 800;
}

.group-storage__tabs button.active {
  border-bottom: 2px solid #1e5ad7;
  color: #1e5ad7;
}

.group-storage__filters {
  margin: 16px 0 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.group-storage__filters button {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  border-radius: 999px;
  background: #d9dde5;
  padding: 0 12px;
  color: #38455c;
}

.group-storage__media section + section {
  margin-top: 30px;
}

.group-storage__media h3 {
  margin: 0 0 18px;
  font-size: 18px;
  font-weight: 800;
}

.group-manage {
  padding-inline: 0;
}

.group-manage > p {
  margin: -20px 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #e6e9ee;
  padding: 14px 18px;
  color: #38455c;
  font-weight: 700;
}

.group-manage h3,
.group-manage__permission,
.group-manage .group-info-panel__toggle-row {
  padding-inline: 20px;
}

.group-manage h3 {
  margin: 0 0 14px;
  color: #8d96a8;
  font-size: 17px;
  font-weight: 800;
}

.group-manage__permission {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #8d96a8;
  font-size: 16px;
  font-weight: 700;
}

.group-manage .group-info-panel__toggle-row {
  border-top: 1px solid #d9dde5;
  color: #8d96a8;
  font-weight: 800;
}

.group-edit-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.group-edit-form__avatar {
  display: flex;
  justify-content: center;
}

.group-edit-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #17243b;
  font-size: 14px;
  font-weight: 700;
}

.group-edit-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.group-add-member-modal {
  display: flex;
  max-height: min(68vh, 560px);
  flex-direction: column;
  overflow-y: auto;
  padding: 2px 0;
}

.group-add-member-modal__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.group-add-member-modal__friend {
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  box-shadow: 0 1px 4px rgb(15 23 42 / 6%);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.group-add-member-modal__friend:hover,
.group-add-member-modal__friend--selected {
  border-color: #bcd1ff;
  background: #f5f8ff;
}

.group-add-member-modal__friend-text {
  min-width: 0;
  flex: 1;
}

.group-add-member-modal__friend-text strong,
.group-add-member-modal__friend-text span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-add-member-modal__friend-text strong {
  color: #17243b;
  font-size: 15px;
  font-weight: 800;
}

.group-add-member-modal__friend-text span {
  color: #667085;
  font-size: 13px;
}

.group-add-member-modal__footer {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-add-member-modal__footer > span {
  color: #667085;
  font-size: 14px;
  font-weight: 700;
}

.group-add-member-modal__footer > div {
  display: flex;
  gap: 8px;
}
</style>
