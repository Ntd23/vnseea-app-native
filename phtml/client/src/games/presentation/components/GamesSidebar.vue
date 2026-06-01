<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.gamesPage.sidebarOverview") }}
          </p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">
            {{ gameTitle }}
          </h2>
        </div>

        <UButton
          v-if="hasActiveFilters"
          type="button"
          color="neutral"
          variant="outline"
          size="sm"
          class="rounded-full"
          @click="emit('reset')"
        >
          {{ t("pages.gamesPage.resetFilters") }}
        </UButton>
      </div>

      <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {{ gameDescription }}
      </p>

      <UAlert
        class="mt-4 rounded-[22px]"
        :color="hasActiveFilters ? 'primary' : 'neutral'"
        variant="subtle"
        icon="i-ph-chart-bar-horizontal-fill"
        :title="t('pages.gamesPage.filterStatusTitle')"
        :description="statusLabel"
      />

      <div class="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div
          v-for="item in stats"
          :key="item.label"
          class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] px-4 py-3"
        >
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ item.label }}
          </p>
          <p class="mt-1 text-[1.35rem] font-black text-[var(--text-primary)]">
            {{ item.value }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.gamesPage.leaderboardEyebrow") }}
      </p>
      <h2 class="mt-1 text-heading text-[var(--text-primary)]">
        {{ t("pages.gamesPage.leaderboardTitle") }}
      </h2>
      <p class="mt-1 text-[12px] font-semibold text-[var(--text-secondary)]">
        {{ gameTitle }}
      </p>

      <div v-if="leaderboard.length > 0" class="mt-4 space-y-2">
        <div
          v-for="(player, index) in leaderboard"
          :key="`${player.name}-${index}`"
          class="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--bg-surface-hover)] p-3"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-[12px] font-black text-white">
              #{{ index + 1 }}
            </span>
            <p class="truncate text-[13px] font-extrabold text-[var(--text-primary)]">
              {{ player.name }}
            </p>
          </div>
          <p class="text-[13px] font-black text-[var(--text-primary)]">
            {{ formatGameNumber(player.score, locale) }}
          </p>
        </div>
      </div>

      <FoundationEmptyState
        v-else
        compact
        align="start"
        class="mt-4 border-none shadow-none"
        icon="i-ph-trophy-fill"
        :title="t('pages.gamesPage.leaderboardEmptyTitle')"
        :description="t('pages.gamesPage.leaderboardEmptyDescription')"
      />
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.gamesPage.achievementsEyebrow") }}
      </p>
      <h2 class="mt-1 text-heading text-[var(--text-primary)]">
        {{ t("pages.gamesPage.achievementsTitle") }}
      </h2>

      <div class="mt-4 space-y-3">
        <div
          v-for="item in achievements"
          :key="item.title"
          class="rounded-[20px] bg-[var(--bg-surface-hover)] p-3"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-[13px] font-extrabold text-[var(--text-primary)]">
              {{ item.title }}
            </p>
            <p class="text-[12px] font-black text-[var(--text-primary)]">
              {{ item.progress }}%
            </p>
          </div>
          <p class="mt-1 text-[12px] font-semibold leading-5 text-[var(--text-secondary)]">
            {{ item.description }}
          </p>
          <UProgress
            class="mt-3"
            color="primary"
            size="lg"
            :model-value="item.progress"
            :aria-label="t('pages.gamesPage.achievementProgressAriaLabel', { title: item.title, progress: item.progress })"
          />
        </div>
      </div>
    </UCard>
  </aside>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import type { GameAchievement, GameLeaderboardEntry } from "../../domain/types/games.types"
import { formatGameNumber } from "../../infrastructure/mocks/gamesCatalog"

defineProps<{
  leaderboard: ReadonlyArray<GameLeaderboardEntry>
  gameTitle: string
  gameDescription: string
  achievements: ReadonlyArray<GameAchievement>
  stats: ReadonlyArray<{ label: string; value: string | number }>
  statusLabel: string
  hasActiveFilters?: boolean
}>()

const emit = defineEmits<{
  reset: []
}>()

const { t, locale } = useI18n()
</script>
