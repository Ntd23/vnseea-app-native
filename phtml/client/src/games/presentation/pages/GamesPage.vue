<!-- English description: Backend-backed games listing page aligned to the WoWonder games phtml order. -->
<template>
  <main class="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 sm:px-5">
    <section class="surface-card p-4 sm:p-5">
      <div class="flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-surface-active)] text-[var(--text-brand)]">
          <Icon name="i-ph-game-controller-duotone" class="h-6 w-6" />
        </span>
        <div>
          <p class="text-label-secondary">Games</p>
          <h1 class="text-heading">{{ t("pages.gamesPage.headingDefault") }}</h1>
        </div>
      </div>
    </section>

    <section class="surface-card space-y-3 p-3">
      <div class="flex gap-2 overflow-x-auto scrollbar-hide">
        <UButton
          v-for="tab in tabs"
          :key="tab.value"
          :color="activeTab === tab.value ? 'primary' : 'neutral'"
          :variant="activeTab === tab.value ? 'solid' : 'soft'"
          class="shrink-0 rounded-[var(--radius-full)]"
          @click="setTab(tab.value)"
        >
          {{ tab.label }}
        </UButton>
      </div>

      <form class="flex gap-2" @submit.prevent="syncQuery">
        <UInput
          v-model="search"
          icon="i-ph-magnifying-glass-duotone"
          :placeholder="t('pages.gamesPage.searchPlaceholder')"
          class="w-full"
        />
        <UButton
          type="submit"
          color="primary"
          class="rounded-[var(--radius-full)]"
          :aria-label="t('pages.gamesPage.searchLabel')"
        >
          <Icon name="i-ph-magnifying-glass-bold" class="h-4 w-4" />
        </UButton>
      </form>
    </section>

    <section v-if="pending" class="grid gap-4 sm:grid-cols-2">
      <USkeleton v-for="index in 6" :key="index" class="h-28 rounded-[var(--radius-xl)]" />
    </section>

    <UAlert v-else-if="error" color="error" variant="soft" :title="String(error.message || error)" />

    <section v-else-if="items.length" class="grid gap-4 sm:grid-cols-2">
      <article v-for="game in items" :key="game.id" class="surface-card-hover p-4">
        <div class="flex items-center gap-4">
          <NuxtImg
            v-if="game.avatarUrl"
            :src="game.avatarUrl"
            :alt="game.title"
            width="72"
            height="72"
            class="h-[72px] w-[72px] rounded-[var(--radius-md)] object-cover"
            loading="lazy"
          />
          <div class="min-w-0 flex-1">
            <h2 class="text-title-primary truncate">{{ game.title }}</h2>
            <p class="text-caption-secondary mt-1 line-clamp-2">{{ game.description }}</p>
            <p class="text-caption-secondary mt-1">
              {{ game.players }} {{ t("pages.gamesPage.playersLabel") }}
            </p>
          </div>
          <UButton
            color="primary"
            class="rounded-[var(--radius-full)]"
            :loading="playing"
            @click="play(game)"
          >
            {{ t("pages.gamesPage.playNow") }}
          </UButton>
        </div>
      </article>
    </section>

    <UCard v-else class="surface-card text-center" :ui="{ body: 'p-8' }">
      <Icon name="i-ph-game-controller-duotone" class="mx-auto h-10 w-10 text-[var(--text-tertiary)]" />
      <h2 class="text-heading mt-3">{{ t("pages.gamesPage.emptyTitle") }}</h2>
      <p class="text-body-secondary mt-2">{{ t("pages.gamesPage.emptyDescription") }}</p>
    </UCard>

    <div v-if="hasMore && !pending" class="flex justify-center">
      <UButton
        color="neutral"
        variant="soft"
        class="rounded-[var(--radius-full)]"
        :loading="loadingMore"
        @click="loadMore"
      >
        {{ t("navigation.leftSidebar.showMore") }}
      </UButton>
    </div>

    <Teleport to="body">
      <div
        v-if="activeGame"
        class="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#faf8ef]"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-3 text-white sm:px-5">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ activeGame.title }}</p>
            <p class="text-xs text-white/60">HTML5 self-host</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              class="rounded-[var(--radius-full)]"
              :to="activeGame.url"
              target="_blank"
            >
              <Icon name="i-ph-arrow-square-out-bold" class="h-4 w-4" />
              Mở tab
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              class="rounded-[var(--radius-full)]"
              @click="closeGame"
            >
              <Icon name="i-ph-x-bold" class="h-4 w-4" />
              Đóng
            </UButton>
          </div>
        </div>
        <iframe
          :src="activeGame.url"
          :title="activeGame.title"
          class="block min-h-0 flex-1 border-0 bg-[#faf8ef]"
          allow="autoplay; fullscreen; gamepad; clipboard-write"
          allowfullscreen
        />
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { useGamesPageVM } from "../../application/view-models/useGamesPageVM"

const { t } = useI18n()
const {
  activeTab,
  search,
  items,
  activeGame,
  hasMore,
  pending,
  error,
  loadingMore,
  playing,
  setTab,
  syncQuery,
  loadMore,
  play,
  closeGame,
} = useGamesPageVM()

const tabs = [
  { value: "my" as const, label: t("pages.gamesPage.tabMy") },
  { value: "latest" as const, label: t("pages.gamesPage.categoryAll") },
  { value: "popular" as const, label: t("pages.gamesPage.tabPopular") },
]
</script>
