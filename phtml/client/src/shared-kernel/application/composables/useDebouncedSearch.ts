import { ref, watch } from "vue"
import { refDebounced } from "@vueuse/core"
import { useRoute, useRouter } from "#app"

interface SearchOptions {
  debounceMs?: number
  syncUrl?: boolean
  queryParamName?: string
}

export const useDebouncedSearch = (options: SearchOptions = {}) => {
  const {
    debounceMs = 500,
    syncUrl = true,
    queryParamName = "q",
  } = options

  const route = useRoute()
  const router = useRouter()
  const initialValue = syncUrl ? (route.query[queryParamName] as string || "") : ""

  const searchQuery = ref(initialValue)
  const debouncedSearchQuery = refDebounced(searchQuery, debounceMs)

  if (syncUrl) {
    watch(debouncedSearchQuery, (newValue) => {
      const currentQuery = { ...route.query }

      if (newValue) {
        currentQuery[queryParamName] = newValue
      }
      else {
        delete currentQuery[queryParamName]
      }

      router.push({
        query: currentQuery,
        replace: true,
      })
    })

    watch(() => route.query[queryParamName], (newVal) => {
      const value = (newVal as string) || ""
      if (value !== searchQuery.value) {
        searchQuery.value = value
      }
    })
  }

  return {
    searchQuery,
    debouncedSearchQuery,
  }
}
