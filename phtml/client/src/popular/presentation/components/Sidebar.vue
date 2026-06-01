<!-- Description: Renders the popular-page sidebar using API-backed quick links, hashtags, and creator summaries. -->
<template>
  <aside class="min-w-0 space-y-4">
    <section class="rounded-[22px] border border-[#dbe3f2] bg-white p-4 shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 space-y-1">
          <p class="text-[11px] font-extrabold uppercase text-slate-500">{{ hashtagsEyebrow }}</p>
          <h2 class="text-[18px] font-black leading-tight text-[var(--text-primary)]">{{ hashtagsTitle }}</h2>
        </div>
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary-50 text-primary-700 ring-1 ring-primary-100">
          <Icon name="i-ph-hash-duotone" class="h-5 w-5" />
        </div>
      </div>

      <div class="mt-5 space-y-2">
        <NuxtLink
          v-for="item in hashtags"
          :key="item.to"
          :to="item.to"
          class="group flex items-center justify-between gap-3 rounded-[14px] border border-secondary-100 bg-secondary-50/60 px-3 py-2.5 transition hover:border-primary-200 hover:bg-white"
        >
          <span class="min-w-0 truncate text-[13px] font-extrabold text-[var(--text-primary)] group-hover:text-primary-700">{{ item.label }}</span>
          <span class="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-secondary-100">{{ item.score }}</span>
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#dbe3f2] bg-white p-4 shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 space-y-1">
          <p class="text-[11px] font-extrabold uppercase text-slate-500">{{ creatorsEyebrow }}</p>
          <h2 class="text-[18px] font-black leading-tight text-[var(--text-primary)]">{{ creatorsTitle }}</h2>
        </div>
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-orange-50 text-orange-700 ring-1 ring-orange-100">
          <Icon name="i-ph-fire-duotone" class="h-5 w-5" />
        </div>
      </div>

      <div class="mt-5 space-y-2.5">
        <article
          v-for="item in creators"
          :key="item.name"
          class="group flex items-center gap-3 rounded-[16px] border border-secondary-100 bg-secondary-50/60 p-3 transition hover:border-primary-200 hover:bg-white"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[12px] font-black text-white shadow-[0_10px_18px_rgba(37,99,235,0.14)] transition-transform group-hover:scale-105"
            :style="{ background: item.accent }"
          >
            {{ item.initials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-extrabold text-[var(--text-primary)]">{{ item.name }}</p>
            <p class="truncate text-[12px] font-medium text-slate-500">{{ item.role }}</p>
          </div>
          <span class="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[var(--text-primary)] ring-1 ring-secondary-100">
            {{ item.score }}
          </span>
        </article>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#dbe3f2] bg-white p-4 shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
      <div class="space-y-1">
        <p class="text-[11px] font-extrabold uppercase text-slate-500">{{ linksEyebrow }}</p>
        <h3 class="text-[18px] font-black leading-tight text-[var(--text-primary)]">{{ linksTitle }}</h3>
      </div>

      <div class="mt-5 space-y-2.5">
        <NuxtLink
          v-for="item in quickLinks"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 rounded-[16px] border border-secondary-100 bg-secondary-50/60 p-3 transition hover:border-primary-200 hover:bg-white"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white shadow-[0_10px_18px_rgba(37,99,235,0.14)] transition-transform group-hover:scale-105" :style="{ background: item.accent }">
            <Icon :name="item.icon.includes('duotone') ? item.icon : item.icon.replace('-bold', '-duotone').replace('-fill', '-duotone')" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-extrabold text-[var(--text-primary)] group-hover:text-primary-700">{{ item.title }}</p>
            <p class="line-clamp-1 text-[12px] font-medium text-slate-500">{{ item.description }}</p>
          </div>
          <Icon name="i-ph-arrow-up-right-duotone" class="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-primary-600" />
        </NuxtLink>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { PopularQuickLink } from "../../application/composables/usePopularData"

defineProps<{
  hashtags: ReadonlyArray<{ label: string; score: string; to: string }>
  hashtagsEyebrow: string
  hashtagsTitle: string
  creators: ReadonlyArray<{ name: string; initials: string; role: string; score: string; accent: string }>
  creatorsEyebrow: string
  creatorsTitle: string
  quickLinks: ReadonlyArray<PopularQuickLink>
  linksEyebrow: string
  linksTitle: string
}>()
</script>
