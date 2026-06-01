// English description: Loads configured feed post background colors from the backend with local fallback assets.

import { apiRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"
import {
  defaultFeedPostColorAsset,
  feedPostColorAssets,
  type FeedPostColorAsset,
} from "../constants/post-color-assets"

type FeedPostColorsResponse = {
  colors: FeedPostColorAsset[]
}

const uniqueColorsByStyle = (colors: FeedPostColorAsset[]) => {
  const seen = new Set<string>()

  return colors.filter((color) => {
    const key = `${color.bg}|${color.text}`.toLowerCase()
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

export function useFeedPostColors() {
  const { t } = useI18n()
  const client = useNuxtApiClient()
  const state = useAsyncData(
    "feed-post-colors",
    () => client.get<FeedPostColorsResponse>(apiRoutes.feed.postColors).catch(() => ({ colors: feedPostColorAssets })),
    {
      default: () => ({ colors: feedPostColorAssets }),
    },
  )
  const postColorOptions = computed(() => {
    const backendColors = uniqueColorsByStyle(state.data.value?.colors ?? [])
    const colors = backendColors.length
      ? [
          ...backendColors,
          ...feedPostColorAssets.filter(asset => !backendColors.some(color => color.id === asset.id)),
        ]
      : feedPostColorAssets

    return colors.map(color => ({
      ...color,
      label: color.labelKey ? t(color.labelKey) : color.label || t("feed.publisherBox.colorOption", { id: color.id }),
    }))
  })
  const postColorById = computed(() =>
    postColorOptions.value.reduce(
      (colors, color) => {
        colors[color.id] = color
        return colors
      },
      {} as Record<number, FeedPostColorAsset & { label: string }>,
    ),
  )
  const defaultPostColor = computed(() => postColorOptions.value[0] ?? defaultFeedPostColorAsset)

  return {
    ...state,
    postColorOptions,
    postColorById,
    defaultPostColor,
  }
}
