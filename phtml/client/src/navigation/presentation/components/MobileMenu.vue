<!-- English description: Mobile navigation drawer with account stats and locale-aware wallet formatting. -->
<template>
  <Teleport to="body">
    <Transition name="mm-fade">
      <div
        v-show="isOpen"
        class="mm-overlay xl:hidden"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="mm-slide">
      <aside
        v-show="isOpen"
        id="mobile-navigation-menu"
        class="mm xl:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        <div class="mm__header">
          <div class="mm__admin-card">
            <div class="mm__identity">
              <div class="mm__avatar">
                <NuxtImg
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  :alt="currentUser.name"
                  class="h-full w-full rounded-full object-cover"
                  width="44"
                  height="44"
                  loading="lazy"
                />
                <span v-else>{{ userInitials }}</span>
              </div>
              <div>
                <p id="mobile-menu-title" class="mm__admin-role">{{ currentUser?.name || "User" }}</p>
                <p v-if="identityLabel" class="mm__admin-subtitle">{{ identityLabel }}</p>
              </div>
            </div>
            <div class="mm__admin-icon">🤝</div>
          </div>

          <div v-if="showStats" class="mm__stats">
            <NuxtLink v-if="formattedWallet" :to="appRoutes.wallet" class="mm__stat" @click="close">
              <Icon name="i-ph-wallet-fill" class="mm__stat-icon" />
              <span>{{ $t("navigation.mobileMenu.walletLabel") || "Ví" }}: {{ formattedWallet }}</span>
            </NuxtLink>
            <NuxtLink v-if="formattedPoints" :to="appRoutes.settingsPage('myPoints')" class="mm__stat" @click="close">
              <Icon name="i-ph-circle-half-fill" class="mm__stat-icon" />
              <span>{{ $t("navigation.mobileMenu.pointsLabel") || "Điểm" }}: {{ formattedPoints }}</span>
            </NuxtLink>
          </div>

          <button class="mm__close" type="button" :aria-label="$t('common.close')" @click="close">
            <Icon name="i-ph-x-bold" class="h-4.5 w-4.5" />
          </button>
        </div>

        <div class="mm__content">
          <div class="mm__nav-group">
            <NuxtLink
              v-for="item in mainNav"
              :key="`${item.label}-${item.to}`"
              :to="item.to"
              class="mm__item"
              :class="isNavItemActive(item.to) ? 'mm__item--active' : ''"
              @click="close"
            >
              <Icon :name="item.icon" class="mm__item-icon" :class="isNavItemActive(item.to) ? 'mm__item-icon--active' : ''" />
              <span class="mm__item-label" :class="isNavItemActive(item.to) ? 'mm__item-label--active' : ''">{{ $t(item.label) }}</span>
            </NuxtLink>
          </div>

          <div class="mm__divider" />

          <div class="mm__nav-group">
            <template v-for="item in settingsNav" :key="item.label">
              <a
                v-if="item.external"
                :href="item.to"
                class="mm__item"
                :class="item.danger ? 'mm__item--danger' : ''"
                @click="close"
              >
                <Icon :name="item.icon" class="mm__item-icon" :class="item.danger ? 'mm__item-icon--danger' : ''" />
                <span class="mm__item-label" :class="item.danger ? 'mm__item-label--danger' : ''">{{ $t(item.label) }}</span>
              </a>
              <NuxtLink
                v-else
                :to="item.to"
                class="mm__item"
                :class="[isNavItemActive(item.to) ? 'mm__item--active' : '', item.danger ? 'mm__item--danger' : '']"
                @click="close"
              >
                <Icon :name="item.icon" class="mm__item-icon" :class="item.danger ? 'mm__item-icon--danger' : ''" />
                <span class="mm__item-label" :class="item.danger ? 'mm__item-label--danger' : ''">{{ $t(item.label) }}</span>
              </NuxtLink>
            </template>
          </div>

          <div class="mm__divider" />

          <button class="mm__switch" type="button">
            <span>{{ $t("navigation.mobileMenu.bottomActions.switchAccount") }}</span>
            <Icon name="i-ph-arrows-clockwise" class="h-4 w-4" />
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useBackendWebUrl } from "#shared-kernel/application/utils/backend-web-url"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"

const { t, locale } = useI18n()
const currentAuthUserStore = useCurrentAuthUserStore()
const route = useRoute()
const modelValue = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  close: []
}>()

