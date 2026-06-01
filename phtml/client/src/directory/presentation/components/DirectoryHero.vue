<template>
  <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-lg)]" :ui="{ body: 'p-5 sm:p-7' }">
    <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div class="max-w-[760px]">
        <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
          {{ t("pages.directoryPage.heroEyebrow") }}
        </UBadge>
        <h1 class="mt-2 text-display text-[2.15rem] leading-tight text-[var(--text-primary)] sm:text-[3rem]">
          {{ t("pages.directoryPage.heroTitle") }}
        </h1>
        <p class="mt-3 text-[15px] font-semibold leading-7 text-[var(--text-secondary)]">
          {{ t("pages.directoryPage.heroDescription") }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1.5 text-[12px] font-semibold">
            {{ statusLabel }}
          </UBadge>
          <UBadge
            v-if="activeCategoryLabel"
            color="primary"
            variant="subtle"
            class="rounded-full px-3 py-1.5 text-[12px] font-semibold"
          >
            {{ activeCategoryLabel }}
          </UBadge>
          <UBadge
            v-if="searchTerm"
            color="neutral"
            variant="outline"
            class="rounded-full px-3 py-1.5 text-[12px] font-semibold"
          >
            {{ t("pages.directoryPage.queryBadge", { query: searchTerm }) }}
          </UBadge>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
        <UCard
          v-for="item in stats"
          :key="item.label"
          class="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]"
          :ui="{ body: 'p-4' }"
        >
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{{ item.label }}</p>
          <p class="mt-2 text-[1.55rem] font-black leading-none text-[var(--text-primary)]">{{ item.value }}</p>
          <p class="mt-1 text-[12px] font-semibold text-[var(--text-secondary)]">{{ item.description }}</p>
        </UCard>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
  statusLabel: string
  activeCategoryLabel?: string
  searchTerm?: string
}>()
</script>
