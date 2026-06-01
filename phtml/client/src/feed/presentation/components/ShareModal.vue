<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        @click.self="$emit('close')">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')" />

        <Transition enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-6 scale-[0.97]" enter-to-class="opacity-100 translate-y-0 scale-100">
          <div v-if="open"
            class="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_-8px_50px_rgba(0,0,255,0.13)] max-h-full">
            <div class="relative flex shrink-0 items-center justify-between overflow-hidden border-b border-slate-50 px-6 py-6">
              <!-- Wavy Background Decor -->
              <div class="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <svg viewBox="0 0 500 150" preserveAspectRatio="none" class="h-full w-full">
                  <defs>
                    <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style="stop-color: #e0e7ff; stop-opacity: 1" />
                      <stop offset="100%" style="stop-color: #e0f2fe; stop-opacity: 1" />
                    </linearGradient>
                  </defs>
                  <path d="M0,130 C180,200 350,0 500,110 L500,0 L0,0 Z" fill="url(#wave-gradient)"></path>
                </svg>
              </div>
              
              <div class="relative z-10 flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center text-[var(--color-primary-600)]">
                  <Icon name="i-ph-share-network-duotone" class="h-8 w-8" />
                </div>
                <div class="flex flex-col">
                  <span class="block text-lg font-black text-slate-800 leading-none mb-1.5">{{
                    t("feed.shareModal.title") }}</span>
                  <span class="block text-[13px] text-slate-400 font-bold leading-none tracking-tight">{{
                    t("feed.shareModal.subtitle") }}</span>
                </div>
              </div>
              <button
                class="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90 cursor-pointer"
                @click="$emit('close')">
                <Icon name="i-ph-x-bold" class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 space-y-5 overflow-y-auto p-5">
              <UAlert v-if="status !== 'idle' && statusMessage" class="rounded-[18px]"
                :color="status === 'error' ? 'warning' : status === 'success' ? 'success' : 'primary'" variant="subtle"
                :icon="status === 'error'
                  ? 'i-ph-warning-circle-fill'
                  : status === 'success'
                    ? 'i-ph-check-circle-fill'
                    : 'i-ph-spinner-gap-bold'" :description="statusMessage" />

              <div>
                <p class="mb-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">{{
                  t("feed.shareModal.shareVia") }}</p>
                <div class="flex flex-row items-center justify-between gap-1">
                  <button v-for="platform in platforms" :key="platform.label"
                    class="group flex flex-1 flex-col items-center justify-center gap-3 transition-all active:scale-90 cursor-pointer"
                    type="button" @click="platform.action">
                    <Icon :name="platform.icon" class="h-12 w-12 transition-all group-hover:scale-110"
                      :style="{ color: platform.color }" />
                    <span
                      class="text-[10px] font-black text-slate-400 group-hover:text-slate-900 uppercase tracking-tighter">{{
                        platform.label }}</span>
                  </button>
                </div>

                <Transition enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-150" leave-to-class="opacity-0">
                  <div v-if="copied"
                    class="mt-4 flex items-center gap-2 rounded-[16px] border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-4 py-3 text-[13px] font-bold text-[var(--color-primary-600)] shadow-sm">
                    <Icon name="i-ph-check-circle-fill" class="h-5 w-5 shrink-0" />
                    {{ t("feed.shareModal.copied") }}
                  </div>
                </Transition>
              </div>

              <div class="flex items-center gap-4 py-1">
                <div class="h-px flex-1 bg-slate-100" />
                <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">{{
                  t("feed.shareModal.orShareTo") }}</span>
                <div class="h-px flex-1 bg-slate-100" />
              </div>

              <div>
                <UTextarea v-slot="{ focus }" v-model="caption" autoresize :rows="4"
                  :placeholder="t('feed.shareModal.captionPlaceholder')" class="w-full" :ui="{
                    base: 'min-h-[160px] resize-none rounded-[28px] border-slate-100/30 bg-slate-50/20 px-8 py-7 text-[15px] leading-relaxed text-slate-700 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-[var(--color-primary-500)] transition-all',
                  }" />
              </div>

              <div>
                <p class="mb-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">{{
                  t("feed.shareModal.destinationTitle") }}</p>
                <div class="flex flex-row items-center justify-between gap-3">
                  <button v-for="dest in destinations" :key="dest.value"
                    class="group flex flex-1 flex-col items-center gap-3 py-5 text-center transition-all duration-300 cursor-pointer"
                    type="button" @click="selectDestination(dest.value)">
                    <Icon :name="dest.icon" class="h-8 w-8 transition-all duration-300"
                      :class="selectedDestination === dest.value ? 'scale-110' : 'text-slate-200 group-hover:text-slate-400'"
                      :style="selectedDestination === dest.value ? { color: 'rgba(0, 0, 255, 0.55)' } : {}" />
                    <span class="text-[11px] font-black leading-tight uppercase tracking-tighter transition-colors"
                      :class="selectedDestination === dest.value ? '' : 'text-slate-400 group-hover:text-slate-600'"
                      :style="selectedDestination === dest.value ? { color: 'rgba(0, 0, 255, 0.55)' } : {}">{{
                        dest.label }}</span>
                  </button>
                </div>

                <div class="mt-3 rounded-[24px] border border-slate-100 bg-slate-50/40 p-4">
                  <div class="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p class="text-[15px] font-black text-slate-800">{{ destinationPanelTitle }}</p>
                      <p class="mt-1 text-[12px] font-semibold leading-relaxed text-slate-400">
                        {{ destinationPanelDescription }}
                      </p>
                    </div>
                    <Icon :name="destinationPanelIcon" class="h-6 w-6 shrink-0 text-[var(--color-primary-500)]" />
                  </div>

                  <div v-if="selectedDestination === 'timeline'" class="rounded-[18px] bg-white p-3 shadow-sm">
                    <div class="flex items-center gap-3">
                      <img
                        v-if="currentProfileTarget.avatarUrl"
                        :src="currentProfileTarget.avatarUrl"
                        class="h-11 w-11 rounded-full object-cover"
                        :alt="currentProfileTarget.title"
                      />
                      <div
                        v-else
                        class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[13px] font-black text-white"
                      >
                        {{ currentProfileTarget.initials }}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-[14px] font-black text-slate-800">{{ currentProfileTarget.title }}</p>
                        <p class="truncate text-[12px] font-bold text-slate-400">{{ currentProfileTarget.subtitle }}</p>
                      </div>
                      <Icon name="i-ph-check-circle-fill" class="ml-auto h-5 w-5 text-[var(--color-primary-500)]" />
                    </div>
                  </div>

                  <div v-else class="space-y-3">
                    <UInput
                      v-if="selectedDestination === 'page'"
                      v-model="pageSearch"
                      size="lg"
                      icon="i-ph-magnifying-glass-bold"
                      :placeholder="t('feed.shareModal.pageSearchPlaceholder')"
                      :ui="{ base: 'rounded-[18px] bg-white font-bold' }"
                    />
                    <UInput
                      v-else-if="selectedDestination === 'group'"
                      v-model="groupSearch"
                      size="lg"
                      icon="i-ph-magnifying-glass-bold"
                      :placeholder="t('feed.shareModal.groupSearchPlaceholder')"
                      :ui="{ base: 'rounded-[18px] bg-white font-bold' }"
                    />
                    <UInput
                      v-else
                      v-model="messageSearch"
                      size="lg"
                      icon="i-ph-magnifying-glass-bold"
                      :placeholder="t('feed.shareModal.messageSearchPlaceholder')"
                      :ui="{ base: 'rounded-[18px] bg-white font-bold' }"
                    />

                    <div v-if="destinationPending" class="flex items-center gap-2 rounded-[18px] bg-white px-4 py-3 text-[13px] font-bold text-slate-400">
                      <Icon name="i-ph-spinner-gap-bold" class="h-4 w-4 animate-spin" />
                      {{ t("feed.shareModal.searchLoading") }}
                    </div>
                    <div v-else-if="destinationTargets.length" class="max-h-56 space-y-2 overflow-y-auto pr-1">
                      <button
                        v-for="target in destinationTargets"
                        :key="`${target.kind}-${target.id}`"
                        type="button"
                        class="flex w-full items-center gap-3 rounded-[18px] bg-white p-3 text-left shadow-sm transition-all hover:bg-slate-50 active:scale-[0.99]"
                        :class="selectedTargetId === target.id ? 'ring-2 ring-[var(--color-primary-400)]' : 'ring-1 ring-transparent'"
                        @click="selectTarget(target.id)"
                      >
                        <img
                          v-if="target.avatarUrl"
                          :src="target.avatarUrl"
                          class="h-10 w-10 rounded-full object-cover"
                          :alt="target.title"
                        />
                        <div
                          v-else
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-black text-slate-500"
                        >
                          {{ target.initials }}
                        </div>
                        <div class="min-w-0">
                          <p class="truncate text-[14px] font-black text-slate-800">{{ target.title }}</p>
                          <p class="truncate text-[12px] font-bold text-slate-400">{{ target.subtitle }}</p>
                        </div>
                        <Icon
                          v-if="selectedTargetId === target.id"
                          name="i-ph-check-circle-fill"
                          class="ml-auto h-5 w-5 shrink-0 text-[var(--color-primary-500)]"
                        />
                      </button>
                    </div>
                    <div v-else class="rounded-[18px] bg-white px-4 py-4 text-center text-[13px] font-bold text-slate-400">
                      {{ destinationEmptyMessage }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="post || true">
                <p class="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">{{
                  t("feed.shareModal.previewLabel") }}</p>
                <div class="group rounded-[32px] border border-slate-100/30 bg-slate-50/30 p-5 transition-all hover:bg-slate-50/50">
                  <div class="flex items-center gap-4">
                    <div class="relative">
                      <div class="relative h-11 w-11 shrink-0 transition-transform duration-500 group-hover:scale-105">
                        <img
                          v-if="post?.authorAvatar"
                          :src="post.authorAvatar"
                          class="h-full w-full rounded-full object-cover shadow-sm"
                          :alt="post.author"
                        />
                        <div
                          v-else
                          class="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[15px] font-black text-white shadow-sm"
                        >
                          {{ postAuthorInitials }}
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <div class="flex items-center gap-1.5 mb-1">
                        <p class="truncate text-[15px] font-bold text-slate-800 tracking-tight">{{ post?.author ||
                          'Người dùng' }}</p>
                        <Icon v-if="post?.authorVerified" name="i-ph-seal-check-fill" class="h-4 w-4 text-blue-500 shrink-0" />
                      </div>
                      <p class="line-clamp-1 text-[13px] text-slate-500 font-medium leading-none">
                        {{ post?.text || t('feed.shareModal.previewLabel') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="shrink-0 p-0 overflow-hidden rounded-b-[28px]">
              <UButton size="lg" block
                class="rounded-none font-black text-[18px] tracking-wide shadow-none transition-all hover:brightness-110 active:scale-[0.99] text-white border-none cursor-pointer"
                :style="{ 
                  background: 'linear-gradient(to right, rgb(107, 141, 226), rgb(0 0 0 / 56%))',
                  height: '60px'
                }"
                :loading="status === 'loading'" :disabled="status === 'loading' || !canShare" @click="onShare">
                <Transition mode="out-in" enter-active-class="transition duration-150"
                  enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                  <span v-if="shared" class="flex items-center gap-2.5">
                    <Icon name="i-ph-check-circle-fill" class="h-6 w-6" /> {{ t("feed.shareModal.shared") }}
                  </span>
                  <span v-else class="flex items-center gap-2.5">
                    <Icon name="i-ph-paper-plane-tilt-fill" class="h-6 w-6" /> {{ status === "loading" ?
                      t("feed.shareModal.submitLoading") : t("feed.shareModal.submit") }}
                  </span>
                </Transition>
              </UButton>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  useFeedShareModalVM,
} from "../../application/view-models/useFeedShareModalVM"
import type { FeedShareDestination } from "../../domain/types/feed-share.types"

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()
const toast = useToast()

const props = withDefaults(defineProps<{
  open?: boolean
  shareUrl?: string
  post?: {
    id?: number
    author: string
    text: string
    authorAvatar?: string
    authorVerified?: boolean
  } | null
}>(), {
  open: false,
  shareUrl: "",
  post: null,
})

type ShareStatus = "idle" | "loading" | "success" | "error"

const emit = defineEmits<{ close: []; shared: [destination: string] }>()

const copied = ref(false)

const caption = ref("")
const shared = ref(false)
const status = ref<ShareStatus>("idle")
const {
  selectedDestination,
  selectedTargetId,
  selectedTarget,
  currentProfileTarget,
  pageSearch,
  groupSearch,
  messageSearch,
  destinationTargets,
  destinationPending,
  canShare,
  selectDestination,
  selectTarget,
  submitShare,
  reset: resetShareDestination,
} = useFeedShareModalVM(toRef(props, "open"))

const pageUrl = computed(() =>
  props.shareUrl || new URL(route.fullPath || route.path || "/", requestURL.origin).toString(),
)
const shareText = computed(() => caption.value || props.post?.text || '')

const platforms = computed(() => [
  {
    label: "Facebook",
    icon: "i-ph-facebook-logo-fill",
    color: "#1877F2",
    action: () => openPlatform(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl.value)}`),
  },
  {
    label: "WhatsApp",
    icon: "i-ph-whatsapp-logo-fill",
    color: "#25D366",
    action: () => openPlatform(`https://wa.me/?text=${encodeURIComponent(shareText.value + " " + pageUrl.value)}`),
  },
  {
    label: "Telegram",
    icon: "i-ph-telegram-logo-fill",
    color: "#0088cc",
    action: () => openPlatform(`https://t.me/share/url?url=${encodeURIComponent(pageUrl.value)}&text=${encodeURIComponent(shareText.value)}`),
  },
  {
    label: t("feed.shareModal.platformCopy"),
    icon: "i-ph-link-bold",
    color: "#64748b",
    action: copyShareLink,
  },
])

