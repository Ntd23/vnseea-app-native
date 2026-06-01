<!-- English description: Header user menu with current account shortcuts and locale-aware wallet formatting. -->
<template>
  <div ref="menuRef" class="user-menu-root">
    <button class="user-menu__trigger" type="button" @click="open = !open">
      <div class="user-menu__avatar">
        <NuxtImg
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="currentUser.name"
          class="h-full w-full rounded-full object-cover"
          width="34"
          height="34"
          loading="lazy"
        />
        <span v-else>{{ userInitials }}</span>
      </div>
      <div class="user-menu__trigger-info">
        <p class="user-menu__trigger-name">{{ currentUser?.name || "User" }}</p>
        <p v-if="secondaryLabel" class="user-menu__trigger-role">{{ secondaryLabel }}</p>
      </div>
      <Icon name="i-ph-caret-down-bold" class="user-menu__caret" :class="{ 'user-menu__caret--open': open }" />
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out origin-top-right"
      enter-from-class="opacity-0 scale-95 translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in origin-top-right"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="open" class="user-menu__dropdown">
        <div class="user-menu__summary">
          <div class="user-menu__summary-card">
            <div class="user-menu__summary-head">
              <NuxtLink
                v-if="currentUser"
                :to="profilePath"
                class="user-menu__summary-name"
                @click="open = false"
              >
                {{ currentUser.name }}
              </NuxtLink>
              <p v-else class="user-menu__summary-name">User</p>
              <Icon name="i-ph-hand-heart-fill" class="user-menu__summary-icon" />
            </div>

            <div v-if="showStats" class="user-menu__stats">
              <NuxtLink v-if="formattedWallet" :to="appRoutes.wallet" class="user-menu__stat" @click="open = false">
                <Icon name="i-ph-wallet-fill" class="user-menu__stat-icon" />
                <span>{{ $t("navigation.mobileMenu.walletLabel") || "Wallet" }}: {{ formattedWallet }}</span>
              </NuxtLink>
              <NuxtLink v-if="formattedPoints" :to="appRoutes.settingsPage('myPoints')" class="user-menu__stat" @click="open = false">
                <Icon name="i-ph-circle-half-fill" class="user-menu__stat-icon" />
                <span>{{ $t("navigation.mobileMenu.pointsLabel") || "Points" }}: {{ formattedPoints }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="user-menu__section">
          <button
            v-for="item in quickActions"
            :key="item.label"
            type="button"
            class="user-menu__item"
            @click="closeAndNavigate(item.to)"
          >
            <Icon :name="item.icon" class="user-menu__item-icon" />
            <span class="user-menu__item-label">{{ $t(item.label) }}</span>
          </button>
        </div>

        <div v-if="systemActions.length > 0" class="user-menu__divider" />

        <div class="user-menu__section">
          <template v-for="item in systemActions" :key="item.label">
            <a
              v-if="item.external"
              :href="item.to"
              class="user-menu__item"
              :class="{ 'user-menu__item--danger': item.danger }"
              @click="open = false"
            >
              <Icon :name="item.icon" class="user-menu__item-icon" />
              <span class="user-menu__item-label">{{ $t(item.label) }}</span>
            </a>
            <NuxtLink
              v-else
              :to="item.to"
              class="user-menu__item"
              :class="{ 'user-menu__item--danger': item.danger }"
              @click="open = false"
            >
              <Icon :name="item.icon" class="user-menu__item-icon" />
              <span class="user-menu__item-label">{{ $t(item.label) }}</span>
            </NuxtLink>
          </template>
        </div>

        <div class="user-menu__divider" />

        <button class="user-menu__switch" type="button">
          <span>{{ $t("navigation.mobileMenu.bottomActions.switchAccount") }}</span>
          <Icon name="i-ph-arrows-clockwise" class="h-4 w-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core"
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useBackendWebUrl } from "#shared-kernel/application/utils/backend-web-url"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"

const { t, locale } = useI18n()
const currentAuthUserStore = useCurrentAuthUserStore()
const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

onClickOutside(menuRef, () => { open.value = false })

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
const secondaryLabel = computed(() => {
  if (!currentUser.value) return ""
  if (currentUser.value.isAdmin) return t("navigation.mobileMenu.adminTitle")
  if (currentUser.value.isModerator) return t("navigation.mobileMenu.moderatorTitle")
  if (currentUser.value.username) return `@${currentUser.value.username}`
  return ""
})

const profilePath = computed(() => currentUser.value?.username ? `/@${currentUser.value.username}` : "#")

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

