// English description: Loads hashtag posts from the feed repository and exposes normalized route-driven state for the hashtag route.

import { formatHashtagLabel, normalizeHashtagValue } from "../../../feed/application/composables/useHashtagData"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"

function readRouteParam(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] || "")
  }

  return typeof value === "string" ? value : ""
}

export function useHashtagPageVM(
  repository = createApiFeedRepository(),
) {
  const route = useRoute()
  const { t } = useI18n()

  const rawTag = computed(() => normalizeHashtagValue(readRouteParam(route.params.tag)))
  const hashtagLabel = computed(() => formatHashtagLabel(rawTag.value))

  const { data, status, error } = useAsyncData(
    () => `explore:hashtag:${rawTag.value}`,
    () => rawTag.value ? repository.getHashtag(rawTag.value, { limit: 18 }) : Promise.resolve({ posts: [] }),
    {
      watch: [rawTag],
      default: () => ({ posts: [] }),
      lazy: true,
      server: false,
    },
  )

  const loading = computed(() => status.value === "pending" || status.value === "idle")
  const errorMessage = computed(() => error.value ? (error.value instanceof Error ? error.value.message : t("pages.hashtagPage.emptyDescription", { tag: hashtagLabel.value })) : "")
  const matchingPosts = computed(() => data.value?.posts ?? [])

  return {
    loading,
    errorMessage,
    matchingPosts,
    rawTag,
    hashtagLabel,
  }
}
