// English description: Loads explore discovery data and exposes media-first state for the explore route.

import type { FeedExploreResponse } from "../../../feed/domain/types/feed.types"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

export function useExplorePageVM(
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const { data, status, error } = useAsyncData(
    "explore:discovery",
    () => repository.getExplore({ limit: 18 }),
    {
      default: () => ({
        posts: [],
        users: [],
        pages: [],
        hashtags: [],
        announcement: null,
      } as FeedExploreResponse),
      lazy: true,
      server: false,
    },
  )

  const loading = computed(() => status.value === "pending" || status.value === "idle")
  const errorMessage = computed(() => error.value ? (error.value instanceof Error ? error.value.message : t("pages.explorePage.emptyDescription")) : "")
  const response = computed(() => data.value as FeedExploreResponse)

  const mediaPosts = computed(() =>
    response.value.posts.filter(post => post.mediaItems.length > 0),
  )

  return {
    loading,
    errorMessage,
    response,
    mediaPosts,
  }
}
