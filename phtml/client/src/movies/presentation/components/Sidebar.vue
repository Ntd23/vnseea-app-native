<template>
  <aside class="min-w-0 space-y-4">
    <section class="rounded-[28px] border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-md)]">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-label-secondary text-[var(--text-tertiary)]">{{ upcomingEyebrow }}</p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">{{ upcomingTitle }}</h2>
        </div>
        <span class="rounded-full bg-[var(--color-primary-50)] px-3 py-1.5 text-[12px] font-black text-[var(--color-primary-700)]">
          {{ upcoming.length }}
        </span>
      </div>

      <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <article
          v-for="(item, index) in upcoming"
          :key="item.title"
          class="rounded-[22px] border bg-[var(--bg-surface-hover)] p-3.5 transition hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
          :style="{ borderColor: upcomingTheme(index).border }"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[20px] border bg-white text-center shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
              :style="{ borderColor: upcomingTheme(index).border }"
            >
              <p
                class="max-w-[60px] truncate text-[10px] font-black uppercase tracking-[0.08em]"
                :style="{ color: upcomingTheme(index).color }"
              >
                {{ item.dayLabel }}
              </p>
              <p class="mt-1 text-[20px] font-black leading-none text-[var(--text-primary)]">
                {{ item.timeLabel }}
              </p>
            </div>

            <div class="min-w-0 flex-1">
              <h3 class="text-[14px] font-black leading-snug text-[var(--text-primary)]">
                {{ item.title }}
              </h3>

              <span
                class="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-black text-[var(--text-secondary)]"
                :style="{ borderColor: upcomingTheme(index).border }"
              >
                <Icon name="i-ph-broadcast-bold" class="h-3.5 w-3.5 shrink-0" :style="{ color: upcomingTheme(index).color }" />
                <span class="truncate">{{ item.formatLabel }}</span>
              </span>
            </div>
          </div>

          <p class="mt-3 line-clamp-3 text-[12px] font-semibold leading-5 text-[var(--text-secondary)]">
            {{ item.note }}
          </p>
        </article>
      </div>
    </section>

    <section class="rounded-[28px] border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-md)]">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-tertiary)]">{{ picksEyebrow }}</p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">{{ picksTitle }}</h2>
        </div>
        <Icon name="i-ph-star-four-fill" class="h-5 w-5 text-[var(--text-primary)]" />
      </div>

      <div class="mt-4 space-y-2.5">
        <button
          v-for="movie in picks"
          :key="movie.id"
          class="flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left transition"
          :class="movie.id === activeMovieId ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] hover:bg-[var(--color-primary-50)]'"
          type="button"
          @click="$emit('select', movie.id)"
        >
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-white" :style="{ background: movie.accent }">
            <Icon name="i-ph-popcorn-fill" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-black">{{ movie.title }}</p>
            <p class="mt-1 text-[12px] font-semibold opacity-70">{{ movie.director }}</p>
          </div>
          <span class="shrink-0 text-[12px] font-black">★ {{ movie.rating.toFixed(1) }}</span>
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-[28px] border border-[var(--border-default)] shadow-[var(--shadow-md)]" style="background-color: #0a58ca !important; color: white !important;">
      <div class="p-5">
        <p class="text-[11px] font-black uppercase tracking-[0.18em]" style="color: rgba(255,255,255,0.6) !important;">{{ $t("pages.moviesPage.sidebarRoutingEyebrow") }}</p>
        <h3 class="mt-2 text-[1.1rem] font-black leading-tight" style="color: white !important;">{{ $t("pages.moviesPage.sidebarRoutingTitle") }}</h3>
        <p class="mt-2 text-[12px] font-medium leading-5" style="color: rgba(255,255,255,0.7) !important;">
          {{ $t("pages.moviesPage.sidebarRoutingDescription") }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-2 p-4 pt-0">
        <NuxtLink to="/watch" class="flex items-center gap-3 rounded-2xl border border-white/10 p-3 transition" style="background-color: rgba(255,255,255,0.1) !important;">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style="background-color: rgba(255,255,255,0.2) !important;">
            <Icon name="i-ph-play-fill" class="h-5 w-5" style="color: white !important;" />
          </div>
          <span class="text-[13px] font-bold" style="color: white !important;">Xem Watch</span>
        </NuxtLink>
        
        <NuxtLink to="/live" class="flex items-center gap-3 rounded-2xl border border-white/10 p-3 transition" style="background-color: rgba(255,255,255,0.1) !important;">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style="background-color: rgba(255,255,255,0.2) !important;">
            <Icon name="i-ph-broadcast-fill" class="h-5 w-5" style="color: white !important;" />
          </div>
          <span class="text-[13px] font-bold" style="color: white !important;">Xem Live</span>
        </NuxtLink>

        <NuxtLink to="/blogs" class="flex items-center gap-3 rounded-2xl border border-white/10 p-3 transition" style="background-color: rgba(255,255,255,0.1) !important;">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style="background-color: rgba(255,255,255,0.2) !important;">
            <Icon name="i-ph-newspaper-fill" class="h-5 w-5" style="color: white !important;" />
          </div>
          <span class="text-[13px] font-bold" style="color: white !important;">Đọc Blog</span>
        </NuxtLink>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { MockMovie, UpcomingMovie } from "../../application/composables/useMockMoviesData"

defineProps<{
  activeMovieId: string
  picks: ReadonlyArray<MockMovie>
  picksEyebrow: string
  picksTitle: string
  upcoming: ReadonlyArray<UpcomingMovie>
  upcomingEyebrow: string
  upcomingTitle: string
}>()

defineEmits<{ select: [id: string] }>()

const upcomingThemes = [
  {
    border: "rgba(10,88,202,0.18)",
    color: "#0a58ca",
  },
  {
    border: "rgba(124,58,237,0.18)",
    color: "#7c3aed",
  },
  {
    border: "rgba(15,118,110,0.18)",
    color: "#0f766e",
  },
]

const upcomingTheme = (index: number) => upcomingThemes[index % upcomingThemes.length]
</script>
