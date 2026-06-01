<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-6 shadow-[0_12px_30px_rgba(15,35,110,0.06)] transition-all hover:shadow-[0_16px_40px_rgba(15,35,110,0.09)]">
    <!-- Header with count badge and Approve All button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
          {{ t("community.settings.defaultEyebrow") }}
        </p>
        <h3 class="mt-2 text-[1.2rem] font-black tracking-[-0.03em] text-[#243b63]">
          {{ t("community.settings.requests.title") }}
        </h3>
        <p class="mt-1 text-[13px] text-slate-400">
          {{ t("community.settings.requests.desc") }}
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0 self-start sm:self-center">
        <UBadge
          v-if="requests.length > 0"
          color="primary"
          variant="subtle"
          class="rounded-full px-3 py-1.5 text-[12px] font-black"
        >
          {{ requests.length }}
        </UBadge>

        <UButton
          v-if="requests.length > 0"
          color="primary"
          variant="solid"
          size="md"
          class="rounded-full font-extrabold px-4.5 py-2 text-[12px] shadow-sm hover:shadow transition-all whitespace-nowrap min-w-[120px] justify-center"
          :loading="loading"
          @click="emit('approveAll')"
        >
          <template #leading>
            <Icon name="i-ph-checks-bold" class="h-4.5 w-4.5" />
          </template>
          Duyệt tất cả
        </UButton>
      </div>
    </div>

    <!-- Requests list -->
    <div v-if="loading" class="mt-6 flex flex-col items-center justify-center py-10 space-y-3">
      <Icon name="i-ph-spinner-gap-bold" class="h-8 w-8 animate-spin text-[#1d4ed8]" />
      <p class="text-[13px] text-slate-400 font-medium">Đang tải danh sách...</p>
    </div>

    <div v-else-if="requests.length > 0" class="mt-6 space-y-3.5">
      <div
        v-for="user in visibleRequests"
        :key="user.id"
        class="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[20px] bg-[#fbfcff] border border-slate-100/50 p-4 transition-all hover:border-[#dbeafe] hover:bg-[#f6f9ff]"
      >
        <!-- User Info -->
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="relative shrink-0">
            <img
              v-if="user.avatarUrl"
              :src="user.avatarUrl"
              class="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
            <div
              v-else
              class="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dbeafe_0%,#eef2ff_100%)] text-[14px] font-black text-[#1d4ed8] shadow-sm"
            >
              {{ getInitials(user.name) }}
            </div>
            <span
              v-if="user.verified"
              class="absolute -bottom-1 -right-1 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#1d4ed8] text-white ring-2 ring-white"
            >
              <Icon name="i-ph-seal-check-fill" class="h-3.5 w-3.5" />
            </span>
          </div>

          <div class="min-w-0">
            <p class="truncate text-[14px] font-extrabold text-[#243b63] transition-colors group-hover:text-[#1d4ed8]">
              {{ user.name }}
            </p>
            <p class="mt-0.5 truncate text-[12px] text-slate-400">
              @{{ user.username }}
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 sm:self-center">
          <!-- Decline -->
          <UButton
            color="neutral"
            variant="outline"
            size="md"
            class="rounded-full font-extrabold px-4 py-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-[13px] min-w-[120px] justify-center whitespace-nowrap"
            :loading="processingId === user.id && activeAction === 'decline'"
            :disabled="processingId !== null"
            @click="onAction(user.id, 'decline')"
          >
            <template #leading>
              <Icon name="i-ph-x-bold" class="h-4.5 w-4.5" />
            </template>
            {{ t("community.settings.requests.decline") }}
          </UButton>

          <!-- Accept -->
          <UButton
            color="primary"
            variant="solid"
            size="md"
            class="rounded-full font-extrabold px-4 py-2 shadow-sm hover:shadow transition-all text-[13px] min-w-[120px] justify-center whitespace-nowrap"
            :loading="processingId === user.id && activeAction === 'accept'"
            :disabled="processingId !== null"
            @click="onAction(user.id, 'accept')"
          >
            <template #leading>
              <Icon name="i-ph-check-bold" class="h-4.5 w-4.5" />
            </template>
            {{ t("community.settings.requests.accept") }}
          </UButton>
        </div>
      </div>

      <!-- Action buttons for pagination -->
      <div v-if="hasMore || visibleCount > INITIAL_LIMIT" class="mt-5 flex items-center justify-center gap-3 pt-2">
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
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1d4ed8] shadow-sm mb-4">
        <Icon name="i-ph-users-four-bold" class="h-8 w-8" />
      </div>
      <h4 class="text-[14px] font-black text-[#243b63]">
        {{ t("community.settings.requests.emptyState") }}
      </h4>
      <p class="mt-1 text-[12px] text-slate-400 max-w-[280px]">
        Khi có thành viên mới gửi yêu cầu tham gia, danh sách sẽ xuất hiện tại đây để bạn kiểm duyệt.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UserRecord } from "../../../shared-kernel/domain/types/user.types"

const { t } = useI18n()

const props = defineProps<{
  requests: UserRecord[]
  loading?: boolean
}>()

const INITIAL_LIMIT = 5
const visibleCount = ref(INITIAL_LIMIT)
const visibleRequests = computed(() => props.requests.slice(0, visibleCount.value))
const hasMore = computed(() => props.requests.length > visibleCount.value)

function showMore() {
  visibleCount.value += 10
}

function collapse() {
  visibleCount.value = INITIAL_LIMIT
}

const emit = defineEmits<{
  action: [userId: number, action: "accept" | "decline"]
  approveAll: []
}>()

const processingId = ref<number | null>(null)
const activeAction = ref<"accept" | "decline" | null>(null)

async function onAction(userId: number, action: "accept" | "decline") {
  processingId.value = userId
  activeAction.value = action
  try {
    await emit("action", userId, action)
  } finally {
    processingId.value = null
    activeAction.value = null
  }
}

function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
}
</script>
