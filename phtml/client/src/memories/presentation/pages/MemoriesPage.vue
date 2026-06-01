<!-- Description: Renders the memories route in PHP order with a simple header, friendversaries block, and memory posts backed by the feed bridge. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <section class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <div class="space-y-1.5">
        <p class="text-label-secondary">
          {{ t("pages.memoriesPage.heroEyebrow") }}
        </p>
        <h1 class="text-heading text-[var(--text-primary)]">
          {{ t("pages.memoriesPage.heroTitle") }}
        </h1>
      </div>
    </section>

    <UAlert
      v-if="errorMessage"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      class="rounded-[22px]"
      :description="errorMessage"
    />

    <section
      v-if="loading"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <div class="flex items-center justify-center gap-3 text-sm font-bold text-[var(--text-secondary)]">
        <Icon name="i-lucide-loader-2" class="h-5 w-5 animate-spin" />
        <span>{{ t("pages.memoriesPage.heroTitle") }}</span>
      </div>
    </section>

    <template v-else>
      <section
        v-if="memoryFriends.length > 0"
        class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]"
      >
        <div class="mb-4 space-y-1.5">
          <p class="text-label-secondary">
            {{ t("pages.memoriesPage.statYears") }}
          </p>
          <h2 class="text-heading text-[var(--text-primary)]">
            {{ t("pages.memoriesPage.sectionTitle", { count: memoryFriends.length }) }}
          </h2>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <article
            v-for="friend in memoryFriends"
            :key="friend.id"
            class="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4"
          >
            <p class="text-title-primary">{{ friend.name }}</p>
            <p class="mt-1 text-caption-secondary">{{ friend.label }}</p>
            <p class="mt-3 text-body-secondary">{{ friend.note }}</p>
          </article>
        </div>
      </section>

      <section
        v-if="memoryEntries.length > 0"
        class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]"
      >
        <div class="mb-4 space-y-1.5">
          <p class="text-label-secondary">
            {{ t("pages.memoriesPage.statMemories") }}
          </p>
          <h2 class="text-heading text-[var(--text-primary)]">
            {{ t("pages.memoriesPage.sectionTitle", { count: memoryEntries.length }) }}
          </h2>
        </div>

        <MemoriesMemoryFeed
          :entries="memoryEntries"
        />
      </section>

      <section
        v-if="memoryEntries.length === 0 && memoryFriends.length === 0"
        class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
      >
        <FoundationEmptyState
          icon="i-ph-clock-counter-clockwise-duotone"
          :title="t('pages.memoriesPage.emptyTitle')"
          :description="t('pages.memoriesPage.emptyDescription')"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import MemoriesMemoryFeed from "../components/MemoryFeed.vue"
import { useMemoriesPageVM } from "../../application/view-models/useMemoriesPageVM"

const { t } = useI18n()
const {
  loading,
  errorMessage,
  memoryEntries,
  memoryFriends,
  fetchMemories,
} = useMemoriesPageVM()

useSeoMeta({
  title: () => t("pages.memoriesPage.seoTitle"),
  description: () => t("pages.memoriesPage.seoDescription"),
})

await fetchMemories()
</script>
