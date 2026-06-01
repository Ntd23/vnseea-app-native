// English description: Loads reel videos and coordinates active-item navigation for the reels route.

import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"
import type { FeedRepository } from "../../../feed/domain/repositories/FeedRepository"
import { useFeedPostCardVM } from "../../../feed/application/view-models/useFeedPostCardVM"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

export function useReelsPageVM(
  repository: FeedRepository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const loading = ref(true)
  const errorMessage = ref("")
  const reels = ref<FeedPostRecord[]>([])
  const activeIndex = ref(0)
  const touchStartY = ref<number | null>(null)
  const touchStartX = ref<number | null>(null)
  const touchStartedFromLeftEdge = ref(false)
  const wheelLocked = ref(false)
  const videoRef = ref<HTMLVideoElement | null>(null)
  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(true)

  const activeReel = computed(() => reels.value[activeIndex.value] ?? null)
  const activeMedia = computed(() =>
    activeReel.value?.mediaItems.find(item => item.type === "video")
    ?? activeReel.value?.mediaItems[0]
    ?? null,
  )
  const progress = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))
  const feedPostVM = useFeedPostCardVM(activeReel)

  async function fetchReels() {
    loading.value = true
    errorMessage.value = ""

    try {
      const response = await repository.getVideos({ limit: 12 })
      reels.value = response.posts.filter(post =>
        post.primaryMediaType === "video" || post.mediaItems.some(item => item.type === "video"),
      )
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.watchPage.emptyDescription")
    }
    finally {
      loading.value = false
    }
  }

  function updateProgress() {
    if (videoRef.value) {
      currentTime.value = videoRef.value.currentTime
    }
  }

  function onMetadataLoaded() {
    if (videoRef.value) {
      duration.value = videoRef.value.duration
    }
  }

  function togglePlayPause() {
    const video = videoRef.value

    if (!video) {
      return
    }

    if (video.paused) {
      void video.play()
      isPlaying.value = true
      return
    }

    video.pause()
    isPlaying.value = false
  }

  function seek(event: MouseEvent) {
    if (!videoRef.value || !duration.value) {
      return
    }

    const container = event.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const position = (event.clientX - rect.left) / rect.width
    videoRef.value.currentTime = position * duration.value
  }

  function nextReel() {
    if (reels.value.length < 2) {
      return
    }

    activeIndex.value = (activeIndex.value + 1) % reels.value.length
  }

  function prevReel() {
    if (reels.value.length < 2) {
      return
    }

    activeIndex.value = (activeIndex.value - 1 + reels.value.length) % reels.value.length
  }

  function exitFullscreen() {
    if (import.meta.client && window.history.length > 1) {
      window.history.back()
      return
    }

    navigateTo("/")
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0]
    touchStartY.value = touch?.clientY ?? null
    touchStartX.value = touch?.clientX ?? null
    touchStartedFromLeftEdge.value = (touch?.clientX ?? Number.POSITIVE_INFINITY) <= 28
  }

  function onTouchEnd(event: TouchEvent) {
    const startY = touchStartY.value
    const startX = touchStartX.value
    const touch = event.changedTouches[0]
    const endY = touch?.clientY ?? null
    const endX = touch?.clientX ?? null
    touchStartY.value = null
    touchStartX.value = null

    if (startY == null || startX == null || endY == null || endX == null) {
      return
    }

    const deltaY = startY - endY
    const deltaX = endX - startX

    if (touchStartedFromLeftEdge.value && deltaX > 72 && Math.abs(deltaX) > Math.abs(deltaY)) {
      touchStartedFromLeftEdge.value = false
      exitFullscreen()
      return
    }

    touchStartedFromLeftEdge.value = false

    if (Math.abs(deltaY) < 50 || Math.abs(deltaY) < Math.abs(deltaX)) {
      return
    }

    if (deltaY > 0) {
      nextReel()
      return
    }

    prevReel()
  }

  function onWheel(event: WheelEvent) {
    if (wheelLocked.value || Math.abs(event.deltaY) < 32) {
      return
    }

    wheelLocked.value = true

    if (event.deltaY > 0) {
      nextReel()
    }
    else {
      prevReel()
    }

    window.setTimeout(() => {
      wheelLocked.value = false
    }, 420)
  }

  function handleWheel(event: WheelEvent) {
    if (feedPostVM.showComments.value) {
      return
    }

    event.preventDefault()
    onWheel(event)
  }

  function toggleComments() {
    feedPostVM.showComments.value = !feedPostVM.showComments.value
  }

  watch(
    activeReel,
    () => {
      currentTime.value = 0
      duration.value = 0
      isPlaying.value = true
    },
    { immediate: true },
  )

  void fetchReels()

  return {
    loading,
    errorMessage,
    reels,
    activeIndex,
    activeReel,
    activeMedia,
    videoRef,
    currentTime,
    duration,
    isPlaying,
    progress,
    ...feedPostVM,
    updateProgress,
    onMetadataLoaded,
    togglePlayPause,
    seek,
    nextReel,
    prevReel,
    exitFullscreen,
    onTouchStart,
    onTouchEnd,
    handleWheel,
    toggleComments,
  }
}
