<template>
  <FoundationModalShell
    :open="Boolean(game)"
    :title="modalTitle"
    :description="modalDescription"
    size="xl"
    :status="sessionStatus"
    :status-title="statusTitle"
    :status-description="statusDescription"
    body-class="space-y-5"
    @close="emit('close')"
  >
    <div v-if="game" class="space-y-5">
      <UCard
        class="overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]"
        :ui="{ body: 'p-0' }"
      >
        <div class="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div class="relative min-h-[220px] overflow-hidden bg-[var(--color-primary-600)]">
            <div class="absolute inset-0" :style="{ background: fallbackCover }" />

            <NuxtImg
              v-if="showCover"
              :src="game.cover"
              :alt="game.title"
              width="960"
              height="720"
              loading="lazy"
              format="webp"
              class="relative h-full w-full object-cover"
              @error="showCover = false"
            />

            <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_10%,rgba(15,23,42,0.82)_100%)]" />
            <div class="absolute inset-x-4 bottom-4">
              <UBadge color="neutral" variant="soft" class="rounded-full border border-white/15 bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white">
                {{ game.categoryLabel }}
              </UBadge>
              <h3 class="mt-3 text-[1.4rem] font-black leading-tight text-white">
                {{ game.title }}
              </h3>
              <p class="mt-2 text-[13px] font-semibold leading-5 text-white/78">
                {{ game.description }}
              </p>
            </div>
          </div>

          <div class="space-y-4 p-4 sm:p-5">
            <div class="space-y-2">
              <p class="text-label-secondary text-[var(--text-primary)]">
                {{ t("pages.gamesPage.modalPlayAreaEyebrow") }}
              </p>
              <p class="text-body-secondary">
                {{ finished ? t("pages.gamesPage.modalFinishedDescription") : t("pages.gamesPage.modalAreaDescription") }}
              </p>
            </div>

            <UCard
              class="rounded-[24px] border border-[var(--border-default)] bg-white"
              :ui="{ body: 'p-5' }"
            >
              <div class="text-center">
                <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  {{ t("pages.gamesPage.modalCurrentScoreLabel") }}
                </p>
                <p class="mt-3 text-[3rem] font-black leading-none text-[var(--text-primary)]">
                  {{ score }}
                </p>
                <p class="mt-2 text-[14px] font-semibold text-[var(--text-secondary)]">
                  {{ t("pages.gamesPage.modalScoreHint") }}
                </p>
              </div>

              <UProgress
                class="mt-5"
                color="primary"
                size="xl"
                :model-value="scoreProgress"
                :aria-label="t('pages.gamesPage.modalScoreProgressAriaLabel', { score, target: scoreTarget })"
              />

              <div class="mt-5 flex justify-center">
                <UButton
                  type="button"
                  color="primary"
                  size="lg"
                  class="rounded-full"
                  :disabled="!game || finished || isBusy"
                  @click="score += scoreStep"
                >
                  <Icon name="i-ph-plus-circle-fill" class="mr-1.5 h-4 w-4" />
                  {{ t("pages.gamesPage.modalAddScore") }}
                </UButton>
              </div>
            </UCard>

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
          </div>
        </div>
      </UCard>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.gamesPage.modalBestScoreLabel") }}
          </p>
          <p class="mt-2 text-[1.45rem] font-black text-[var(--text-primary)]">
            {{ formatGameNumber(bestScore, locale) }}
          </p>
        </div>

        <div class="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.gamesPage.modalDurationLabel") }}
          </p>
          <p class="mt-2 text-[1.45rem] font-black text-[var(--text-primary)]">
            {{ duration }}
          </p>
        </div>

        <div class="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.gamesPage.modalStatusLabel") }}
          </p>
          <p class="mt-2 text-[1.45rem] font-black text-[var(--text-primary)]">
            {{ sessionStateLabel }}
          </p>
        </div>

        <div class="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.gamesPage.modalScoreGoalLabel") }}
          </p>
          <p class="mt-2 text-[1.45rem] font-black text-[var(--text-primary)]">
            {{ formatGameNumber(scoreTarget, locale) }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          size="lg"
          class="rounded-full"
          :disabled="isBusy"
          @click="emit('close')"
        >
          {{ t("pages.gamesPage.modalClose") }}
        </UButton>

        <UButton
          v-if="finished"
          type="button"
          color="primary"
          size="lg"
          class="rounded-full"
          @click="playAgain"
        >
          <Icon name="i-ph-arrow-counter-clockwise-bold" class="mr-1.5 h-4 w-4" />
          {{ t("pages.gamesPage.modalPlayAgain") }}
        </UButton>

        <UButton
          v-else
          type="button"
          color="primary"
          size="lg"
          class="rounded-full"
          :loading="isBusy"
          :disabled="!game || isBusy"
          @click="finish"
        >
          <Icon name="i-ph-flag-checkered-fill" class="mr-1.5 h-4 w-4" />
          {{ t("pages.gamesPage.modalFinish") }}
        </UButton>
      </div>
    </template>
  </FoundationModalShell>
</template>

<script setup lang="ts">
import FoundationModalShell from "../../../foundation/presentation/components/ModalShell.vue"
import type { GameSessionPayload, MockGame } from "../../domain/types/games.types"
import { formatGameNumber } from "../../infrastructure/mocks/gamesCatalog"

type PlaySessionStatus = "idle" | "loading" | "success" | "error"

const props = defineProps<{
  game?: MockGame | null
  bestScore: number
}>()

const emit = defineEmits<{
  close: []
  finish: [payload: GameSessionPayload]
}>()

const { t, locale } = useI18n()

const fallbackCover = "linear-gradient(135deg,var(--color-primary-500),var(--color-accent-500))"
const scoreStep = 150

const score = ref(0)
const finished = ref(false)
const elapsedSeconds = ref(0)
const sessionStatus = ref<PlaySessionStatus>("idle")
const showCover = ref(true)

let timer: ReturnType<typeof setInterval> | null = null

const isBusy = computed(() => sessionStatus.value === "loading")

const modalTitle = computed(() => {
  if (!props.game) return t("pages.gamesPage.modalTitle")

  return t("pages.gamesPage.modalTitleGame", {
    title: props.game.title,
  })
})

const modalDescription = computed(() => {
  if (!props.game) return t("pages.gamesPage.modalDescription")

  return t("pages.gamesPage.modalDescriptionGame", {
    title: props.game.title,
  })
})

const statusTitle = computed(() => {
  if (sessionStatus.value === "loading") return t("pages.gamesPage.modalStatusLoadingTitle")
  if (sessionStatus.value === "success") return t("pages.gamesPage.modalStatusSuccessTitle")
  if (sessionStatus.value === "error") return t("pages.gamesPage.modalStatusErrorTitle")
  return ""
})

const statusDescription = computed(() => {
  if (sessionStatus.value === "loading") return t("pages.gamesPage.modalStatusLoadingDescription")
  if (sessionStatus.value === "success") {
    return t("pages.gamesPage.modalStatusSuccessDescription", {
      score: formatGameNumber(score.value, locale.value),
    })
  }
  if (sessionStatus.value === "error") return t("pages.gamesPage.modalStatusErrorDescription")
  return ""
})

const duration = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
})

