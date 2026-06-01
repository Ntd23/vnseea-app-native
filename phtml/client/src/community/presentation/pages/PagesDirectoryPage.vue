<!-- Description: Renders the legacy-style pages directory with a simple heading, tabs, and backend-backed list content. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <CommunityPageDirectoryTabsBar
      v-model:search="search"
      :tabs="tabItems"
      :active-tab="mode"
      :status-label="filterStatusLabel"
      :create-to="appRoutes.createPage"
    />

    <div v-if="pending" class="grid gap-4 lg:grid-cols-2">
      <div
        v-for="item in 4"
        :key="item"
        class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
      >
        <div class="flex items-start gap-4">
          <USkeleton class="h-16 w-16 rounded-[16px]" />

          <div class="min-w-0 flex-1 space-y-3">
            <USkeleton class="h-5 w-44 rounded-xl" />
            <USkeleton class="h-4 w-28 rounded-xl" />
            <USkeleton class="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    <section
      v-else-if="visiblePages.length === 0"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-12 text-center shadow-[var(--shadow-sm)]"
    >
      <FoundationEmptyState
        :icon="mode === 'mine' ? 'i-ph-flag-duotone' : 'i-ph-magnifying-glass-duotone'"
        :title="mode === 'mine' ? $t('community.pagesDirectory.emptyMineTitle') : $t('community.pagesDirectory.emptyOtherTitle')"
        :description="mode === 'mine' ? $t('community.pagesDirectory.emptyMineDesc') : $t('community.pagesDirectory.emptyOtherDesc')"
      />
    </section>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <CommunityPageCard
        v-for="page in visiblePages"
        :key="page.id"
        :page="page"
        :action-label="actionLabel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import CommunityPageCard from "../components/PageCard.vue"
import CommunityPageDirectoryTabsBar from "../components/PageDirectoryTabsBar.vue"
import type { CommunityPageTab } from "../../domain/types/community.types"
import { useCommunityPagesDirectoryVM } from "../../application/view-models/useCommunityPagesDirectoryVM"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"

const props = withDefaults(defineProps<{
  mode?: CommunityPageTab
}>(), {
  mode: "mine",
})

const {
  search,
  pending,
  visiblePages,
  tabItems,
  actionLabel,
  filterStatusLabel,
} = useCommunityPagesDirectoryVM(() => props.mode)
</script>

<style scoped>
.skeleton-card {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.skeleton-cover {
  position: relative;
  height: 300px;
  width: 100%;
}

.skeleton {
  background: #334155;
  background: linear-gradient(
    90deg,
    #334155 25%,
    #475569 50%,
    #334155 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 2s infinite linear;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-bg {
  position: absolute;
  inset: 0;
}

.skeleton-pill {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
}

.skeleton-circle {
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.skeleton-avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
}

.skeleton-text {
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
}

.skeleton-overlay-top-left {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 10;
}

.skeleton-overlay-top-right {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 10;
}

.skeleton-overlay-info {
  position: absolute;
  bottom: 52px;
  left: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-info-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-overlay-stats {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.skeleton-overlay-bottom-right {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
}
</style>
