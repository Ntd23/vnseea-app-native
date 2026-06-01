<template>
  <article>
    <UCard
      class="group h-full overflow-hidden rounded-[30px] border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
      :class="selected ? 'border-[var(--color-primary-500)] shadow-[var(--shadow-xl)] ring-4 ring-[var(--color-primary-50)]' : 'border-[var(--border-default)] shadow-[var(--shadow-md)]'"
      :ui="{ body: 'p-0' }"
    >
      <div class="relative aspect-[16/10] overflow-hidden bg-[var(--bg-surface-hover)]">
        <div class="absolute inset-0" :style="{ background: fallbackCover }" />

        <NuxtImg
          v-if="showCover"
          :src="game.cover"
          :alt="game.title"
          width="960"
          height="600"
          loading="lazy"
          format="webp"
          densities="x1 x2"
          sizes="(max-width: 1024px) 100vw, 50vw"
          class="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          @error="showCover = false"
        />

        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_10%,rgba(15,23,42,0.84)_100%)]" />

        <div class="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
          <UBadge color="neutral" variant="soft" class="rounded-full border border-white/15 bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white">
            {{ game.categoryLabel }}
          </UBadge>

          <UBadge
            v-if="game.isNew"
            color="warning"
            variant="solid"
            class="rounded-full px-3 py-1.5 text-[11px] font-bold"
          >
            {{ t("pages.gamesPage.badgeNew") }}
          </UBadge>

          <UBadge
            v-if="saved"
            color="primary"
            variant="solid"
            class="rounded-full px-3 py-1.5 text-[11px] font-bold"
          >
            {{ t("pages.gamesPage.badgeSaved") }}
          </UBadge>
        </div>

        <div class="absolute inset-x-4 bottom-4">
          <h3 class="line-clamp-2 text-[1.2rem] font-black leading-tight text-white">
            {{ game.title }}
          </h3>
          <p class="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/78">
            {{ game.description }}
          </p>
        </div>
      </div>

      <div class="space-y-5 p-4 sm:p-5">
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {{ t("pages.gamesPage.playsLabel") }}
            </p>
            <p class="mt-1 text-[15px] font-black text-[var(--text-primary)]">
              {{ formatGameNumber(game.plays, locale) }}
            </p>
          </div>

          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {{ t("pages.gamesPage.playersLabel") }}
            </p>
            <p class="mt-1 text-[15px] font-black text-[var(--text-primary)]">
              {{ formatGameNumber(game.players, locale) }}
            </p>
          </div>

          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {{ t("pages.gamesPage.ratingLabel") }}
            </p>
            <p class="mt-1 text-[15px] font-black text-[var(--text-primary)]">
              {{ game.rating.toFixed(1) }}
            </p>
          </div>

          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {{ t("pages.gamesPage.bestLabel") }}
            </p>
            <p class="mt-1 text-[15px] font-black text-[var(--text-primary)]">
              {{ formatGameNumber(bestScore, locale) }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="tag in game.tags"
            :key="tag"
            color="primary"
            variant="subtle"
            class="rounded-full px-3 py-1.5 text-[11px] font-semibold"
          >
            {{ tag }}
          </UBadge>
        </div>

        <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <UButton
            type="button"
            color="primary"
            size="lg"
            class="justify-center rounded-[18px]"
            @click="emit('play', game)"
          >
            <Icon name="i-ph-play-fill" class="mr-1.5 h-4 w-4" />
            {{ t("pages.gamesPage.playNow") }}
          </UButton>

          <UButton
            type="button"
            color="neutral"
            :variant="selected ? 'solid' : 'outline'"
            size="lg"
            class="justify-center rounded-[18px]"
            :aria-pressed="selected"
            @click="emit('select', game)"
          >
            <Icon :name="selected ? 'i-ph-check-circle-fill' : 'i-ph-eye-bold'" class="mr-1.5 h-4 w-4" />
            {{ selected ? t("pages.gamesPage.previewSelected") : t("pages.gamesPage.preview") }}
          </UButton>

          <UButton
            type="button"
            color="neutral"
            :variant="saved ? 'solid' : 'outline'"
            size="lg"
            class="justify-center rounded-[18px] px-4"
            :aria-label="saveActionLabel"
            :title="saveActionLabel"
            @click="emit('toggleSave', game.id)"
          >
            <Icon :name="saved ? 'i-ph-bookmark-simple-fill' : 'i-ph-bookmark-simple-bold'" class="h-4 w-4" />
          </UButton>
        </div>
      </div>
    </UCard>
  </article>
</template>

<script setup lang="ts">
import type { MockGame } from "../../domain/types/games.types"
import { formatGameNumber } from "../../infrastructure/mocks/gamesCatalog"

const props = defineProps<{
  game: MockGame
  saved: boolean
  bestScore: number
  selected: boolean
}>()

const emit = defineEmits<{
  play: [game: MockGame]
  select: [game: MockGame]
  toggleSave: [id: string]
}>()

const { t, locale } = useI18n()

const showCover = ref(true)

const fallbackCover = "linear-gradient(135deg,var(--color-primary-500),var(--color-accent-500))"

const saveActionLabel = computed(() =>
  props.saved ? t("pages.gamesPage.unsave") : t("pages.gamesPage.save"),
)

watch(
  () => props.game.id,
  () => {
    showCover.value = true
  },
  { immediate: true },
)
</script>
