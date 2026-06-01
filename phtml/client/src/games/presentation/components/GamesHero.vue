<template>
  <UCard
    class="overflow-hidden rounded-[30px] border border-[var(--border-default)] bg-[linear-gradient(135deg,#1d4ed8_0%,#0369a1_38%,#0f172a_100%)] text-white shadow-[var(--shadow-xl)]"
    :ui="{ body: 'relative p-5 sm:p-7 lg:p-8' }"
  >
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.18),transparent_30%)]" />
    <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />

    <div class="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div class="max-w-[760px]">
        <UBadge color="neutral" variant="soft" class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
          {{ t("pages.gamesPage.heroEyebrow") }}
        </UBadge>

        <h1 class="mt-4 text-display text-[2.25rem] leading-[0.95] text-white sm:text-[3rem]">
          {{ t("pages.gamesPage.heroTitle") }}
        </h1>
        <p class="mt-4 max-w-[640px] text-[15px] leading-7 text-white/88 sm:text-[17px]">
          {{ t("pages.gamesPage.heroDescription") }}
        </p>

        <div class="mt-5 flex flex-wrap gap-2">
          <UBadge color="neutral" variant="soft" class="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white">
            {{ activeTabLabel }}
          </UBadge>

          <UBadge
            v-if="activeCategoryLabel"
            color="neutral"
            variant="soft"
            class="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {{ activeCategoryLabel }}
          </UBadge>

          <UBadge
            v-if="searchTerm"
            color="neutral"
            variant="soft"
            class="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {{ t("pages.gamesPage.queryBadge", { query: searchTerm }) }}
          </UBadge>

          <UBadge
            v-if="selectedGameTitle"
            color="neutral"
            variant="soft"
            class="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {{ t("pages.gamesPage.selectedGameBadge", { title: selectedGameTitle }) }}
          </UBadge>
        </div>

        <div class="mt-7 flex flex-wrap gap-3">
          <UButton
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            size="xl"
            :color="activeTab === tab.value ? 'neutral' : 'primary'"
            :variant="activeTab === tab.value ? 'solid' : 'soft'"
            class="rounded-full"
            :class="activeTab === tab.value ? 'bg-white text-[var(--color-primary-600)]' : 'bg-white/10 text-white hover:bg-white/20'"
            :aria-pressed="activeTab === tab.value"
            @click="emit('update:activeTab', tab.value)"
          >
            <Icon :name="tab.icon" class="mr-2 h-4 w-4" />
            {{ tab.label }}
          </UButton>

          <UButton
            v-if="hasActiveFilters"
            type="button"
            color="neutral"
            variant="outline"
            size="xl"
            class="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
            @click="emit('reset')"
          >
            {{ t("pages.gamesPage.resetFilters") }}
          </UButton>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 xl:w-[460px] xl:grid-cols-1">
        <UCard
          v-for="item in stats"
          :key="item.label"
          class="rounded-[24px] border border-white/15 bg-white/10 backdrop-blur-[6px]"
          :ui="{ body: 'p-4' }"
        >
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-white/62">
            {{ item.label }}
          </p>
          <p class="mt-2 text-[1.6rem] font-black leading-none text-white">
            {{ item.value }}
          </p>
          <p class="mt-1 text-[13px] leading-5 text-white/74">
            {{ item.description }}
          </p>
        </UCard>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { GameTab, GameTabKey } from "../../domain/types/games.types"

const props = defineProps<{
  tabs: ReadonlyArray<GameTab>
  activeTab: GameTabKey
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
  searchTerm?: string
  activeCategoryLabel?: string
  selectedGameTitle?: string
  hasActiveFilters?: boolean
}>()

const emit = defineEmits<{
  "update:activeTab": [value: GameTabKey]
  reset: []
}>()

const { t } = useI18n()

const activeTabLabel = computed(() =>
  props.tabs.find(tab => tab.value === props.activeTab)?.label ?? "",
)
</script>
