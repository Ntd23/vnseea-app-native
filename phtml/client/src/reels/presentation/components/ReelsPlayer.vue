<!-- Description: Renders the fullscreen reels viewer for API-backed reel cards with swipe and keyboard navigation. -->
<template>
  <div
    class="reel-player"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @wheel.passive="onWheel"
  >
    <Transition
      enter-active-class="reel-transition-enter-active"
      leave-active-class="reel-transition-leave-active"
      enter-from-class="reel-transition-enter-from"
      enter-to-class="reel-transition-enter-to"
      leave-from-class="reel-transition-leave-from"
      leave-to-class="reel-transition-leave-to"
      mode="out-in"
    >
      <div :key="reel.id" class="reel-card">
        <img
          :src="reel.cover"
          :alt="reel.title"
          class="reel-card__bg"
        >

        <!-- Top gradient -->
        <div class="reel-card__grad-top" />
        <!-- Bottom gradient -->
        <div class="reel-card__grad-bottom" />

        <!-- Playing pill -->
        <div class="reel-pill">
          <span class="reel-pill__dot">
            <span class="reel-pill__dot-ping" />
            <span class="reel-pill__dot-core" />
          </span>
          <span class="reel-pill__label">{{ $t('pages.reelsPage.playing') }}</span>
          <span class="reel-pill__counter">{{ currentIndex + 1 }}/{{ total }}</span>
        </div>

        <!-- More button -->
        <button
          class="reel-more-btn"
          type="button"
          :aria-label="$t('pages.reelsPage.more')"
        >
          <Icon name="i-ph-dots-three-outline-vertical-fill" class="h-5 w-5" />
        </button>

        <ReelsOverlay :reel="reel" />

        <!-- Progress bar -->
        <div class="reel-progress">
          <div class="reel-progress__fill" :style="{ width: progressWidth }" />
        </div>
      </div>
    </Transition>

    <!-- Swipe hint -->
    <div class="reel-hint">
      <div class="reel-hint__inner">
        <p class="reel-hint__text">{{ $t('pages.reelsPage.swipeHint') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ReelsOverlay from './ReelsOverlay.vue'

const props = defineProps<{
  reel: {
    id: number
    title: string
    author: string
    subtitle: string
    description: string
    likes: number
    comments: number
    shares: number
    views: number
    music: string
    tags: string[]
    cover: string
    avatar: string
    authorPath: string
  }
  currentIndex: number
  total: number
}>()

const emit = defineEmits<{
  (event: 'next'): void
  (event: 'prev'): void
}>()

const touchStartY = ref<number | null>(null)
const wheelLock = ref(false)

const progressWidth = computed(() => `${((props.currentIndex + 1) / props.total) * 100}%`)

const onTouchStart = (event: TouchEvent) => {
  touchStartY.value = event.changedTouches[0]?.clientY ?? null
}

const onTouchEnd = (event: TouchEvent) => {
  const startY = touchStartY.value
  const endY = event.changedTouches[0]?.clientY ?? null
  touchStartY.value = null

  if (startY == null || endY == null) return
  const deltaY = startY - endY
  if (Math.abs(deltaY) < 50) return

  if (deltaY > 0) emit('next')
  else emit('prev')
}

const onWheel = (event: WheelEvent) => {
  if (wheelLock.value) return
  if (Math.abs(event.deltaY) < 12) return

  wheelLock.value = true
  if (event.deltaY > 0) emit('next')
  else emit('prev')

  window.setTimeout(() => {
    wheelLock.value = false
  }, 520)
}

const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

  if (event.key === 'ArrowDown' || event.key === 'PageDown') {
    event.preventDefault()
    emit('next')
  }

  if (event.key === 'ArrowUp' || event.key === 'PageUp') {
    event.preventDefault()
    emit('prev')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.reel-player {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  width: 100%;
  align-items: center;
  justify-content: center;
  touch-action: pan-y;
  overscroll-behavior: contain;
}

/* Card */
.reel-card {
  position: relative;
  height: 100%;
  max-height: 100%;
  width: 100%;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 80px rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@media (min-width: 640px) {
  .reel-card {
    aspect-ratio: 9/16;
    width: auto;
    max-width: min(460px, calc(100vw - 40px));
    border-radius: 34px;
  }
}

.reel-card__bg {
  height: 100%;
  width: 100%;
  object-fit: cover;
  user-select: none;
  transition: transform 1600ms ease;
}

.reel-card:hover .reel-card__bg {
  transform: scale(1.04);
}

.reel-card__grad-top {
  pointer-events: none;
  position: absolute;
  inset: 0;
  top: 0;
  height: 144px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.24), transparent);
}

.reel-card__grad-bottom {
  pointer-events: none;
  position: absolute;
  inset: 0;
  top: auto;
  height: 58%;
  background: linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.46), transparent);
}

/* Playing pill */
.reel-pill {
  position: absolute;
  left: 1rem;
  top: 1rem;
  display: flex;
  max-width: calc(100% - 88px);
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.42);
  padding: 8px 14px;
  color: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.22);
  backdrop-filter: blur(10px);
}

@media (min-width: 640px) {
  .reel-pill { left: 1.25rem; top: 1.25rem; }
}

.reel-pill__dot {
  position: relative;
  display: flex;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.reel-pill__dot-ping {
  position: absolute;
  display: inline-flex;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #4d88ff;
  opacity: 0.7;
  animation: ping 1s ease-in-out infinite;
}

.reel-pill__dot-core {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0000ff;
}

@keyframes ping {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.8); opacity: 0; }
}

.reel-pill__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reel-pill__counter {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
}

/* More button */
.reel-more-btn {
  position: absolute;
  right: 1rem;
  top: 1rem;
  display: flex;
  height: 44px;
  width: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.42);
  color: white;
  cursor: pointer;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.22);
  transition: background 0.15s ease;
}

.reel-more-btn:hover {
  background: rgba(0,0,0,0.62);
  color: #4d88ff;
}

@media (min-width: 640px) {
  .reel-more-btn { right: 1.25rem; top: 1.25rem; }
}

/* Progress bar */
.reel-progress {
  pointer-events: none;
  position: absolute;
  inset-x: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255,255,255,0.1);
}

.reel-progress__fill {
  height: 100%;
  background: #0000ff;
  transition: width 0.3s ease;
  box-shadow: 0 0 8px rgba(0,0,255,0.5);
}

/* Swipe hint */
.reel-hint {
  pointer-events: none;
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: none;
}

@media (min-width: 768px) {
  .reel-hint { display: block; }
}

.reel-hint__inner {
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.07);
  padding: 8px 20px;
  backdrop-filter: blur(10px);
}

.reel-hint__text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: rgba(255,255,255,0.55);
}

/* Transitions */
.reel-transition-enter-active {
  transition: opacity 400ms ease, transform 400ms ease;
}
.reel-transition-leave-active {
  transition: opacity 300ms ease, transform 300ms ease;
}
.reel-transition-enter-from {
  opacity: 0;
  transform: translateY(48px) scale(0.98);
}
.reel-transition-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.reel-transition-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.reel-transition-leave-to {
  opacity: 0;
  transform: translateY(-48px) scale(0.98);
}
</style>
