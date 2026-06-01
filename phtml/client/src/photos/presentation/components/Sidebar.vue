<!-- Description: Renders the photos sidebar using API-backed quick links, hashtag rollups, and creator summaries. -->
<template>
  <aside class="min-w-0 space-y-4">

    <!-- Hashtags -->
    <section class="rounded-[24px] border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-md)]">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary-500)]/70">{{ hashtagsEyebrow }}</p>
          <h2 class="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">{{ hashtagsTitle }}</h2>
        </div>
        <Icon name="i-ph-hash-bold" class="h-5 w-5 text-[var(--color-primary-400)]" />
      </div>

      <div class="flex flex-wrap gap-1.5">
        <NuxtLink
          v-for="item in hashtags"
          :key="item.to"
          :to="item.to"
          class="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)]"
        >
          {{ item.label }}
          <span class="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-tertiary)]">{{ item.score }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Top Creators -->
    <section class="rounded-[24px] border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-md)]">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary-500)]/70">{{ creatorsEyebrow }}</p>
          <h2 class="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">{{ creatorsTitle }}</h2>
        </div>
        <Icon name="i-ph-camera-fill" class="h-5 w-5 text-[var(--color-primary-400)]" />
      </div>

      <!-- Divider-based list, like ReadBlogMain comments -->
      <div class="divide-y divide-[var(--border-light)]">
        <div
          v-for="(item, index) in creators"
          :key="item.name"
          class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <!-- Rank -->
          <span
            class="w-4 shrink-0 text-center text-[11px] font-black"
            :class="index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-[var(--text-tertiary)]'"
          >{{ index + 1 }}</span>

          <!-- Avatar -->
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[12px] font-black text-white"
            :style="{ background: item.accent }"
          >{{ item.initials }}</div>

          <!-- Name + role -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-bold text-[var(--text-primary)]">{{ item.name }}</p>
            <p class="truncate text-[11px] text-[var(--text-tertiary)]">{{ item.role }}</p>
          </div>

          <!-- Score -->
          <span class="shrink-0 text-[12px] font-extrabold text-[var(--color-primary-600)]">{{ item.score }}</span>
        </div>
      </div>
    </section>

    <!-- Quick Links — branded dark -->
    <section class="overflow-hidden rounded-[24px] border border-[var(--border-default)] shadow-[var(--shadow-md)]">
      <div class="bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_55%,#3b82f6_100%)] p-4 text-white">
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">{{ linksEyebrow }}</p>
        <h3 class="mt-1 text-[1.05rem] font-extrabold leading-snug">{{ linksTitle }}</h3>

        <div class="mt-3.5 space-y-2">
          <NuxtLink
            v-for="item in quickLinks"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/8 px-3 py-2.5 transition hover:bg-white/15"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              :style="{ background: item.accent }"
            >
              <Icon :name="item.icon" class="h-3.5 w-3.5 text-white" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[12.5px] font-bold">{{ item.title }}</p>
              <p class="mt-0.5 truncate text-[11px] text-white/60">{{ item.description }}</p>
            </div>
            <Icon name="i-ph-arrow-right-bold" class="h-3.5 w-3.5 shrink-0 text-white/35" />
          </NuxtLink>
        </div>
      </div>
    </section>

  </aside>
</template>

<script setup lang="ts">
import type { PhotoQuickLink } from "../../application/composables/usePhotosData"

defineProps<{
  hashtags: ReadonlyArray<{ label: string; score: string; to: string }>
  hashtagsEyebrow: string
  hashtagsTitle: string
  creators: ReadonlyArray<{ name: string; initials: string; role: string; score: string; accent: string }>
  creatorsEyebrow: string
  creatorsTitle: string
  quickLinks: ReadonlyArray<PhotoQuickLink>
  linksEyebrow: string
  linksTitle: string
}>()
</script>
