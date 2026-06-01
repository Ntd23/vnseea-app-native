<template>
  <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-label-secondary text-[var(--text-primary)]">
          {{ $t("pages.jobsPage.results") }}
        </p>
        <h2 class="mt-1 text-heading text-[var(--text-primary)]">
          {{ heading }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {{ $t("pages.jobsPage.resultsMeta", { count, sort: sortLabel }) }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <UButton
          type="button"
          color="primary"
          size="lg"
          class="justify-center rounded-full"
          @click="emit('open-post')"
        >
          <Icon name="i-ph-plus-circle-fill" class="mr-1.5 h-4 w-4" />
          {{ $t("pages.jobsPage.postJob") }}
        </UButton>

        <UButton
          v-if="hasActiveFilters"
          type="button"
          color="neutral"
          variant="outline"
          size="lg"
          class="justify-center rounded-full"
          @click="emit('reset')"
        >
          <Icon name="i-ph-arrow-counter-clockwise" class="mr-1.5 h-4 w-4" />
          {{ $t("pages.jobsPage.reset") }}
        </UButton>
      </div>
    </div>

    <UAlert
      class="mt-5 rounded-[24px]"
      :color="hasActiveFilters ? 'primary' : 'neutral'"
      variant="subtle"
      icon="i-ph-list-magnifying-glass-fill"
      :title="$t('pages.jobsPage.resultStatusTitle')"
      :description="statusLabel"
    />
  </UCard>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  heading: string
  count: number
  sortLabel: string
  statusLabel: string
  hasActiveFilters?: boolean
}>(), {
  hasActiveFilters: false,
})

const emit = defineEmits<{
  "open-post": []
  reset: []
}>()
</script>