const scoreTarget = computed(() => Math.max(props.bestScore, scoreStep * 20, 3000))

const scoreProgress = computed(() => {
  if (scoreTarget.value <= 0) return 0
  return Math.min(Math.round((score.value / scoreTarget.value) * 100), 100)
})

const sessionStateLabel = computed(() => {
  if (finished.value) return t("pages.gamesPage.modalStateFinished")
  return t("pages.gamesPage.modalStatePlaying")
})

watch(
  () => props.game?.id,
  (gameId) => {
    stopTimer()

    if (!gameId) {
      resetSession(false)
      return
    }

    resetSession(true)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopTimer()
})

async function finish() {
  if (!props.game) return

  if (score.value <= 0) {
    sessionStatus.value = "error"
    return
  }

  sessionStatus.value = "loading"
  stopTimer()

  await new Promise(resolve => setTimeout(resolve, 320))

  if (!props.game) return

  finished.value = true
  sessionStatus.value = "success"

  emit("finish", {
    gameId: props.game.id,
    score: score.value,
    duration: duration.value,
  })
}

function playAgain() {
  stopTimer()
  resetSession(Boolean(props.game))
}

function resetSession(startTimerImmediately: boolean) {
  score.value = 0
  finished.value = false
  elapsedSeconds.value = 0
  sessionStatus.value = "idle"
  showCover.value = true

  if (startTimerImmediately) {
    startTimer()
  }
}

function startTimer() {
  stopTimer()

  if (!import.meta.client || !props.game) return

  timer = setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
}

function stopTimer() {
  if (timer === null) return

  clearInterval(timer)
  timer = null
}
</script>
