<!-- English description: Header notification dropdown that renders backend-backed notification items. -->

<template>
  <section class="notification-dropdown">
    <header class="notification-dropdown__header">
      <h2>Thông báo</h2>
      <button
        type="button"
        class="notification-dropdown__menu"
        aria-label="Tùy chọn thông báo"
        :aria-expanded="optionsOpen"
        @click="optionsOpen = !optionsOpen"
      >
        <Icon name="i-ph-dots-three-bold" class="h-5 w-5" />
      </button>

      <div v-if="optionsOpen" class="notification-dropdown__options">
        <button
          type="button"
          class="notification-dropdown__option"
          @click="markAllRead"
        >
          <Icon name="i-ph-check-circle-duotone" class="h-5 w-5" />
          <span>Đánh dấu tất cả là đã đọc</span>
        </button>
      </div>
    </header>

    <div class="notification-dropdown__tabs" role="tablist" aria-label="Bộ lọc thông báo">
      <button
        type="button"
        class="notification-dropdown__tab"
        :class="{ 'notification-dropdown__tab--active': activeFilter === 'all' }"
        role="tab"
        :aria-selected="activeFilter === 'all'"
        @click="activeFilter = 'all'"
      >
        Tất cả
      </button>
      <button
        type="button"
        class="notification-dropdown__tab"
        :class="{ 'notification-dropdown__tab--active': activeFilter === 'unread' }"
        role="tab"
        :aria-selected="activeFilter === 'unread'"
        @click="activeFilter = 'unread'"
      >
        Chưa đọc
      </button>
    </div>

    <div v-if="store.loading && store.items.length === 0" class="notification-dropdown__empty">
      {{ $t("notifications.center.loading") }}
    </div>

    <div v-else-if="filteredItems.length === 0" class="notification-dropdown__empty">
      <Icon name="i-ph-bell-slash-duotone" class="notification-dropdown__empty-icon" />
      <span>{{ activeFilter === "unread" ? "Không có thông báo chưa đọc." : $t("notifications.center.empty") }}</span>
    </div>

    <div v-else class="notification-dropdown__list">
      <template v-for="group in groupedItems" :key="group.key">
        <div class="notification-dropdown__section">
          <h3>{{ group.label }}</h3>
          <button
            v-if="group.key === 'previous' && activeFilter === 'all'"
            type="button"
            class="notification-dropdown__see-all"
          >
            Xem tất cả
          </button>
        </div>

        <article
          v-for="item in group.items"
          :key="item.id"
          class="notification-dropdown__item"
          :class="{ 'notification-dropdown__item--unread': item.isUnread }"
        >
          <button
            type="button"
            class="notification-dropdown__link"
            @click="openNotification(item)"
          >
            <span class="notification-dropdown__avatar-wrap">
              <NuxtImg
                v-if="item.avatarUrl"
                :src="item.avatarUrl"
                :alt="item.title"
                class="notification-dropdown__avatar"
                width="52"
                height="52"
              />
              <span v-else class="notification-dropdown__avatar notification-dropdown__avatar--icon">
                <Icon name="i-ph-user-fill" class="h-7 w-7" />
              </span>
              <span class="notification-dropdown__type-badge" :class="item.badgeClass">
                <Icon :name="item.badgeIcon" class="h-4 w-4" />
              </span>
            </span>

            <span class="notification-dropdown__content">
              <span class="notification-dropdown__message">
                <strong class="notification-dropdown__message-title">{{ item.displayTitle }}</strong>
                <span class="notification-dropdown__message-body">{{ item.displayBody }}</span>
              </span>
              <small>{{ item.timeText }}</small>
            </span>
          </button>
          <span
            v-if="item.isUnread"
            class="notification-dropdown__unread-dot"
            aria-label="Chưa đọc"
          />
        </article>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { NotificationItem } from "../../domain/types/notification.types"
import { useNotificationCenterStore } from "../../application/stores/useNotificationCenterStore"

type DisplayNotificationItem = NotificationItem & {
  displayTitle: string
  displayBody: string
  badgeIcon: string
  badgeClass: Record<string, boolean>
}

const emit = defineEmits<{
  navigate: []
}>()

const store = useNotificationCenterStore()
const activeFilter = ref<"all" | "unread">("all")
const optionsOpen = ref(false)

const displayItems = computed<DisplayNotificationItem[]>(() =>
  store.items.map(item => ({
    ...item,
    displayTitle: notificationTitle(item),
    displayBody: notificationBody(item),
    badgeIcon: notificationBadgeIcon(item),
    badgeClass: notificationBadgeClass(item),
  })),
)

