<template>
  <UCard
    class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]"
    :ui="{ body: 'p-5 sm:p-6' }"
  >
    <div class="space-y-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-[640px]">
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.forumPage.filtersEyebrow") }}
          </p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">
            {{ t("pages.forumPage.filtersTitle") }}
          </h2>
          <p class="mt-1 text-body-secondary">
            {{ t("pages.forumPage.filtersDescription") }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1.5 text-[12px] font-semibold">
            {{ t("pages.forumPage.resultMeta", { count: resultCount }) }}
          </UBadge>
          <UButton
            v-if="canReset"
            color="neutral"
            variant="outline"
            size="sm"
            class="rounded-full"
            @click="emit('reset')"
          >
            <Icon name="i-ph-arrow-counter-clockwise-bold" class="mr-1.5 h-4 w-4" />
            {{ t("pages.forumPage.resetFilters") }}
          </UButton>
        </div>
      </div>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-ph-faders-horizontal-bold"
        :title="t('pages.forumPage.filterStatusTitle')"
        :description="statusLabel"
        class="rounded-[24px]"
      />

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <UInput
          v-model="searchModel"
          :placeholder="t('pages.forumPage.searchPlaceholder')"
          :aria-label="t('pages.forumPage.searchPlaceholder')"
          icon="i-ph-magnifying-glass-bold"
          size="xl"
          class="flex-1"
        />

        <UButton
          v-if="searchModel"
          color="neutral"
          variant="outline"
          size="xl"
          class="rounded-full"
          :aria-label="t('pages.forumPage.clearSearch')"
          @click="searchModel = ''"
        >
          <Icon name="i-ph-x-bold" class="h-4 w-4" />
        </UButton>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3 px-1">
          <p class="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.forumPage.sectionsTitle") }}
          </p>
          <span class="text-[12px] font-bold text-[var(--text-tertiary)]">
            {{ t("pages.forumPage.sectionCount", { count: Math.max(sections.length - 1, 0) }) }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="section in sections"
            :key="section.value"
            :color="selectedSectionModel === section.value ? 'primary' : 'neutral'"
            :variant="selectedSectionModel === section.value ? 'solid' : 'soft'"
            size="md"
            class="rounded-full px-4 text-[13px] font-bold"
            type="button"
            :aria-pressed="selectedSectionModel === section.value"
            @click="selectedSectionModel = section.value"
          >
            <Icon :name="messageText(section.icon)" class="mr-2 h-4 w-4" />
            <span>{{ messageText(section.label) }}</span>
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { ForumSection, ForumSectionKey } from "../../domain/types/forum.types"

const { t, rt } = useI18n()

defineProps<{
  sections: ReadonlyArray<ForumSection>
  resultCount: number
  statusLabel: string
  canReset?: boolean
}>()

const searchModel = defineModel<string>("search", {
  default: "",
})

const selectedSectionModel = defineModel<ForumSectionKey>("selectedSection", {
  default: "all",
})

const emit = defineEmits<{
  reset: []
}>()

const messageText = (value: unknown) =>
  typeof value === "string" ? value : rt(value as never)
</script>
