<template>
  <NuxtLink
    :to="item.href"
    class="group block"
    :aria-label="t('pages.directoryPage.openItemAria', { title: item.title })"
  >
    <UCard class="overflow-hidden rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)] transition group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lg)]" :ui="{ body: 'p-0' }">
      <div class="relative min-h-[190px] p-5 text-white" :style="{ background: item.accent }">
        <div class="absolute inset-0 bg-black/10" />
        <div class="relative z-10 flex h-full flex-col justify-between gap-8">
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="neutral" variant="soft" class="rounded-full bg-white/18 px-3 py-1.5 text-[12px] font-extrabold text-white backdrop-blur">
                {{ item.categoryLabel }}
              </UBadge>
              <UBadge
                v-if="item.featured"
                color="primary"
                variant="subtle"
                class="rounded-full border border-white/20 bg-white/18 px-3 py-1.5 text-[12px] font-extrabold text-white backdrop-blur"
              >
                {{ t("pages.directoryPage.featuredLabel") }}
              </UBadge>
            </div>
            <Icon name="i-ph-arrow-up-right-bold" class="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div>
            <h3 class="text-2xl font-black leading-tight">{{ item.title }}</h3>
            <p class="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/80">{{ item.description }}</p>
          </div>
        </div>
      </div>

      <div class="p-4">
        <div class="grid grid-cols-2 gap-2">
          <UCard class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]" :ui="{ body: 'p-3' }">
            <p class="text-[11px] font-bold uppercase text-[var(--text-tertiary)]">{{ t("pages.directoryPage.metaLabel") }}</p>
            <p class="mt-1 text-[14px] font-black text-[var(--text-primary)]">{{ item.meta }}</p>
          </UCard>
          <UCard class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]" :ui="{ body: 'p-3' }">
            <p class="text-[11px] font-bold uppercase text-[var(--text-tertiary)]">{{ t("pages.directoryPage.activityLabel") }}</p>
            <p class="mt-1 text-[14px] font-black text-[var(--text-primary)]">{{ item.count }}</p>
          </UCard>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge
            v-for="tag in item.tags"
            :key="tag"
            color="primary"
            variant="subtle"
            class="rounded-full px-3 py-1.5 text-[12px] font-extrabold"
          >
            {{ tag }}
          </UBadge>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-[12px] font-semibold text-[var(--text-secondary)]">
            {{ item.categoryLabel }}
          </p>
          <span class="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--text-primary)]">
            {{ t("pages.directoryPage.openDirectory") }}
            <Icon name="i-ph-arrow-right-bold" class="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { DirectoryItem } from "../../domain/types/directory.types"

const { t } = useI18n()

defineProps<{ item: DirectoryItem }>()
</script>
