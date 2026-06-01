<template>
  <section class="overflow-hidden rounded-[28px] border border-[#dbe3f2] bg-white shadow-[0_16px_36px_rgba(15,35,110,0.07)]">
    <div class="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-stretch">
      <div class="flex min-w-0 flex-col justify-between gap-8 rounded-[24px] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_100%)] p-5 ring-1 ring-[#dbe3f2] sm:p-7">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12px] font-semibold text-primary-700 ring-1 ring-primary-100">
              {{ eyebrow }}
            </span>
            <span
              v-if="mainStat"
              class="inline-flex h-8 items-center rounded-full bg-primary-600 px-3 text-[12px] font-semibold text-white"
            >
              {{ mainStat.value }} {{ mainStat.label }}
            </span>
          </div>

          <div class="space-y-3">
            <h1 class="max-w-[760px] text-[34px] font-extrabold leading-tight text-[var(--text-primary)] sm:text-[48px]">
              {{ title }}
            </h1>
            <p class="max-w-xl text-[15px] font-medium leading-7 text-slate-600">
              {{ description }}
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-center">
          <NuxtLink
            :to="primaryTo"
            class="inline-flex h-12 items-center justify-center rounded-[12px] border border-secondary-200 bg-white px-5 text-[14px] font-semibold text-[var(--text-primary)] transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 active:scale-95"
          >
            <Icon name="i-ph-house-line-duotone" class="mr-2 h-5 w-5 shrink-0" />
            {{ primaryLabel }}
          </NuxtLink>

          <NuxtLink
            :to="secondaryTo"
            class="inline-flex h-12 items-center justify-center rounded-[12px] bg-primary-600 px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,255,0.2)] transition hover:bg-primary-700 active:scale-95"
          >
            <Icon name="i-ph-magnifying-glass-duotone" class="mr-2 h-5 w-5 shrink-0" />
            {{ secondaryLabel }}
          </NuxtLink>
        </div>
      </div>

      <div class="grid gap-3">
        <div
          v-if="mainStat"
          class="rounded-[24px] border border-[#dbe3f2] bg-[#0f172a] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/52">
                {{ mainStat.label }}
              </p>
              <p class="mt-2 text-[34px] font-extrabold leading-none">
                {{ mainStat.value }}
              </p>
              <p class="mt-3 max-w-[320px] text-[13px] font-semibold leading-6 text-white/68">
                {{ mainStat.description }}
              </p>
            </div>

            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white text-[#0f172a]">
              <Icon name="i-ph-fire-fill" class="h-7 w-7" />
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <article
            v-for="item in secondaryStats"
            :key="item.label"
            class="rounded-[20px] border border-[#dbe3f2] bg-white p-4"
          >
            <p class="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              {{ item.label }}
            </p>
            <p class="mt-2 text-[26px] font-extrabold leading-none text-[var(--text-primary)]">
              {{ item.value }}
            </p>
            <p class="mt-2 text-[12px] font-semibold leading-5 text-slate-500">
              {{ item.description }}
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  eyebrow: string
  title: string
  description: string
  primaryLabel: string
  primaryTo: string
  secondaryLabel: string
  secondaryTo: string
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
}>()

const mainStat = computed(() => props.stats[0])
const secondaryStats = computed(() => props.stats.slice(1))
</script>
