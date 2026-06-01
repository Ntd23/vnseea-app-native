<template>
  <section class="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,var(--color-primary-700)_0%,var(--color-primary-500)_58%,var(--color-accent-500)_132%)] px-5 pb-8 pt-7 text-white shadow-[var(--shadow-xl)] sm:px-7 lg:px-8">
    <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.16)_100%)]" />

    <div class="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div class="max-w-[780px]">
        <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/72">
          {{ $t("pages.jobsPage.heroEyebrow") }}
        </p>
        <h1 class="mt-4 text-display text-[2.2rem] leading-[0.95] text-white sm:text-[3rem]">
          {{ $t("pages.jobsPage.heroTitle") }}
        </h1>
        <p class="mt-4 max-w-[680px] text-[15px] leading-7 text-white/88 sm:text-[17px]">
          {{ $t("pages.jobsPage.heroDescription") }}
        </p>

        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <UButton
            type="button"
            color="neutral"
            size="lg"
            class="justify-center rounded-xl bg-white font-semibold text-[var(--text-primary)]"
            @click="emit('open-post')"
          >
            <Icon name="i-ph-briefcase-fill" class="mr-1.5 h-4 w-4" />
            {{ $t("pages.jobsPage.postJob") }}
          </UButton>

          <UButton
            type="button"
            color="neutral"
            :variant="savedOnly ? 'solid' : 'outline'"
            size="lg"
            class="justify-center rounded-xl border shadow-[0_4px_14px_rgba(0,0,255,0.2)] transition-colors font-semibold"
            :class="savedOnly
              ? 'border-white/85 bg-white text-[var(--color-primary-700)] hover:bg-white/92'
              : 'border-white/28 bg-white/12 text-white hover:bg-white/18'"
            @click="emit('toggle-saved')"
          >
            <Icon name="i-ph-bookmark-simple-fill" class="mr-1.5 h-4 w-4" />
            {{ savedOnly ? $t("pages.jobsPage.showAllJobs") : $t("pages.jobsPage.savedJobs") }}
          </UButton>

          <UButton
            v-if="hasActiveFilters"
            type="button"
            color="neutral"
            variant="outline"
            size="lg"
            class="justify-center rounded-xl border-white/25 font-semibold text-white"
            @click="emit('reset')"
          >
            <Icon name="i-ph-arrow-counter-clockwise" class="mr-1.5 h-4 w-4" />
            {{ $t("pages.jobsPage.reset") }}
          </UButton>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <UBadge color="neutral" variant="soft" class="rounded-full bg-white/12 px-4 py-2 text-[12px] font-semibold text-white">
            {{ $t("pages.jobsPage.jobCount", { count: jobCount }) }}
          </UBadge>

          <UBadge
            v-if="searchTerm"
            color="neutral"
            variant="soft"
            class="rounded-full bg-white/12 px-4 py-2 text-[12px] font-semibold text-white"
          >
            {{ $t("pages.jobsPage.heroSearchChip", { query: searchTerm }) }}
          </UBadge>

          <UBadge
            v-if="activeCategoryLabel"
            color="neutral"
            variant="soft"
            class="rounded-full bg-white/12 px-4 py-2 text-[12px] font-semibold text-white"
          >
            {{ activeCategoryLabel }}
          </UBadge>

          <UBadge
            v-if="selectedJobTitle"
            color="neutral"
            variant="soft"
            class="rounded-full bg-white/12 px-4 py-2 text-[12px] font-semibold text-white"
          >
            {{ $t("pages.jobsPage.heroSelectedJob", { title: selectedJobTitle }) }}
          </UBadge>
        </div>

        <div class="mt-5 rounded-[18px] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-[6px]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/62">
            {{ $t("pages.jobsPage.filterStatusTitle") }}
          </p>
          <p class="mt-2 text-sm leading-6 text-white/88">
            {{ statusLabel }}
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 xl:w-[430px] xl:grid-cols-1">
        <div
          v-for="item in stats"
          :key="item.label"
          class="rounded-[18px] border border-white/15 bg-white/10 p-4 backdrop-blur-[6px]"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/62">
            {{ item.label }}
          </p>
          <p class="mt-2 text-[1.6rem] font-extrabold leading-none text-white">
            {{ item.value }}
          </p>
          <p class="mt-1 text-[13px] leading-5 text-white/74">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  jobCount: number
  savedOnly: boolean
  stats: ReadonlyArray<{
    label: string
    value: string | number
    description: string
  }>
  statusLabel: string
  hasActiveFilters?: boolean
  searchTerm?: string
  activeCategoryLabel?: string
  selectedJobTitle?: string
}>(), {
  hasActiveFilters: false,
  searchTerm: "",
  activeCategoryLabel: "",
  selectedJobTitle: "",
})

const emit = defineEmits<{
  "open-post": []
  "toggle-saved": []
  reset: []
}>()
</script>