const isOpen = computed({
  get: () => modelValue.value,
  set: (value: boolean) => {
    modelValue.value = value
  },
})
const currentUser = computed(() => currentAuthUserStore.user)
const avatarUrl = computed(() =>
  typeof currentUser.value?.avatarUrl === "string" && currentUser.value.avatarUrl.length > 0
    ? currentUser.value.avatarUrl
    : "",
)
const userInitials = computed(() =>
  currentUser.value?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("")
  || "U",
)
const identityLabel = computed(() => {
  if (!currentUser.value) return ""
  if (currentUser.value.isAdmin) return t("navigation.mobileMenu.adminTitle")
  if (currentUser.value.isModerator) return t("navigation.mobileMenu.moderatorTitle")
  return currentUser.value.username ? `@${currentUser.value.username}` : ""
})

const numberFormatter = computed(() => new Intl.NumberFormat(locale.value === "vi" ? "vi-VN" : "en-US"))
const formattedWallet = computed(() => {
  const value = currentUser.value?.wallet

  if (value === undefined || value === null || value === "") {
    return ""
  }

  if (typeof value === "number") {
    return formatCurrency(value, { currency: "VND", locale: locale.value })
  }

  const normalized = Number(String(value).replace(/,/g, ""))

  return Number.isFinite(normalized)
    ? formatCurrency(normalized, { currency: "VND", locale: locale.value })
    : String(value)
})
const formattedPoints = computed(() => {
  const value = currentUser.value?.points

  if (value === undefined || value === null || Number.isNaN(value)) {
    return ""
  }

  return numberFormatter.value.format(value)
})
const showStats = computed(() => Boolean(formattedWallet.value || formattedPoints.value))

function close() {
  modelValue.value = false
  emit('close')
}

function isNavItemActive(to: string) {
  const normalized = to.split('?')[0].split('#')[0]
  if (normalized === '/home') return route.path === '/' || route.path === '/home'
  if (normalized === '/products') return ['/products', '/my-products', '/new-product'].includes(route.path) || route.path.startsWith('/edit-product/')
  if (normalized === '/events') return route.path === '/events' || route.path.startsWith('/events/')
  if (normalized === '/groups') return ['/groups', '/suggested-groups', '/joined_groups', '/create-group'].includes(route.path) || route.path.startsWith('/g/') || route.path.startsWith('/group-setting/')
  if (normalized === '/pages') return ['/pages', '/suggested-pages', '/liked-pages', '/create-page'].includes(route.path) || route.path.startsWith('/p/') || route.path.startsWith('/page-setting/')
  if (to.includes('mine=1')) return route.path === '/blogs' && route.query.mine === '1'
  return route.path === normalized
}

watch(() => route.path, () => { isOpen.value = false })

const mainNav = [
  { label: 'navigation.mobileMenu.mainNav.search', icon: 'i-ph-map-pin-fill', to: appRoutes.searchNearby },
  { label: 'navigation.mobileMenu.mainNav.pages', icon: 'i-ph-flag-fill', to: '/pages' },
  { label: 'navigation.mobileMenu.mainNav.myProducts', icon: 'i-ph-package-fill', to: '/my-products' },
  { label: 'navigation.mobileMenu.mainNav.marketplace', icon: 'i-ph-storefront-fill', to: '/products' },
  { label: 'navigation.mobileMenu.mainNav.blog', icon: 'i-ph-newspaper-fill', to: '/blogs' },
  { label: 'navigation.mobileMenu.mainNav.myArticles', icon: 'i-ph-article-fill', to: '/blogs?mine=1' },
  { label: 'navigation.mobileMenu.mainNav.movies', icon: 'i-ph-film-strip-fill', to: '/movies' },
  { label: 'navigation.mobileMenu.mainNav.events', icon: 'i-ph-calendar-blank-fill', to: '/events' },
  { label: 'navigation.mobileMenu.mainNav.myGroups', icon: 'i-ph-users-three-fill', to: '/groups' },
  { label: 'navigation.mobileMenu.mainNav.forum', icon: 'i-ph-chats-circle-fill', to: '/forum' },
  { label: 'navigation.mobileMenu.mainNav.advertising', icon: 'i-ph-megaphone-fill', to: '/ads' },
  { label: 'navigation.mobileMenu.mainNav.photos', icon: 'i-ph-images-fill', to: '/photos' },
  { label: 'navigation.mobileMenu.mainNav.watch', icon: 'i-ph-play-circle-fill', to: '/watch' },
  { label: 'navigation.mobileMenu.mainNav.reels', icon: 'i-ph-film-strip-fill', to: '/reels' },
  { label: 'navigation.mobileMenu.mainNav.savedPosts', icon: 'i-ph-bookmark-simple-fill', to: '/saved-posts' },
  { label: 'navigation.mobileMenu.mainNav.poke', icon: 'i-ph-hand-waving-fill', to: '/poke' },
  { label: 'navigation.mobileMenu.mainNav.explore', icon: 'i-ph-compass-fill', to: '/explore' },
  { label: 'navigation.mobileMenu.mainNav.popularPosts', icon: 'i-ph-fire-fill', to: '/popular' },
  { label: 'navigation.mobileMenu.mainNav.jobs', icon: 'i-ph-briefcase-fill', to: '/jobs' },
  { label: 'navigation.mobileMenu.mainNav.goPro', icon: 'i-ph-crown-simple-fill', to: '/go-pro' },
  { label: 'navigation.mobileMenu.mainNav.wallet', icon: 'i-ph-wallet-fill', to: appRoutes.wallet },
  { label: 'navigation.mobileMenu.mainNav.withdrawal', icon: 'i-ph-money-wavy-fill', to: '/withdrawal' },
  { label: 'navigation.mobileMenu.mainNav.funding', icon: 'i-ph-hand-heart-fill', to: '/funding' },
  { label: 'navigation.mobileMenu.mainNav.memories', icon: 'i-ph-clock-counter-clockwise-fill', to: '/memories' },
  { label: 'navigation.mobileMenu.mainNav.deals', icon: 'i-ph-tag-fill', to: '/deals' },
]