function closeAndNavigate(to: string) {
  open.value = false
  void navigateTo(to)
}

const quickActions = computed(() => {
  const items = [
    { label: "navigation.mobileMenu.mainNav.advertising", icon: "i-ph-megaphone-fill", to: "/ads" },
  ]

  if (currentUser.value?.isPro && currentUser.value?.canBoostPosts) {
    items.push({
      label: "navigation.mobileMenu.settingsNav.boostedPosts",
      icon: "i-ph-lightning-fill",
      to: appRoutes.boostedPosts,
    })
  }

  if (currentUser.value?.isPro && currentUser.value?.canBoostPages) {
    items.push({
      label: "navigation.mobileMenu.settingsNav.boostedPages",
      icon: "i-ph-lightning-fill",
      to: appRoutes.boostedPages,
    })
  }

  items.push(
    { label: "navigation.mobileMenu.settingsNav.editProfile", icon: "i-ph-pencil-simple-fill", to: appRoutes.settingsPage("general") },
    { label: "navigation.mobileMenu.settingsNav.generalSettings", icon: "i-ph-users-fill", to: appRoutes.settings },
    { label: "navigation.mobileMenu.settingsNav.registration", icon: "i-ph-clipboard-text-fill", to: appRoutes.register },
  )

  return items
})

const adminCpUrl = useBackendWebUrl(appRoutes.adminCp)
const systemActions = computed(() => {
  const items: Array<{ label: string; icon: string; to: string; danger?: boolean; external?: boolean }> = []

  if (currentUser.value?.isAdmin) {
    items.push({
      label: "navigation.mobileMenu.settingsNav.adminArea",
      icon: "i-ph-squares-four-fill",
      to: adminCpUrl,
      external: true,
    })
  }

  items.push({
    label: "navigation.mobileMenu.settingsNav.logout",
    icon: "i-ph-sign-out-fill",
    to: appRoutes.logout,
    danger: true,
  })

  return items
})
</script>

<style scoped>
.user-menu-root {
  position: relative;
}

.user-menu__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.user-menu__trigger:hover {
  border-color: rgba(0, 0, 255, 0.18);
}

.user-menu__avatar {
  display: flex;
  width: 34px;
  height: 34px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #3333ff 0%, #0000ff 100%);
  font-size: 11px;
  font-weight: 800;
  color: #ffffff;
}

.user-menu__trigger-info {
  display: none;
  text-align: left;
}

@media (min-width: 1280px) {
  .user-menu__trigger-info {
    display: block;
  }
}

.user-menu__trigger-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.user-menu__trigger-role {
  font-size: 10.5px;
  font-weight: 500;
  color: #94a3b8;
  line-height: 1.2;
}

.user-menu__caret {
  width: 14px;
  height: 14px;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.user-menu__caret--open {
  transform: rotate(180deg);
}

.user-menu__dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 110;
  margin-top: 8px;
  width: 318px;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
}

.user-menu__summary {
  padding: 14px 14px 10px;
}

.user-menu__summary-card {
  border-radius: 16px;
  background: #f5f5f5;
  padding: 16px;
}

.user-menu__summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.user-menu__summary-name {
  font-size: 17px;
  font-weight: 800;
  line-height: 1.25;
  color: #111827;
  text-decoration: none;
  transition: color 0.15s ease;
}

.user-menu__summary-name:hover {
  color: #0000ff;
  text-decoration: underline;
}

.user-menu__summary-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #f59e0b;
}

.user-menu__stats {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-menu__stat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: #5b6472;
  text-decoration: none;
  transition: color 0.15s ease, background 0.15s ease;
}

a.user-menu__stat:hover {
  background: #eef2ff;
  color: #0000ff;
}

.user-menu__stat-icon {
  width: 18px;
  height: 18px;
  color: #656d7b;
}

.user-menu__divider {
  height: 1px;
  background: #eceff4;
}

.user-menu__section {
  padding: 6px 0;
}

.user-menu__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 0;
  background: transparent;
  text-decoration: none;
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  transition: background 0.12s ease;
  cursor: pointer;
}

.user-menu__item:hover {
  background: #f8fafc;
}

.user-menu__item--danger {
  color: #dc2626;
}

.user-menu__item--danger:hover {
  background: #fef2f2;
}

.user-menu__item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #64748b;
}

.user-menu__item--danger .user-menu__item-icon {
  color: #dc2626;
}

.user-menu__item-label {
  font-size: 16px;
  min-width: 0;
}

.user-menu__switch {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: background 0.12s ease;
}

.user-menu__switch:hover {
  background: #f8fafc;
}
</style>