const destinations = computed(() => [
  { label: t("feed.shareModal.destinationTimeline"), value: "timeline" as FeedShareDestination, icon: "i-ph-rows-duotone" },
  { label: t("feed.shareModal.destinationPage"), value: "page" as FeedShareDestination, icon: "i-ph-flag-duotone" },
  { label: t("feed.shareModal.destinationGroup"), value: "group" as FeedShareDestination, icon: "i-ph-users-three-duotone" },
  { label: t("feed.shareModal.destinationMessage"), value: "message" as FeedShareDestination, icon: "i-ph-paper-plane-tilt-duotone" },
])

const destinationPanelTitle = computed(() => {
  if (selectedDestination.value === "page") return t("feed.shareModal.pagePanelTitle")
  if (selectedDestination.value === "group") return t("feed.shareModal.groupPanelTitle")
  if (selectedDestination.value === "message") return t("feed.shareModal.messagePanelTitle")

  return t("feed.shareModal.timelinePanelTitle")
})

const destinationPanelDescription = computed(() => {
  if (selectedDestination.value === "page") return t("feed.shareModal.pagePanelDescription")
  if (selectedDestination.value === "group") return t("feed.shareModal.groupPanelDescription")
  if (selectedDestination.value === "message") return t("feed.shareModal.messagePanelDescription")

  return t("feed.shareModal.timelinePanelDescription")
})

