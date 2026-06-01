// English description: Manages debounced header search suggestions for users, pages, groups, and hashtags via the navigation repository.

import { watchDebounced } from "@vueuse/core"
import { createApiNavigationRepository } from "../../infrastructure/repositories/ApiNavigationRepository"
import type { HeaderSearchSuggestion } from "../../domain/types/navigation-search.types"

export function useHeaderSearchSuggestions(query: Ref<string>) {
  const repository = createApiNavigationRepository()
  const items = ref<HeaderSearchSuggestion[]>([])
  const loading = ref(false)
  const open = ref(false)

  async function refresh() {
    const keyword = query.value.trim()

    if (!keyword) {
      items.value = []
      loading.value = false
      return
    }

    loading.value = true

    try {
      items.value = await repository.getSearchSuggestions(keyword, 8)
    }
    catch {
      items.value = []
    }
    finally {
      loading.value = false
    }
  }

  function show() {
    if (query.value.trim()) {
      open.value = true
    }
  }

  function hide() {
    window.setTimeout(() => {
      open.value = false
    }, 120)
  }

  watchDebounced(
    query,
    () => {
      if (!import.meta.client) {
        return
      }

      void refresh().then(() => {
        open.value = Boolean(query.value.trim()) && (items.value.length > 0 || loading.value)
      })
    },
    { debounce: 220, maxWait: 600 },
  )

  return {
    items,
    loading,
    open,
    show,
    hide,
    refresh,
  }
}
