// English description: Loads and exposes a single feed post for the post-detail route used by notifications and deep links.

import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"

export function useFeedPostDetailPageVM(postId: MaybeRefOrGetter<number>) {
  const repository = createApiFeedRepository()
  const resolvedPostId = computed(() => {
    const value = Number(toValue(postId) ?? 0)
    return Number.isFinite(value) ? value : 0
  })

  const {
    data: post,
    pending,
    error,
    refresh,
  } = useAsyncData(
    () => `feed-post-detail:${resolvedPostId.value}`,
    async () => {
      if (!resolvedPostId.value) {
        return null
      }

      return await repository.getPostById(resolvedPostId.value)
    },
    {
      watch: [resolvedPostId],
      default: () => null,
    },
  )

  return {
    post,
    pending,
    error,
    refresh,
  }
}
