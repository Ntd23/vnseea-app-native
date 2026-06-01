<!-- Description: Renders the optional photos hero with normalized API-backed photo records. -->
<template>
  <section class="overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]">
    <!-- Gradient background -->
    <div class="relative">
      <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_45%,#3b82f6_100%)]" />
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />

      <div class="relative grid gap-5 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
        <!-- Left: Info -->
        <div class="min-w-0 text-white">
          <p class="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
            {{ eyebrow }}
          </p>
          <h1 class="mt-2 text-[1.8rem] font-black leading-tight tracking-[-0.03em] sm:text-[2.4rem]">
            {{ title }}
          </h1>
          <p class="mt-3 max-w-[600px] text-[13.5px] leading-6 text-white/70">
            {{ description }}
          </p>

          <!-- Meta chips -->
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
              {{ photo.albumTitle }}
            </span>
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur">
              <Icon name="i-ph-map-pin-bold" class="mr-1 inline h-3 w-3" />{{ photo.location }}
            </span>
            <span class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur">
              {{ photo.timeLabel }}
            </span>
          </div>

          <!-- Tags -->
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="tag in photo.tags"
              :key="tag"
              class="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/60"
            >
              {{ tag }}
            </span>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <button
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[13px] font-black text-[#0f172a] shadow-[var(--shadow-brand)] transition hover:-translate-y-0.5 sm:w-auto"
              type="button"
              @click="$emit('open')"
            >
              <Icon name="i-ph-arrows-out-simple-bold" class="h-4 w-4" />
              {{ primaryLabel }}
            </button>

            <NuxtLink
              :to="photo.companionTo"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-[13px] font-black text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
            >
              <Icon name="i-ph-arrow-up-right-bold" class="h-4 w-4" />
              {{ secondaryLabel }}
            </NuxtLink>
          </div>
        </div>

        <!-- Right: Featured photo -->
        <button
          class="group relative block overflow-hidden rounded-[22px] bg-slate-200 text-left shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
          type="button"
          @click="$emit('open')"
        >
          <img
            :alt="photo.title"
            :src="photo.image"
            class="h-[240px] w-full object-cover transition duration-500 group-hover:scale-105 sm:h-[290px]"
            loading="lazy"
          >
          <div class="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,16,40,0.84)_0%,rgba(8,16,40,0.1)_60%,transparent_100%)]" />
          <div class="absolute inset-x-0 bottom-0 p-4 text-white">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">{{ photo.photographerRole }}</p>
            <h2 class="mt-1.5 text-[1.15rem] font-black leading-tight">{{ photo.title }}</h2>
            <p class="mt-1 text-[12px] font-semibold text-white/70">
              {{ photo.photographer }} · {{ photo.location }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="grid grid-cols-2 gap-3 border-t border-[var(--border-light)] bg-[var(--bg-base)] px-5 py-4 sm:px-7 xl:grid-cols-4">
      <article
        v-for="item in stats"
        :key="item.label"
        class="rounded-[18px] border border-[var(--border-light)] bg-white px-4 py-3.5"
      >
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary-500)]/60">
          {{ item.label }}
        </p>
        <p class="mt-2 text-[1.4rem] font-black tracking-[-0.03em] text-[#0f172a]">
          {{ item.value }}
        </p>
        <p class="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
          {{ item.description }}
        </p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PhotoRecord } from "../../application/composables/usePhotosData"

defineProps<{
  eyebrow: string
  title: string
  description: string
  photo: PhotoRecord
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
  primaryLabel: string
  secondaryLabel: string
}>()

defineEmits<{ open: [] }>()
</script>
