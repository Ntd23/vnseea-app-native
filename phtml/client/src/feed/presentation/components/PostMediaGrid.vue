<template>
  <div class="media-grid" :class="items.length > 1 ? 'media-grid--multi' : ''">
    <template v-for="(item, index) in items" :key="`${item.src}-${index}`">
      <button v-if="item.type === 'image'" class="media-grid__item" type="button"
        :aria-label="t('feed.postMediaGrid.openLabel', { index: index + 1 })" @click="emit('open', index)">
        <img :src="item.src" :alt="item.alt || t('feed.postMediaGrid.label', { index: index + 1 })"
          class="media-grid__img" loading="lazy">
      </button>

      <div v-else class="media-grid__item media-grid__item--video">
        <video ref="videoRefs" :aria-label="item.alt || t('feed.postMediaGrid.label', { index: index + 1 })"
          class="media-grid__img media-grid__video" autoplay controls loop playsinline preload="auto"
          @loadedmetadata="playVideoWithSound">
          <source :src="item.src" :type="item.mime || 'video/mp4'">
        </video>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core"

const { t } = useI18n()
const videoRefs = ref<HTMLVideoElement[]>([])

defineProps<{
  items: Array<{
    type: "image" | "video"
    src: string
    alt?: string
    mime?: string
  }>
}>()

const emit = defineEmits<{ open: [index: number] }>()

function playVideoWithSound(event: Event) {
  const video = event.currentTarget as HTMLVideoElement | null

  if (!video) return

  playVisibleVideo(video)
}

function playVisibleVideo(video: HTMLVideoElement) {
  video.muted = true // Phải tắt tiếng mới autoplay được trên hầu hết trình duyệt
  video.volume = 1
  void video.play().catch(() => {
    // Nếu vẫn lỗi, trình duyệt yêu cầu người dùng click vào trang web trước
  })
}

onMounted(() => {
  for (const video of videoRefs.value) {
    useIntersectionObserver(
      video,
      ([entry]) => {
        if (!entry) return

        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          playVisibleVideo(video)
          return
        }

        video.pause()
      },
      {
        threshold: [0, 0.55, 1],
      },
    )
  }
})
</script>

<style scoped>
.media-grid {
  display: grid;
  gap: 6px;
}

.media-grid--multi {
  grid-template-columns: repeat(2, 1fr);
}

.media-grid__item {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background: #f1f5f9;
  text-align: left;
  border: none;
  cursor: pointer;
}

.media-grid__item--video {
  cursor: default;
  background: #000000; /* Nền đen cho video */
}

.media-grid__img {
  width: 100%;
  height: auto;
  max-height: 500px; /* Giới hạn chiều cao cho video/ảnh dài */
  object-fit: contain; /* Hiện đầy đủ nội dung, không bị cắt */
  display: block;
  transition: transform 0.25s ease;
}

.media-grid__item:hover .media-grid__img {
  transform: scale(1.02);
}

.media-grid__item--video:hover .media-grid__img,
.media-grid__video:hover {
  transform: none;
}

.media-grid__video {
  cursor: default;
}
</style>
