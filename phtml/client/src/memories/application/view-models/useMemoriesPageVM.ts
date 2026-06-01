// English description: Loads memories data and exposes sharing actions plus screen state for the memories route.

import type { FeedMemoryFriendRecord, FeedMemoryRecord } from "../../../feed/domain/types/feed.types"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

export function useMemoriesPageVM(
  repository = createApiFeedRepository(),
) {
  const route = useRoute()
  const requestURL = useRequestURL()
  const toast = useToast()
  const { t } = useI18n()

  const loading = ref(true)
  const errorMessage = ref("")
  const memoryEntries = ref<FeedMemoryRecord[]>([])
  const memoryFriends = ref<FeedMemoryFriendRecord[]>([])

  async function fetchMemories() {
    loading.value = true
    errorMessage.value = ""

    try {
      const response = await repository.getMemories()
      memoryEntries.value = response.posts
      memoryFriends.value = response.friends
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.memoriesPage.emptyDescription")
    }
    finally {
      loading.value = false
    }
  }



  return {
    loading,
    errorMessage,
    memoryEntries,
    memoryFriends,
    fetchMemories,
  }
}
