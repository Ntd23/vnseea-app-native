// English description: Loads the groups directory screen state and derives tab metadata for community group listing routes.

import { computed, toValue, type MaybeRefOrGetter } from "vue"
import {
  communityGroupRouteMap,
  communityGroupTabs,
} from "../../domain/constants/community-options"
import type { CommunityGroupTab } from "../../domain/types/community.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

export function useCommunityGroupsPageVM(
  modeSource: MaybeRefOrGetter<CommunityGroupTab>,
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const mode = computed(() => toValue(modeSource))

  const { data: groupsData, status } = useAsyncData(
    () => `community:groups:${mode.value}`,
    () => repository.getGroups(mode.value),
    {
      watch: [mode],
      default: () => [],
    },
  )

  const pending = computed(() => status.value === "pending")
  const groups = computed(() => {
    const list = groupsData.value ?? []
    if (mode.value === "suggested") {
      return list.filter(group => !group.joined && !group.requested)
    }
    return list
  })

  const pageTitle = computed(() => {
    if (mode.value === "suggested") {
      return t("community.groups.titleSuggested")
    }

    if (mode.value === "joined") {
      return t("community.groups.titleJoined")
    }

    return t("community.groups.title")
  })

  const tabItems = computed(() =>
    communityGroupTabs.map(tab => ({
      ...tab,
      to: communityGroupRouteMap[tab.value],
    })),
  )

  const cardActionLabel = computed(() => {
    if (mode.value === "suggested") {
      return "community.groups.action.explore"
    }

    if (mode.value === "joined") {
      return "community.groups.action.viewUpdates"
    }

    return "community.groups.action.viewGroup"
  })

  return {
    mode,
    pending,
    groups,
    pageTitle,
    tabItems,
    cardActionLabel,
  }
}