const destinationPanelIcon = computed(() => {
  if (selectedDestination.value === "page") return "i-ph-flag-duotone"
  if (selectedDestination.value === "group") return "i-ph-users-three-duotone"
  if (selectedDestination.value === "message") return "i-ph-paper-plane-tilt-duotone"

  return "i-ph-user-circle-duotone"
})

const destinationEmptyMessage = computed(() => {
  if (selectedDestination.value === "page") return t("feed.shareModal.pageEmpty")
  if (selectedDestination.value === "group") return t("feed.shareModal.groupEmpty")

  return t("feed.shareModal.messageEmpty")
})

const statusMessage = computed(() => {
  if (status.value === "loading") return t("feed.shareModal.submitLoading")
  if (status.value === "success") return t("feed.shareModal.shared")
  if (status.value === "error") return t("feed.shareModal.shareFailed")

  return ""
})

const postAuthorInitials = computed(() => {
  const name = props.post?.author || "VN"
  const parts = name.split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map(part => part.slice(0, 1).toUpperCase())
    .join("")

  return initials || "VN"
})

async function copyShareLink() {
  if (!import.meta.client || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    toast.add({
      color: "warning",
      icon: "i-ph-warning-circle-fill",
      title: t("feed.shareModal.title"),
      description: t("feed.shareModal.copyUnavailable"),
    })
    return
  }

  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copied.value = true
    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: t("feed.shareModal.title"),
      description: t("feed.shareModal.copied"),
    })
    setTimeout(() => (copied.value = false), 2000)
  }
  catch (err) {
    toast.add({
      color: "warning",
      icon: "i-ph-warning-circle-fill",
      title: t("feed.shareModal.title"),
      description: t("feed.shareModal.copyUnavailable"),
    })
  }
}

function openPlatform(url: string) {
  if (!import.meta.client) return

  window.open(url, "_blank", "noopener,noreferrer")
}

async function onShare() {
  if (!canShare.value) return

  status.value = "loading"

  try {
    const result = await submitShare({
      caption: caption.value,
      postText: props.post?.text,
      postId: props.post?.id,
    })

    shared.value = true
    status.value = "success"

    toast.add({
      color: "success",
      icon: "i-ph-share-network-fill",
      title: t("feed.shareModal.title"),
      description: t("feed.shareModal.shared"),
    })

    emit("shared", result.destination)

    setTimeout(() => {
      shared.value = false
      emit('close')
    }, 1400)
  }
  catch {
    status.value = "error"
    toast.add({
      color: "warning",
      icon: "i-ph-warning-circle-fill",
      title: t("feed.shareModal.title"),
      description: t("feed.shareModal.shareFailed"),
    })
  }
}

watch(() => props.open, (val) => {
  if (!val) {
    setTimeout(() => {
      caption.value = ''
      shared.value = false
      status.value = "idle"
      resetShareDestination()
    }, 200)
  }
})
</script>
