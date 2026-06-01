// English description: Pinia store for backend friend and group chat requests shown in the header.

import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { HeaderRequestAction, HeaderRequestItem, HeaderRequestsSummary } from "../../domain/types/navigation-requests.types"
import { createApiNavigationRepository } from "../../infrastructure/repositories/ApiNavigationRepository"
import { useNavigationGeneralStore } from "./useNavigationGeneralStore"

const emptySummary = (): HeaderRequestsSummary => ({
  items: [],
  friendRequestCount: 0,
  groupChatRequestCount: 0,
})

export const useNavigationRequestsStore = defineStore("navigation-requests", () => {
  const summary = ref<HeaderRequestsSummary>(emptySummary())
  const loading = ref(false)
  const hydrated = ref(false)
  const errorMessage = ref("")

  const items = computed<HeaderRequestItem[]>(() => summary.value.items)
  const totalCount = computed(() => summary.value.friendRequestCount + summary.value.groupChatRequestCount)

  async function hydrate(force = false) {
    if (loading.value) {
      return summary.value
    }

    if (hydrated.value && !force) {
      return summary.value
    }

    loading.value = true
    errorMessage.value = ""

    try {
      const repository = createApiNavigationRepository()
      summary.value = await repository.getRequests()
      hydrated.value = true
      return summary.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Unable to load requests."
      hydrated.value = true
      return summary.value
    }
    finally {
      loading.value = false
    }
  }

  async function updateRequest(item: HeaderRequestItem, action: HeaderRequestAction) {
    const repository = createApiNavigationRepository()
    await repository.updateRequest(item, action)

    summary.value = {
      ...summary.value,
      items: summary.value.items.filter(request => request.id !== item.id || request.kind !== item.kind),
      friendRequestCount: item.kind === "friend"
        ? Math.max(0, summary.value.friendRequestCount - 1)
        : summary.value.friendRequestCount,
      groupChatRequestCount: item.kind === "group_chat"
        ? Math.max(0, summary.value.groupChatRequestCount - 1)
        : summary.value.groupChatRequestCount,
    }

    const navigationGeneralStore = useNavigationGeneralStore()
    await navigationGeneralStore.hydrate(true)
  }

  function clear() {
    summary.value = emptySummary()
    loading.value = false
    hydrated.value = false
    errorMessage.value = ""
  }

  return {
    summary,
    items,
    totalCount,
    loading,
    hydrated,
    errorMessage,
    hydrate,
    updateRequest,
    clear,
  }
})
