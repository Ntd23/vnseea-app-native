<!-- Description: Renders the selected watch item hero using API-backed video metadata from the normalized feed posts. -->
<template>
  <section class="watch-player">
    <div class="watch-player__video">
      <NuxtImg
        :alt="video.title"
        class="watch-player__img"
        :src="video.cover"
        loading="lazy"
        format="webp"
      />
      <div class="watch-player__overlay" />

      <!-- Top badges -->
      <div class="watch-player__badges">
        <span class="watch-player__badge">{{ video.categoryLabel }}</span>
        <span class="watch-player__badge">{{ video.duration }}</span>
      </div>

      <!-- Play button -->
      <button
        class="watch-player__play-btn"
        type="button"
        @click="$emit('togglePlay')"
      >
        <Icon
          :name="playing ? 'i-ph-pause-fill' : 'i-ph-play-fill'"
          class="watch-player__play-icon"
          :class="{ 'watch-player__play-icon--play': !playing }"
        />
      </button>

      <!-- Controls bar -->
      <div class="watch-player__controls">
        <div class="watch-player__progress-rail" @click="noop">
          <div class="watch-player__progress-fill" :style="{ width: `${progress}%` }" />
        </div>
        <div class="watch-player__time-row">
          <span class="watch-player__time">{{ elapsed }}</span>
          <span class="watch-player__ready">{{ $t("pages.watchPage.playerReady") }}</span>
          <span class="watch-player__time">{{ video.duration }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WatchVideo } from "../../application/composables/useWatchData"

defineProps<{
  video: WatchVideo
  playing: boolean
  progress: number
  elapsed: string
}>()

defineEmits<{ togglePlay: [] }>()

const noop = () => {}
</script>

<style scoped>
.watch-player {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #1e293b;
  background: #0b1120;
  color: #ffffff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.watch-player__video {
  position: relative;
  aspect-ratio: 16/9;
  min-height: 0;
  overflow: hidden;
}

@media (min-width: 640px) {
  .watch-player__video { min-height: 320px; }
}

.watch-player__img {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 700ms ease;
}

.watch-player__img:hover {
  transform: scale(1.05);
}

.watch-player__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(11,17,32,0.9), rgba(11,17,32,0.1), rgba(11,17,32,0.05));
}

/* Badges */
.watch-player__badges {
  position: absolute;
  left: 16px;
  top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.watch-player__badge {
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.4);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  backdrop-filter: blur(8px);
}

/* Play button */
.watch-player__play-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  width: 80px;
  height: 80px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.18);
  color: #ffffff;
  cursor: pointer;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  transition: all 0.25s ease;
}

.watch-player__play-btn:hover {
  background: rgba(255,255,255,0.28);
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 12px 40px rgba(0,0,255,0.2);
}

.watch-player__play-icon {
  width: 40px;
  height: 40px;
}

.watch-player__play-icon--play {
  transform: translateX(2px);
}

/* Controls */
.watch-player__controls {
  position: absolute;
  inset-x: 0;
  bottom: 0;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.watch-player__progress-rail {
  position: relative;
  height: 6px;
  width: 100%;
  cursor: pointer;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,0.2);
}

.watch-player__progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #0000ff;
  box-shadow: 0 0 10px rgba(0,0,255,0.5);
  transition: width 0.3s ease;
}

.watch-player__time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.watch-player__time {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  font-variant-numeric: tabular-nums;
}

.watch-player__ready {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  user-select: none;
}
</style>
