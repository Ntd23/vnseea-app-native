// English description: Loads watch-page video posts and exposes pagination state for the watch route.

import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"
import type { FeedRepository } from "../../../feed/domain/repositories/FeedRepository"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

export function useWatchPageVM(
  repository: FeedRepository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const loading = ref(true)
  const loadingMore = ref(false)
  const errorMessage = ref("")
  const posts = ref<FeedPostRecord[]>([])
  const hasMore = ref(false)
  const nextOffset = ref<number | null>(null)
  const selectedPostId = ref<number | null>(null)
  const isModalOpen = ref(false)

  const selectedPost = computed(() =>
    posts.value.find(post => post.id === selectedPostId.value) ?? null,
  )

  async function fetchVideos(reset = true) {
    errorMessage.value = ""

    try {
      const response = await repository.getVideos({
        limit: 10,
        afterPostId: reset ? undefined : nextOffset.value ?? undefined,
      })

      hasMore.value = response.hasMore
      nextOffset.value = response.nextOffset
      posts.value = reset
        ? response.posts
        : [...posts.value, ...response.posts.filter(post => !posts.value.some(existing => existing.id === post.id))]
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.watchPage.emptyDescription")
    }
    finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) {
      return
    }

    loadingMore.value = true
    await fetchVideos(false)
  }

  function handleOpenWatchModal(postId: number) {
    selectedPostId.value = postId
    isModalOpen.value = true
  }

  function handleSelectVideo(postId: number) {
    selectedPostId.value = postId
  }

  function closeWatchModal() {
    isModalOpen.value = false
  }

  function nextVideo() {
    const index = posts.value.findIndex(post => post.id === selectedPostId.value)

    if (index !== -1 && index < posts.value.length - 1) {
      selectedPostId.value = posts.value[index + 1].id
    }
  }

  function prevVideo() {
    const index = posts.value.findIndex(post => post.id === selectedPostId.value)

    if (index > 0) {
      selectedPostId.value = posts.value[index - 1].id
    }
  }

  watch(
    posts,
    (newPosts) => {
      if (newPosts.length > 0 && selectedPostId.value == null) {
        selectedPostId.value = newPosts[0].id
        isModalOpen.value = true
      }
    },
    { immediate: true },
  )

  void fetchVideos(true)

  return {
    loading,
    loadingMore,
    errorMessage,
    posts,
    hasMore,
    nextOffset,
    selectedPost,
    isModalOpen,
    loadMore,
    handleOpenWatchModal,
    handleSelectVideo,
    closeWatchModal,
    nextVideo,
    prevVideo,
  }
}
