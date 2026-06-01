<template>
  <section class="overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-xl)] sm:rounded-[32px]">
    <div class="relative overflow-hidden">
      <img :alt="movie.title" class="absolute inset-0 h-full w-full object-cover" :src="movie.backdrop">
      <div class="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.92)_8%,rgba(15,23,42,0.74)_42%,rgba(15,23,42,0.18)_100%)]" />
      <div class="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(15,23,42,0.16),transparent)]" />

      <div class="relative grid gap-5 p-4 sm:gap-6 sm:p-7 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
        <div class="max-w-[760px] min-w-0">
          <div class="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/88 backdrop-blur">
            <Icon name="i-ph-popcorn-fill" class="h-4 w-4" />
            {{ eyebrow }}
          </div>

          <h1 class="mt-4 text-[1.7rem] font-black leading-[0.98] text-white sm:text-[3rem] xl:text-[3.35rem]">
            {{ movie.title }}
          </h1>

          <p class="mt-3 max-w-[640px] text-[13px] font-semibold leading-6 text-white/78 sm:text-[15px] sm:leading-7">
            {{ movie.summary }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-extrabold text-white/86 backdrop-blur">
              {{ movie.year }}
            </span>
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-extrabold text-white/86 backdrop-blur">
              {{ movie.runtime }}
            </span>
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-extrabold text-white/86 backdrop-blur">
              ★ {{ movie.rating.toFixed(1) }}
            </span>
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-extrabold text-white/86 backdrop-blur">
              {{ movie.director }}
            </span>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span v-for="tag in movie.tags" :key="tag" class="rounded-full border border-white/12 bg-black/22 px-3 py-1.5 text-[11px] font-black text-white/80 backdrop-blur">
              {{ tag }}
            </span>
          </div>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <NuxtLink
              :to="movie.to"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[13px] font-black text-[var(--text-primary)] shadow-[0_10px_30px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 sm:w-auto"
            >
              <Icon name="i-ph-play-fill" class="h-4 w-4" />
              {{ primaryLabel }}
            </NuxtLink>
            <NuxtLink
              :to="movie.companionTo"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-[13px] font-black text-white backdrop-blur transition hover:bg-white/14 sm:w-auto"
            >
              <Icon name="i-ph-newspaper-clipping-fill" class="h-4 w-4" />
              {{ secondaryLabel }}
            </NuxtLink>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <div
            v-for="(item, index) in stats"
            :key="item.label"
            class="rounded-[24px] border border-white/12 bg-white/10 p-3.5 text-white backdrop-blur sm:p-4"
            :class="index === 0 ? 'col-span-2 xl:col-span-1' : ''"
          >
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">{{ item.label }}</p>
            <p class="mt-2 text-[1.45rem] font-black leading-none sm:text-[1.7rem]">{{ item.value }}</p>
            <p class="mt-1 text-[12px] font-semibold text-white/72">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MockMovie } from "../../application/composables/useMockMoviesData"

defineProps<{
  eyebrow: string
  movie: MockMovie
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
  primaryLabel: string
  secondaryLabel: string
}>()
</script>
