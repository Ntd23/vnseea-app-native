<!-- English description: Responsive global header with search, counters, notifications, and account controls. -->

<template>
  <header class="sticky top-0 z-[100]">
    <!-- ─── Desktop header ────────────────────────────────── -->
    <div class="hidden border-b border-[#dfe6ff] bg-white/95 shadow-[0_10px_26px_rgba(15,35,110,0.08)] backdrop-blur xl:block">
      <div class="mx-auto flex h-16 w-full max-w-[1880px] items-center gap-4 px-5">
        <!-- Home pill -->
        <div class="flex shrink-0 items-center gap-2 rounded-full border border-[#e2e8f0] bg-white p-1">
          <NuxtLink
            :to="appRoutes.feed"
            class="desktop-pill"
            :class="isHome ? 'desktop-pill--active' : 'desktop-pill--inactive'"
            :aria-label="$t('navigation.headerBar.home')"
          >
            <Icon name="i-ph-house-fill" class="h-4.5 w-4.5" />
            <span>{{ $t("navigation.headerBar.home") }}</span>
          </NuxtLink>
        </div>

        <!-- Search -->
        <div class="min-w-0 max-w-[780px] flex-1">
          <NavigationHeaderSearchInput />
        </div>

        <!-- Right actions -->
        <div class="ml-auto flex shrink-0 items-center gap-2">


          <div class="notification-popover-root">
            <button
              class="header-action-btn"
              type="button"
              :aria-label="$t('navigation.headerBar.friendRequests')"
              @click="toggleRequests"
            >
              <Icon name="i-ph-user-plus-duotone" class="h-[18px] w-[18px]" />
              <span v-if="requestCount > 0" class="header-action-badge">
                {{ requestCount }}
              </span>
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-1"
            >
              <HeaderRequestsDropdown
                v-if="requestsOpen"
                class="notification-popover"
                @navigate="requestsOpen = false"
              />
            </Transition>
          </div>

          <NuxtLink
            :to="appRoutes.messages"
            class="header-action-btn"
            :class="route.path === appRoutes.messages ? 'header-action-btn--active' : ''"
            :aria-label="$t('navigation.headerBar.messages')"
          >
            <Icon
              :name="route.path === appRoutes.messages ? 'i-ph-chat-circle-dots-fill' : 'i-ph-chat-circle-dots-duotone'"
              class="h-[18px] w-[18px]"
            />
            <span v-if="navigationSummary.messageCount > 0" class="header-action-badge">
              {{ navigationSummary.messageCount }}
            </span>
          </NuxtLink>

          <div class="notification-popover-root">
            <button
              class="header-action-btn"
              type="button"
              :aria-label="$t('navigation.headerBar.notifications')"
              @click="toggleNotifications"
            >
              <Icon name="i-ph-bell-duotone" class="h-[18px] w-[18px]" />
              <span v-if="notificationCount > 0" class="header-action-badge">
                {{ notificationCount }}
              </span>
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-1"
            >
              <NotificationDropdown
                v-if="notificationOpen"
                class="notification-popover"
                @navigate="notificationOpen = false"
              />
            </Transition>
          </div>

          <NavigationHeaderUserMenu />
        </div>
      </div>
    </div>

    <!-- ─── Mobile bar ────────────────────────────────────── -->
    <div class="mobile-bar xl:hidden">
      <div class="mobile-bar__inner">
        <!-- LEFT GROUP: Home + Search -->
        <div class="mobile-bar__group">
          <NuxtLink
            :to="appRoutes.feed"
            class="mobile-icon-btn"
            :class="isHome ? 'mobile-icon-btn--active' : ''"
            :aria-label="$t('navigation.headerBar.home')"
          >
            <Icon name="i-ph-house-fill" class="h-[20px] w-[20px]" />
          </NuxtLink>

          <button
            class="mobile-icon-btn"
            :class="mobileSearchOpen ? 'mobile-icon-btn--active' : ''"
            type="button"
            :aria-label="$t('navigation.headerBar.search')"
            @click="mobileSearchOpen = !mobileSearchOpen"
          >
            <Icon name="i-ph-magnifying-glass-bold" class="h-[20px] w-[20px]" />
          </button>
        </div>

        <!-- RIGHT GROUP: Locale + Avatar -->
        <div class="mobile-bar__group">


          <NuxtLink
            :to="appRoutes.messages"
            class="mobile-icon-btn"
            :class="route.path === appRoutes.messages ? 'mobile-icon-btn--active' : ''"
            :aria-label="$t('navigation.headerBar.messages')"
          >
            <Icon name="i-ph-chat-circle-dots-duotone" class="h-[20px] w-[20px]" />
            <span v-if="navigationSummary.messageCount > 0" class="header-action-badge">
              {{ navigationSummary.messageCount }}
            </span>
          </NuxtLink>

          <button
            class="mobile-icon-btn"
            type="button"
            :aria-label="$t('navigation.headerBar.notifications')"
            @click="toggleNotifications"
          >
            <Icon name="i-ph-bell-duotone" class="h-[20px] w-[20px]" />
            <span v-if="notificationCount > 0" class="header-action-badge">
              {{ notificationCount }}
            </span>
          </button>

          <button
            class="mobile-icon-btn mobile-icon-btn--avatar"
            type="button"
            :aria-label="$t('navigation.headerBar.account')"
            @click="mobileMenuOpen = true"
          >
            <NuxtImg
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="currentUser.name"
              class="h-[20px] w-[20px] rounded-full object-cover"
              width="20"
              height="20"
            />
            <span v-else class="mobile-avatar-fallback">{{ currentUserInitials }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Mobile search — drops right below header ──────── -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="mobileSearchOpen" class="mobile-search xl:hidden">
        <NavigationHeaderSearchInput autofocus />
        <button
          class="mobile-search__close"
          type="button"
          :aria-label="$t('navigation.headerBar.closeSearch')"
          @click="mobileSearchOpen = false"
        >
          <Icon name="i-ph-x-bold" class="h-4 w-4" />
        </button>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="notificationOpen" class="mobile-notification-panel xl:hidden">
        <NotificationDropdown @navigate="notificationOpen = false" />
      </div>
    </Transition>
  </header>

  <!-- Mobile menu drawer -->
  <ClientOnly>
    <NavigationMobileMenu
      v-model="mobileMenuOpen"
      @close="mobileMenuOpen = false"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { appRoutes } from '#shared-kernel/application/constants/route-registry'
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"
import { useNotificationCenterStore } from "../../../notifications/application/stores/useNotificationCenterStore"
import NotificationDropdown from "../../../notifications/presentation/components/NotificationDropdown.vue"
import { useHeaderNotificationSync } from "../../application/composables/useHeaderNotificationSync"
import { useNavigationGeneralStore } from "../../application/stores/useNavigationGeneralStore"
import { useNavigationRequestsStore } from "../../application/stores/useNavigationRequestsStore"
import NavigationHeaderSearchInput from './HeaderSearchInput.vue'
import HeaderRequestsDropdown from "./HeaderRequestsDropdown.vue"
import NavigationHeaderUserMenu from './HeaderUserMenu.vue'
import NavigationMobileMenu from './MobileMenu.vue'

const currentAuthUserStore = useCurrentAuthUserStore()
const navigationGeneralStore = useNavigationGeneralStore()
const navigationRequestsStore = useNavigationRequestsStore()
const notificationCenterStore = useNotificationCenterStore()
const headerNotificationSync = useHeaderNotificationSync()
const backendSession = useCookie<string | null>("user_id", {
  default: () => null,
  sameSite: "lax",
  path: "/",
})

await callOnce("current-auth-user", () => currentAuthUserStore.hydrate())

if (backendSession.value) {
  await callOnce("navigation-general", () => navigationGeneralStore.hydrate())
  await callOnce("notification-center", () => notificationCenterStore.hydrate())
}

const mobileMenuOpen = ref(false)
const mobileSearchOpen = ref(false)
const notificationOpen = ref(false)
const requestsOpen = ref(false)

const route = useRoute()
const isHome = computed(() => route.path === appRoutes.home || route.path === appRoutes.feed)
const currentUser = computed(() => currentAuthUserStore.user)
const navigationSummary = computed(() => navigationGeneralStore.summary)
const requestCount = computed(() => navigationSummary.value.friendRequestCount + navigationSummary.value.groupChatRequestCount)
const notificationCount = computed(() =>
  notificationCenterStore.hydrated
    ? notificationCenterStore.unreadCount
    : navigationSummary.value.notificationCount,
)
const avatarUrl = computed(() =>
  typeof currentUser.value?.avatarUrl === "string" && currentUser.value.avatarUrl.length > 0
    ? currentUser.value.avatarUrl
    : "",
)
const currentUserInitials = computed(() =>
  currentUser.value?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("")
  || "U",
)

watch(() => route.path, () => {
  mobileSearchOpen.value = false
  mobileMenuOpen.value = false
  notificationOpen.value = false
  requestsOpen.value = false
})

onMounted(() => {
  if (backendSession.value && !currentAuthUserStore.user) {
    void currentAuthUserStore.hydrate(true)
  }
  if (backendSession.value) {
    void headerNotificationSync.startRealtime()
  }
})

onBeforeUnmount(() => {
  headerNotificationSync.stopRealtime()
})

async function toggleNotifications() {
  notificationOpen.value = !notificationOpen.value
  requestsOpen.value = false

  if (notificationOpen.value) {
    await notificationCenterStore.hydrate(true)
  }
}

async function toggleRequests() {
  requestsOpen.value = !requestsOpen.value
  notificationOpen.value = false

  if (requestsOpen.value) {
    await navigationRequestsStore.hydrate(true)
  }
}
</script>

<style scoped>
/* ─── Desktop pill ─────────────────────────────────────── */
.desktop-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 9999px;
  padding: 0.45rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-decoration: none;
  transition: all 0.15s ease;
}

