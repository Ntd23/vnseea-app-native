// English description: Pinia store for backend header counters such as notifications, requests, and unread messages.

import { defineStore } from "pinia"
import { ref } from "vue"
import type { NavigationGeneral } from "../../domain/types/navigation.types"
import { createApiNavigationRepository } from "../../infrastructure/repositories/ApiNavigationRepository"

const emptyNavigationGeneral = (): NavigationGeneral => ({
  notificationCount: 0,
  friendRequestCount: 0,
  groupChatRequestCount: 0,
  messageCount: 0,
  videoCount: 0,
})

export const useNavigationGeneralStore = defineStore("navigation-general", () => {
  const summary = ref<NavigationGeneral>(emptyNavigationGeneral())
  const loading = ref(false)
  const hydrated = ref(false)

  async function hydrate(force = false) {
    if (loading.value) {
      return summary.value
    }

    if (hydrated.value && !force) {
      return summary.value
    }

    loading.value = true

    try {
      const repository = createApiNavigationRepository()
      summary.value = await repository.getGeneral()
      hydrated.value = true
      return summary.value
    }
    catch {
      summary.value = emptyNavigationGeneral()
      hydrated.value = true
      return summary.value
    }
    finally {
      loading.value = false
    }
  }

  function clear() {
    summary.value = emptyNavigationGeneral()
    loading.value = false
    hydrated.value = false
  }

  return {
    summary,
    loading,
    hydrated,
    hydrate,
    clear,
  }
})