const adminCpUrl = useBackendWebUrl(appRoutes.adminCp)
const settingsNav = computed(() => {
  const items: Array<{ label: string; icon: string; to: string; danger?: boolean; external?: boolean }> = [
    { label: 'navigation.mobileMenu.settingsNav.settings', icon: 'i-ph-gear-fill', to: appRoutes.settings, danger: false },
    { label: 'navigation.mobileMenu.settingsNav.registration', icon: 'i-ph-clipboard-text-fill', to: appRoutes.register, danger: false },
  ]

  if (currentUser.value?.isAdmin) {
    items.push({
      label: 'navigation.mobileMenu.settingsNav.adminArea',
      icon: 'i-ph-squares-four-fill',
      to: adminCpUrl,
      danger: false,
      external: true,
    })
  }

  items.push({
    label: 'navigation.mobileMenu.settingsNav.logout',
    icon: 'i-ph-sign-out-fill',
    to: appRoutes.logout,
    danger: true,
  })

  return items
})
</script>

<style scoped>
.mm-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.mm {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: 85vw;
  max-width: 340px;
  background: #ffffff;
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.mm-fade-enter-active,
.mm-fade-leave-active {
  transition: opacity 220ms ease;
}
.mm-fade-enter-from,
.mm-fade-leave-to {
  opacity: 0;
}

.mm-slide-enter-active,
.mm-slide-leave-active {
  transition: transform 240ms cubic-bezier(0.32, 0.72, 0, 1);
}
.mm-slide-enter-from,
.mm-slide-leave-to {
  transform: translateX(100%);
}

.mm__header {
  position: relative;
  flex-shrink: 0;
}

.mm__admin-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 12px;
  background: linear-gradient(135deg, #0000ff 0%, #2233ff 100%);
  color: #ffffff;
}

.mm__identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.mm__avatar {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
}

.mm__admin-role {
  font-size: 17px;
  font-weight: 800;
}

.mm__admin-subtitle {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
}

.mm__admin-icon {
  font-size: 28px;
}

.mm__close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.12s ease;
}

.mm__close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.mm__stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px 12px;
  background: #f8faff;
  border-bottom: 1px solid #f1f5f9;
}

.mm__stat {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 4px 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-decoration: none;
  transition: background 0.12s ease, color 0.12s ease;
}

.mm__stat:hover {
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.mm__stat-icon {
  width: 14px;
  height: 14px;
  color: #0000ff;
}

.mm__content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  padding-bottom: 24px;
}

.mm__content::-webkit-scrollbar { display: none; }

.mm__nav-group {
  padding: 8px;
}

.mm__divider {
  height: 1px;
  margin: 4px 16px;
  background: #f1f5f9;
}

.mm__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 12px;
  text-decoration: none;
  color: #334155;
  transition: background 0.12s ease, color 0.12s ease;
}

.mm__item:hover { background: rgba(0, 0, 255, 0.04); color: #0000ff; }
.mm__item--active { background: rgba(0, 0, 255, 0.06); color: #0000ff; }
.mm__item--danger:hover { background: rgba(220, 38, 38, 0.05); }

.mm__item-icon { width: 18px; height: 18px; flex-shrink: 0; color: #64748b; }
.mm__item-icon--active { color: #0000ff; }
.mm__item-icon--danger { color: #dc2626; }

.mm__item-label { font-size: 14px; font-weight: 500; }
.mm__item-label--active { font-weight: 700; }
.mm__item-label--danger { color: #dc2626; }

.mm__switch {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: background 0.12s ease;
}

.mm__switch:hover { background: #f8fafc; }
</style>
