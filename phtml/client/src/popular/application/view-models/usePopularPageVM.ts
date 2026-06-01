// English description: Loads the popular feed list and exposes page-ready state for the popular route.

import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

export function usePopularPageVM(
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const loading = ref(true)
  const errorMessage = ref("")
  const posts = ref<FeedPostRecord[]>([])

  async function fetchPopularPosts() {
    loading.value = true
    errorMessage.value = ""

    try {
      const response = await repository.getPopular({ limit: 20 })
      posts.value = response.posts
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.popularPage.emptyDescription")
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    errorMessage,
    posts,
    fetchPopularPosts,
  }
}
