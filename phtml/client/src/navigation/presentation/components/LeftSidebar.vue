<template>
  <div class="left-sidebar pt-2">
    <nav class="left-sidebar__nav scrollbar-hide">
      <div class="left-sidebar__items">
        <NavigationSidebarMenuItem
          v-for="item in sidebarNav"
          :key="item.label"
          :to="item.to"
          :label="$t(item.label)"
          :icon="item.icon"
          :active="isItemActive(item.to)"
        />

        <template v-if="expanded">
          <NavigationSidebarMenuItem
            v-for="item in sidebarNavMore"
            :key="item.label"
            :to="item.to"
            :label="$t(item.label)"
            :icon="item.icon"
            :active="isItemActive(item.to)"
          />
        </template>
      </div>

      <button
        class="left-sidebar__toggle"
        type="button"
        @click="expanded = !expanded"
      >
        <span class="left-sidebar__toggle-icon">
          <Icon
            :name="expanded ? 'i-ph-caret-up-bold' : 'i-ph-caret-down-bold'"
            class="h-3.5 w-3.5"
          />
        </span>

        <span class="left-sidebar__toggle-label">
          {{ expanded ? $t('navigation.leftSidebar.showLess') : $t('navigation.leftSidebar.showMore') }}
        </span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import NavigationSidebarMenuItem from './SidebarMenuItem.vue'

const route = useRoute()
const expanded = ref(false)

const sidebarNav = [
  { label: 'navigation.leftSidebar.items.feed', icon: 'i-ph-house-simple-fill', to: '/' },
  { label: 'navigation.leftSidebar.items.searchNearby', icon: 'i-ph-map-pin-fill', to: appRoutes.searchNearby },
  { label: 'navigation.leftSidebar.items.photos', icon: 'i-ph-images-fill', to: '/photos' },
  { label: 'navigation.leftSidebar.items.watch', icon: 'i-ph-play-circle-fill', to: '/watch' },
  { label: 'navigation.leftSidebar.items.reels', icon: 'i-ph-film-strip-fill', to: '/reels' },
  { label: 'navigation.leftSidebar.items.savedPosts', icon: 'i-ph-bookmark-simple-fill', to: '/saved-posts' },
  { label: 'navigation.leftSidebar.items.popularPosts', icon: 'i-ph-fire-fill', to: '/popular' },
  { label: 'navigation.leftSidebar.items.memories', icon: 'i-ph-clock-counter-clockwise-fill', to: '/memories' },
  { label: 'navigation.leftSidebar.items.poke', icon: 'i-ph-hand-waving-fill', to: '/poke' },
  { label: 'navigation.leftSidebar.items.myGroups', icon: 'i-ph-users-three-fill', to: '/groups' },
  { label: 'navigation.leftSidebar.items.myPages', icon: 'i-ph-file-text-fill', to: '/pages' }
]

const sidebarNavMore = [
  { label: 'navigation.leftSidebar.items.blog', icon: 'i-ph-newspaper-fill', to: '/blogs' },
  { label: 'navigation.leftSidebar.items.marketplace', icon: 'i-ph-storefront-fill', to: '/products' },
  { label: 'navigation.leftSidebar.items.directory', icon: 'i-ph-squares-four-fill', to: '/directory' },
  { label: 'navigation.leftSidebar.items.events', icon: 'i-ph-calendar-dots-fill', to: '/events' },
  { label: 'navigation.leftSidebar.items.live', icon: 'i-ph-broadcast-fill', to: '/live' },
  { label: 'navigation.leftSidebar.items.forum', icon: 'i-ph-chats-circle-fill', to: '/forum' },
  { label: 'navigation.leftSidebar.items.movies', icon: 'i-ph-popcorn-fill', to: '/movies' },
  { label: 'navigation.leftSidebar.items.jobs', icon: 'i-ph-briefcase-fill', to: '/jobs' },
  { label: 'navigation.leftSidebar.items.games', icon: 'i-ph-game-controller-fill', to: '/games' },
  { label: 'navigation.leftSidebar.items.goPro', icon: 'i-ph-crown-simple-fill', to: '/go-pro' },
  { label: 'navigation.leftSidebar.items.wallet', icon: 'i-ph-wallet-fill', to: '/wallet' },
  { label: 'navigation.leftSidebar.items.withdrawal', icon: 'i-ph-money-wavy-fill', to: '/withdrawal' },
  { label: 'navigation.leftSidebar.items.funding', icon: 'i-ph-hand-heart-fill', to: '/funding' }
]

const isMarketplaceRoute = () =>
  route.path === '/products'
  || route.path === '/new-product'
  || route.path === '/my-products'
  || route.path.startsWith('/edit-product/')
  || route.path.startsWith('/order/')
  || route.path.startsWith('/customer_order/')
  || route.path === '/checkout'
  || route.path === '/orders'

const isEventsRoute = () =>
  route.path === '/events'
  || route.path.startsWith('/events/')

const isGroupsRoute = () =>
  route.path === '/groups'
  || route.path === '/suggested-groups'
  || route.path === '/joined_groups'
  || route.path === '/create-group'
  || route.path.startsWith('/g/')
  || route.path.startsWith('/group-setting/')

const isPagesRoute = () =>
  route.path === '/pages'
  || route.path === '/suggested-pages'
  || route.path === '/liked-pages'
  || route.path === '/create-page'
  || route.path.startsWith('/p/')
  || route.path.startsWith('/page-setting/')

const isItemActive = (to: string) => {
  const normalized = to.split('#')[0]

  if (normalized === '/') return route.path === '/' || route.path === '/home'
  if (normalized === '/products') return isMarketplaceRoute()
  if (normalized === '/events') return isEventsRoute()
  if (normalized === '/groups') return isGroupsRoute()
  if (normalized === '/pages') return isPagesRoute()

  return route.path === normalized
}
</script>

<style scoped>
.left-sidebar {
  min-width: 0;
}

@media (min-width: 1280px) {
  .left-sidebar {
    display: flex;
    height: 100%;
    flex-direction: column;
  }
}

.left-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (min-width: 1280px) {
  .left-sidebar__nav {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
  }
}

.left-sidebar__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.left-sidebar__toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  margin-top: 4px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.left-sidebar__toggle:hover {
  background: rgba(0, 0, 255, 0.03);
}

.left-sidebar__toggle-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  transition: all 0.15s ease;
}

.left-sidebar__toggle:hover .left-sidebar__toggle-icon {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.left-sidebar__toggle-label {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  transition: color 0.15s ease;
}

.left-sidebar__toggle:hover .left-sidebar__toggle-label {
  color: #0000ff;
}

.scrollbar-hide {
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
