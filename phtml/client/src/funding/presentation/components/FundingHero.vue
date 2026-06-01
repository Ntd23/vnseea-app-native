<template>
  <section class="overflow-hidden rounded-[28px] border border-[#dbe3f2] bg-white shadow-[0_16px_36px_rgba(15,35,110,0.07)]">
    <!-- Grid: Strictly matching GoProHero padding and columns -->
    <div class="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-stretch">
      <!-- Left Content Box: Matching GoProHero structure but with Funding theme -->
      <div class="relative flex min-w-0 flex-col justify-between gap-8 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_45%,#2563eb_100%)] p-5 ring-1 ring-white/10 sm:p-7">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent)]" />

        <div class="relative z-10 space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex h-8 items-center rounded-full bg-white/10 px-3 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20 backdrop-blur-sm">
              {{ t("pages.fundingPage.heroEyebrow") }}
            </span>
            <span v-if="searchTerm" class="inline-flex h-8 items-center rounded-full bg-blue-500 px-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
              {{ t("pages.fundingPage.queryBadge", { query: searchTerm }) }}
            </span>
            <span v-if="activeCategoryLabel" class="inline-flex h-8 items-center rounded-full bg-white/5 px-3 text-[11px] font-bold uppercase tracking-wider text-white/80 ring-1 ring-white/10">
              {{ activeCategoryLabel }}
            </span>
          </div>

          <div class="space-y-3">
            <h1 class="max-w-[680px] text-[34px] font-black leading-tight text-white sm:text-[48px]">
              {{ t("pages.fundingPage.heroTitle") }}
            </h1>
            <p class="max-w-xl text-[15px] font-medium leading-7 text-white/70">
              {{ t("pages.fundingPage.heroDescription") }}
            </p>
          </div>
        </div>

        <div class="relative z-10 grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-center">
          <UButton
            :to="appRoutes.createFunding"
            variant="solid"
            class="inline-flex h-12 items-center justify-center rounded-[16px] bg-white px-5 text-[14px] font-black text-primary-900 shadow-[0_14px_26px_rgba(255,255,255,0.1)] transition hover:bg-slate-100 hover:text-primary-800 active:scale-95"
          >
            <Icon name="i-ph-plus-circle-fill" class="mr-2 h-5 w-5 shrink-0" />
            {{ t("pages.fundingPage.createCampaign") }}
          </UButton>

          <UButton
            v-if="hasActiveFilters"
            variant="outline"
            class="inline-flex h-12 items-center justify-center rounded-[16px] border border-white/20 bg-white/5 px-5 text-[14px] font-black text-white transition hover:bg-white/10 active:scale-95"
            @click="emit('reset')"
          >
            <Icon name="i-ph-arrow-counter-clockwise-bold" class="mr-2 h-5 w-5 shrink-0" />
            {{ t("pages.fundingPage.reset") }}
          </UButton>

          <span class="px-2 text-[13px] font-extrabold text-white/50">
            {{ t("pages.fundingPage.campaignCount", { count: campaignCount }) }}
          </span>
        </div>
      </div>

      <!-- Right Sidebar: Optimized Sidebar Stats matching GoProHero architecture -->
      <div class="grid gap-3">
        <!-- Focal Card: Matches GoProHero's Dark Card -->
        <div v-if="stats[1]" class="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0f172a] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] group">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-600/15 to-transparent pointer-events-none" />
          <div class="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-extrabold uppercase tracking-widest text-white/40">
                {{ stats[1].label }}
              </p>
              <h2 class="mt-2 text-[32px] font-black leading-none tracking-tight">
                {{ stats[1].value }}
              </h2>
              <p class="mt-2 text-[13px] font-semibold text-white/60">
                {{ stats[1].description }}
              </p>
            </div>

            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/5 text-blue-400 ring-1 ring-white/10 group-hover:rotate-6 transition-transform">
              <Icon name="i-ph-chart-line-up-bold" class="h-7 w-7" />
            </div>
          </div>
        </div>

        <!-- Mini Grid: Matches GoProHero's Mini Stats Architecture -->
        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-if="stats[0]"
            class="rounded-[22px] border border-[#dbe3f2] bg-white p-4 shadow-sm"
          >
            <p class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {{ stats[0].label }}
            </p>
            <p class="mt-2 text-[24px] font-black leading-none text-[var(--text-primary)]">
              {{ stats[0].value }}
            </p>
          </article>

          <article
            v-if="stats[2]"
            class="rounded-[22px] border border-[#dbe3f2] bg-white p-4 shadow-sm"
          >
            <p class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {{ stats[2].label }}
            </p>
            <p class="mt-2 text-[24px] font-black leading-none text-[var(--text-primary)]">
              {{ stats[2].value }}
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
const { t } = useI18n()

defineProps<{
  campaignCount: number
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
  searchTerm?: string
  activeCategoryLabel?: string
  activeStatusLabel?: string
  hasActiveFilters?: boolean
}>()

const emit = defineEmits<{
  reset: []
}>()
</script>
