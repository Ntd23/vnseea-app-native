<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.forumPage.filtersEyebrow") }}
          </p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">
            {{ t("pages.forumPage.sidebarTitle") }}
          </h2>
        </div>

        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="outline"
          size="sm"
          class="rounded-full"
          @click="emit('reset')"
        >
          {{ t("pages.forumPage.resetFilters") }}
        </UButton>
      </div>

      <UAlert
        class="mt-4 rounded-[22px]"
        color="neutral"
        variant="subtle"
        icon="i-ph-chart-bar-horizontal-fill"
        :title="t('pages.forumPage.filterStatusTitle')"
        :description="statusLabel"
      />
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <p class="text-label-secondary text-[var(--text-tertiary)]">
        {{ t("pages.forumPage.sectionsEyebrow") }}
      </p>
      <h2 class="mt-1 text-heading text-[var(--text-primary)]">
        {{ t("pages.forumPage.sectionsTitle") }}
      </h2>

      <div class="mt-4 space-y-2" role="list">
        <UButton
          v-for="section in sections"
          :key="section.value"
          :color="selectedSection === section.value ? 'primary' : 'neutral'"
          :variant="selectedSection === section.value ? 'solid' : 'soft'"
          size="lg"
          class="w-full justify-between rounded-[20px] px-3 py-3 text-left"
          type="button"
          :aria-pressed="selectedSection === section.value"
          @click="emit('selectSection', section.value)"
        >
          <span class="inline-flex min-w-0 items-center gap-3">
            <Icon :name="messageText(section.icon)" class="h-5 w-5 shrink-0" />
            <span class="min-w-0 text-left">
              <span class="block truncate text-[13px] font-bold">
                {{ messageText(section.label) }}
              </span>
              <span class="block truncate text-[11px] opacity-80">
                {{ messageText(section.description) }}
              </span>
            </span>
          </span>

          <UBadge
            :color="selectedSection === section.value ? 'neutral' : 'primary'"
            :variant="selectedSection === section.value ? 'soft' : 'subtle'"
            class="rounded-full px-2.5 py-1 text-[11px] font-bold"
          >
            {{ counts[section.value] ?? 0 }}
          </UBadge>
        </UButton>
      </div>
    </UCard>
  </aside>
</template>

<script setup lang="ts">
import type { ForumSection, ForumSectionKey } from "../../domain/types/forum.types"

const { t, rt } = useI18n()

defineProps<{
  sections: ReadonlyArray<ForumSection>
  counts: Record<string, number>
  selectedSection: ForumSectionKey
  statusLabel: string
  hasActiveFilters?: boolean
}>()

const emit = defineEmits<{
  selectSection: [value: ForumSectionKey]
  reset: []
}>()

const messageText = (value: unknown) =>
  typeof value === "string" ? value : rt(value as never)
</script>
