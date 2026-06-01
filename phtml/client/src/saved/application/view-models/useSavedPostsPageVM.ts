// English description: Loads saved posts through the saved repository and exposes page-level state for the saved route.

import { createApiSavedRepository } from "../../infrastructure/repositories/ApiSavedRepository"

export function useSavedPostsPageVM(
  repository = createApiSavedRepository(),
) {
  const { t } = useI18n()
  const { data, status, error, refresh } = useAsyncData(
    "saved:posts",
    () => repository.getSavedPosts({ limit: 20 }),
    {
      default: () => ({
        posts: [],
        hasMore: false,
        nextOffset: null,
      }),
    },
  )

  const loading = computed(() => status.value === "pending")
  const posts = computed(() => data.value.posts)
  const errorMessage = computed(() =>
    error.value
      ? error.value instanceof Error
        ? error.value.message
        : t("pages.savedPostsPage.emptyDescription")
      : "",
  )

  return {
    loading,
    errorMessage,
    posts,
    refresh,
  }
}