const filteredItems = computed(() =>
  activeFilter.value === "unread"
    ? displayItems.value.filter(item => item.isUnread)
    : displayItems.value,
)

const groupedItems = computed(() => {
  const todayItems: DisplayNotificationItem[] = []
  const previousItems: DisplayNotificationItem[] = []

  filteredItems.value.forEach((item) => {
    if (isTodayNotification(item)) {
      todayItems.push(item)
      return
    }

    previousItems.push(item)
  })

  return [
    { key: "today", label: "Hôm nay", items: todayItems },
    { key: "previous", label: "Trước đó", items: previousItems },
  ].filter(group => group.items.length > 0)
})

function normalizeNotificationTarget(rawUrl: string) {
  const targetUrl = rawUrl || "/notifications"
  const malformedPostMatch = targetUrl.match(/^\/post\/([^/?#&]+)&(.+)$/i)

  if (malformedPostMatch?.[1] && malformedPostMatch[2]) {
    return `/post/${encodeURIComponent(malformedPostMatch[1])}?${malformedPostMatch[2]}`
  }

  return targetUrl
}

async function openNotification(item: NotificationItem) {
  await store.markOneRead(item.id)
  emit("navigate")
  const targetUrl = normalizeNotificationTarget(item.url)
  await navigateTo(targetUrl, { external: /^https?:\/\//i.test(targetUrl) })
}

async function markAllRead() {
  optionsOpen.value = false
  await store.markRead()
}

function isTodayNotification(item: NotificationItem) {
  const createdAt = normalizeCreatedAt(item.createdAt)

  if (!createdAt) {
    return false
  }

  const today = new Date()

  return createdAt.getFullYear() === today.getFullYear()
    && createdAt.getMonth() === today.getMonth()
    && createdAt.getDate() === today.getDate()
}

function normalizeCreatedAt(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  return new Date(value < 10000000000 ? value * 1000 : value)
}

function notificationBadgeIcon(item: NotificationItem) {
  const type = item.type.toLowerCase()

  if (type.includes("comment") || type.includes("reply")) {
    return "i-ph-chat-circle-fill"
  }

  if (type.includes("like") || type.includes("reaction") || type.includes("love")) {
    return "i-ph-thumbs-up-fill"
  }

  if (type.includes("live") || type.includes("video") || type.includes("stream")) {
    return "i-ph-video-camera-fill"
  }

  return item.icon || "i-ph-bell-fill"
}

function notificationBadgeClass(item: NotificationItem) {
  const type = item.type.toLowerCase()

  return {
    "notification-dropdown__type-badge--comment": type.includes("comment") || type.includes("reply"),
    "notification-dropdown__type-badge--reaction": type.includes("like") || type.includes("reaction") || type.includes("love"),
    "notification-dropdown__type-badge--video": type.includes("live") || type.includes("video") || type.includes("stream"),
  }
}

function notificationTitle(item: NotificationItem) {
  return normalizeNotificationText(item.title) || "VNSEEA"
}

function notificationBody(item: NotificationItem) {
  const title = notificationTitle(item)
  const body = stripRepeatedTitle(normalizeNotificationText(item.body), title)
  const type = item.type.toLowerCase()

  if (type.includes("follow")) {
    return "đã bắt đầu theo dõi bạn."
  }

  if (body) {
    return normalizeBodyLead(body)
  }

  if (type.includes("comment") || type.includes("reply")) {
    return "đã bình luận về nội dung của bạn."
  }

  if (type.includes("like") || type.includes("reaction") || type.includes("love")) {
    return "đã bày tỏ cảm xúc về nội dung của bạn."
  }

  if (type.includes("live") || type.includes("video") || type.includes("stream")) {
    return "đang có hoạt động video mới."
  }

  if (type.includes("friend") || type.includes("request")) {
    return "đã gửi cho bạn một lời mời mới."
  }

  if (type.includes("share")) {
    return "đã chia sẻ nội dung liên quan đến bạn."
  }

  if (type.includes("mention") || type.includes("tag")) {
    return "đã nhắc đến bạn trong một nội dung."
  }

  if (type.includes("group")) {
    return "có cập nhật mới trong nhóm."
  }

  if (type.includes("page")) {
    return "có cập nhật mới từ trang."
  }

  return "có thông báo mới dành cho bạn."
}

function normalizeNotificationText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeBodyLead(value: string) {
  return value
    .replace(/^[\s:,\-.]+/, "")
    .trim()
}

function stripRepeatedTitle(body: string, title: string) {
  const normalizedBody = body.trim()

  if (!normalizedBody) {
    return ""
  }

  const normalizedTitle = title.replace(/\s+/g, " ").trim()

  if (!normalizedTitle) {
    return normalizedBody
  }

  const lowerBody = normalizedBody.toLowerCase()
  const lowerTitle = normalizedTitle.toLowerCase()

  if (!lowerBody.startsWith(lowerTitle)) {
    return normalizedBody
  }

  return normalizedBody
    .slice(normalizedTitle.length)
    .replace(/^[\s:,\-.]+/, "")
    .trim()
}
</script>

<style scoped>
.notification-dropdown {
  width: min(392px, calc(100vw - 16px));
  max-height: min(660px, calc(100vh - 78px));
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: var(--bg-surface);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.14);
}

.notification-dropdown__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px 4px;
}

.notification-dropdown__header h2 {
  color: #111827;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.12;
}

.notification-dropdown__menu {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.notification-dropdown__menu:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.notification-dropdown__options {
  position: absolute;
  top: calc(100% + 4px);
  right: 12px;
  z-index: 2;
  width: 238px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  padding: 6px;
}

.notification-dropdown__option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #1f2937;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  padding: 10px;
  text-align: left;
  transition: all 0.15s ease;
}

.notification-dropdown__option:hover {
  background: #f1f5f9;
  color: #2563d6;
}

.notification-dropdown__tabs {
  display: flex;
  gap: 8px;
  padding: 4px 16px 8px;
}

.notification-dropdown__tab {
  min-height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  padding: 0 13px;
  transition: all 0.15s ease;
}

.notification-dropdown__tab:hover,
.notification-dropdown__tab--active {
  background: #eaf3ff;
  color: #2563d6;
}

.notification-dropdown__list {
  max-height: min(548px, calc(100vh - 168px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 6px 10px 16px;
  -webkit-overflow-scrolling: touch;
  backface-visibility: hidden;
  contain: content;
  scrollbar-color: #b5beca transparent;
  scrollbar-width: thin;
  transform: translateZ(0);
}

.notification-dropdown__section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 12px 3px 0;
}

.notification-dropdown__section h3 {
  color: #111827;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
}

.notification-dropdown__see-all {
  border: 0;
  background: transparent;
  color: #2563d6;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 0;
}

.notification-dropdown__item {
  position: relative;
  display: flex;
  min-height: 68px;
  border-radius: 10px;
  content-visibility: auto;
  contain-intrinsic-size: 68px;
  contain: layout paint style;
  transition: background-color 0.12s ease;
}

.notification-dropdown__item:hover {
  background: #f8fafc;
}

.notification-dropdown__link {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: flex-start;
  gap: 11px;
  padding: 7px 30px 7px 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-decoration: none;
  text-align: left;
}

.notification-dropdown__avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}

.notification-dropdown__avatar {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 999px;
  object-fit: cover;
}

.notification-dropdown__avatar--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #737373;
}

.notification-dropdown__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.35;
  padding-top: 1px;
}

.notification-dropdown__message {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.notification-dropdown__message-title {
  color: #111827;
  font-weight: 800;
}

.notification-dropdown__message-body {
  margin-left: 4px;
}

.notification-dropdown__content small {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.notification-dropdown__item--unread .notification-dropdown__content small {
  color: #2563d6;
  font-weight: 700;
}

.notification-dropdown__type-badge {
  position: absolute;
  right: -5px;
  bottom: -1px;
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 3px solid #ffffff;
  border-radius: 999px;
  background: #2563d6;
  color: #ffffff;
}

.notification-dropdown__type-badge--comment {
  background: #4cc45a;
}

.notification-dropdown__type-badge--reaction {
  background: #2f7be7;
}

.notification-dropdown__type-badge--video {
  background: #dc4d67;
}

.notification-dropdown__unread-dot {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #2563d6;
  transform: translateY(-50%);
}

.notification-dropdown__empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-secondary);
  text-align: center;
}

.notification-dropdown__empty-icon {
  width: 34px;
  height: 34px;
  color: var(--icon-secondary);
}

@media (max-width: 520px) {
  .notification-dropdown {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 78px);
  }

  .notification-dropdown__header {
    padding: 13px 16px 7px;
  }

  .notification-dropdown__tabs {
    padding-inline: 16px;
  }

  .notification-dropdown__list {
    padding-left: 16px;
  }

  .notification-dropdown__header h2 {
    font-size: 24px;
  }

  .notification-dropdown__content {
    font-size: 15px;
  }
}
</style>