.desktop-pill--active {
  background: linear-gradient(180deg, #2749ff 0%, #0000ff 100%);
  color: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 255, 0.22);
}

.desktop-pill--inactive { color: #334155; }

.desktop-pill--inactive:hover {
  color: #0000ff;
  background: #f5f8ff;
}

/* ─── Desktop action buttons ───────────────────────────── */
.header-action-btn {
  position: relative;
  display: inline-flex;
  height: 38px;
  width: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}

.header-action-btn:hover {
  border-color: rgba(0, 0, 255, 0.2);
  color: #0000ff;
  background: rgba(0, 0, 255, 0.03);
  box-shadow: 0 2px 8px rgba(0, 0, 255, 0.08);
}

.header-action-btn--active {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.header-action-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #0000ff;
  border: 2px solid #ffffff;
  padding: 0 4px;
  font-size: 9px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}

.notification-popover-root {
  position: relative;
}

.notification-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 110;
}

.mobile-notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 12px;
  right: 12px;
  z-index: 110;
}

.mobile-notification-panel :deep(.notification-dropdown) {
  width: 100%;
}

/* ─── Mobile bar ───────────────────────────────────────── */
.mobile-bar {
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  box-shadow: 0 2px 12px rgba(0, 0, 255, 0.04);
  padding: 8px 16px;
}

/* Two-group layout: left flush, right flush */
.mobile-bar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-bar__group {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Icon button base */
.mobile-icon-btn {
  position: relative;
  display: flex;
  height: 40px;
  width: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid #e8edf5;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}

.mobile-icon-btn:hover {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.mobile-icon-btn--active {
  border-color: #0000ff;
  background: #0000ff;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.22);
}

.mobile-icon-btn--avatar {
  background: #ffffff;
}

.mobile-avatar-fallback {
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
}

/* ─── Mobile search — inline, directly below header ───── */
.mobile-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 10px;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  box-shadow: 0 4px 16px rgba(0, 0, 255, 0.06);
}

.mobile-search :deep(> *:first-child) {
  flex: 1;
  min-width: 0;
}

.mobile-search__close {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: all 0.12s ease;
}

.mobile-search__close:hover {
  background: rgba(0, 0, 255, 0.05);
  border-color: rgba(0, 0, 255, 0.15);
  color: #0000ff;
}
</style>
