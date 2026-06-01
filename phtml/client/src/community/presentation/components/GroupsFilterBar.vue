<!-- Description: Renders the legacy-style group directory tab row with only tab navigation and the create-group action. -->
<template>
  <section class="groups-filter-bar">
    <div class="groups-filter-bar__tabs" role="tablist" :aria-label="$t('community.groups.hub')">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.value"
        :to="tab.to"
        class="groups-filter-bar__tab"
        :class="{ 'groups-filter-bar__tab--active': activeTab === tab.value }"
        :aria-current="activeTab === tab.value ? 'page' : undefined"
      >
        {{ $t(tab.label) }}
      </NuxtLink>
    </div>

    <NuxtLink
      :to="createTo"
      class="groups-filter-bar__create"
    >
      <Icon name="i-ph-plus-bold" class="h-4 w-4" />
      <span>{{ $t("community.groups.action.createNew") }}</span>
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import type { CommunityGroupTab } from "../../domain/types/community.types"

defineProps<{
  tabs: Array<{ label: string; value: CommunityGroupTab; to: string }>
  activeTab: CommunityGroupTab
  createTo: string
}>()
</script>

<style scoped>
.groups-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}

.groups-filter-bar__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.groups-filter-bar__tab {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  border-radius: var(--radius-full);
  padding: 8px 14px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-default), background-color var(--duration-fast) var(--ease-default);
}

.groups-filter-bar__tab:hover {
  color: var(--text-brand);
  background: var(--bg-surface-hover);
}

.groups-filter-bar__tab--active {
  color: var(--text-brand);
  background: var(--bg-surface-active);
}

.groups-filter-bar__create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  align-self: flex-start;
  border-radius: 12px;
  background: var(--bg-brand);
  padding: 0 14px;
  color: var(--text-inverse);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: var(--shadow-brand);
  transition: transform var(--duration-fast) var(--ease-default), background-color var(--duration-fast) var(--ease-default);
}

.groups-filter-bar__create:hover {
  transform: translateY(-1px);
  background: var(--bg-brand-hover);
}

@media (min-width: 768px) {
  .groups-filter-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .groups-filter-bar__create {
    align-self: auto;
  }
}
</style>
