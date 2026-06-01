<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-6 shadow-[0_12px_30px_rgba(15,35,110,0.06)] transition-all hover:shadow-[0_16px_40px_rgba(15,35,110,0.09)]">
    <!-- Header with count and search input -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
          {{ t("community.settings.defaultEyebrow") }}
        </p>
        <h3 class="mt-2 text-[1.2rem] font-black tracking-[-0.03em] text-[#243b63]">
          {{ t("community.settings.members.title") }}
        </h3>
        <p class="mt-1 text-[13px] text-slate-400">
          {{ t("community.settings.members.desc") }}
        </p>
      </div>

      <div class="flex items-center gap-3 self-start sm:self-center">
        <!-- Search bar -->
        <UInput
          v-model="searchQuery"
          type="text"
          icon="i-ph-magnifying-glass-bold"
          size="md"
          color="neutral"
          variant="outline"
          :placeholder="t('community.settings.members.searchPlaceholder')"
          class="w-full sm:w-64"
          :ui="{ rounded: 'rounded-full' }"
        />
      </div>
    </div>

    <!-- Members list -->
    <div v-if="loading" class="mt-6 flex flex-col items-center justify-center py-10 space-y-3">
      <Icon name="i-ph-spinner-gap-bold" class="h-8 w-8 animate-spin text-[#1d4ed8]" />
      <p class="text-[13px] text-slate-400 font-medium">Đang tải danh sách thành viên...</p>
    </div>

    <div v-else-if="filteredMembers.length > 0" class="mt-6 divide-y divide-slate-100">
      <div
        v-for="user in visibleMembers"
        :key="user.id"
        class="group flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
      >
        <!-- User Info -->
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="relative shrink-0">
            <img
              v-if="user.avatarUrl"
              :src="user.avatarUrl"
              class="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
            <div
              v-else
              class="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dbeafe_0%,#eef2ff_100%)] text-[13px] font-black text-[#1d4ed8] shadow-sm"
            >
              {{ getInitials(user.name) }}
            </div>
            <span
              v-if="user.verified"
              class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d4ed8] text-white ring-2 ring-white"
            >
              <Icon name="i-ph-seal-check-fill" class="h-3 w-3" />
            </span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="truncate text-[13.5px] font-bold text-[#243b63] transition-colors group-hover:text-[#1d4ed8]">
                {{ user.name }}
              </p>
              <!-- Owner Badge -->
              <span
                v-if="user.isAdmin"
                class="rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-600/90"
              >
                Chủ nhóm
              </span>
            </div>
            <p class="mt-0.5 truncate text-[11.5px] text-slate-400">
              @{{ user.username }}
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 shrink-0">
          <!-- Kick/Delete Member (Only for non-admin members) -->
          <UButton
            v-if="!user.isAdmin"
            color="error"
            variant="soft"
            size="sm"
            class="rounded-full font-bold px-3 py-1.5 min-w-[120px] justify-center whitespace-nowrap"
            :loading="processingId === user.id"
            :disabled="processingId !== null"
            @click="onKick(user.id)"
          >
            <template #leading>
              <Icon name="i-ph-user-minus-bold" class="h-3.5 w-3.5" />
            </template>
            {{ t("community.settings.members.kick") }}
          </UButton>
        </div>
      </div>

      <!-- Action buttons for pagination -->
      <div v-if="hasMore || visibleCount > INITIAL_LIMIT" class="mt-5 flex items-center justify-center gap-3 pt-4">
        <UButton
          v-if="hasMore"
          color="neutral"
          variant="outline"
          size="md"
          class="rounded-full px-6 font-bold shadow-sm hover:shadow transition-all text-[12px]"
          @click="showMore"
        >
          <Icon name="i-ph-caret-double-down-bold" class="mr-1.5 h-4 w-4 text-slate-500" />
          Xem thêm
        </UButton>

        <UButton
          v-if="visibleCount > INITIAL_LIMIT"
          color="neutral"
          variant="outline"
          size="md"
          class="rounded-full px-6 font-bold shadow-sm hover:shadow transition-all text-[12px]"
          @click="collapse"
        >
          <Icon name="i-ph-caret-double-up-bold" class="mr-1.5 h-4 w-4 text-slate-500" />
          Rút gọn
        </UButton>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="mt-6 flex flex-col items-center justify-center rounded-[20px] bg-slate-50/50 border border-dashed border-slate-200 py-10 px-4 text-center transition-all hover:bg-slate-50"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 shadow-sm mb-4">
        <Icon name="i-ph-users-bold" class="h-8 w-8" />
      </div>
      <h4 class="text-[14px] font-black text-[#243b63]">
        {{ t("community.settings.members.emptyState") }}
      </h4>
      <p class="mt-1 text-[12px] text-slate-400 max-w-[280px]">
        {{ searchQuery ? 'Không có thành viên nào khớp với từ khóa tìm kiếm.' : 'Nhóm này hiện chưa có thành viên nào tham gia.' }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UserRecord } from "../../../shared-kernel/domain/types/user.types"

const { t } = useI18n()

const props = defineProps<{
  members: (UserRecord & { isAdmin?: boolean })[]
  loading?: boolean
}>()

const emit = defineEmits<{
  kick: [userId: number]
}>()

const searchQuery = ref("")
const processingId = ref<number | null>(null)

const filteredMembers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return props.members

  return props.members.filter(
    member =>
      member.name.toLowerCase().includes(query) ||
      member.username.toLowerCase().includes(query),
  )
})

const INITIAL_LIMIT = 5
const visibleCount = ref(INITIAL_LIMIT)
const visibleMembers = computed(() => filteredMembers.value.slice(0, visibleCount.value))
const hasMore = computed(() => filteredMembers.value.length > visibleCount.value)

function showMore() {
  visibleCount.value += 10
}

function collapse() {
  visibleCount.value = INITIAL_LIMIT
}

watch(searchQuery, () => {
  visibleCount.value = INITIAL_LIMIT
})

async function onKick(userId: number) {
  processingId.value = userId
  try {
    await emit("kick", userId)
  } finally {
    processingId.value = null
  }
}

function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
}
</script>
