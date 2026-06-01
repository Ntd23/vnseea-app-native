// English description: Loads backend-backed event tab data and syncs the active directory tab with the route query.

import { computed, toValue, type MaybeRefOrGetter } from "vue"
import type { EventRecord, EventTabItem, EventTabKey } from "../../domain/types/events.types"
import { eventTabKeys, normalizeEventTab } from "../../domain/constants/events-options"
import { createApiEventsRepository } from "../../infrastructure/repositories/ApiEventsRepository"

export function useEventsPageVM(
  tabSource: MaybeRefOrGetter<EventTabKey>,
  repository = createApiEventsRepository(),
) {
  const { t } = useI18n()
  const activeTab = computed(() => normalizeEventTab(toValue(tabSource)))

  const { data, status, refresh } = useAsyncData(
    "events:catalog",
    () => repository.getCatalog(),
    {
      default: () => ({
        browse: [],
        going: [],
        invited: [],
        interested: [],
        past: [],
        mine: [],
      }),
    },
  )

  const pending = computed(() => status.value === "pending")

  const tabItems = computed<EventTabItem[]>(() => [
    { key: "browse", label: t("pages.eventsPage.tabBrowse") },
    { key: "going", label: t("pages.eventsPage.tabGoing") },
    { key: "invited", label: t("pages.eventsPage.tabInvited") },
    { key: "interested", label: t("pages.eventsPage.tabInterested") },
    { key: "past", label: t("pages.eventsPage.tabPast") },
    { key: "mine", label: t("pages.eventsPage.tabMy") },
  ])

  const tabCounts = computed<Record<EventTabKey, number>>(() => ({
    browse: data.value.browse.length,
    going: data.value.going.length,
    invited: data.value.invited.length,
    interested: data.value.interested.length,
    past: data.value.past.length,
    mine: data.value.mine.length,
  }))

  const events = computed<EventRecord[]>(() => data.value[activeTab.value] ?? [])

  const pageTitle = computed(() => {
    if (activeTab.value === "going") return t("pages.eventsPage.tabGoing")
    if (activeTab.value === "invited") return t("pages.eventsPage.tabInvited")
    if (activeTab.value === "interested") return t("pages.eventsPage.tabInterested")
    if (activeTab.value === "past") return t("pages.eventsPage.tabPast")
    if (activeTab.value === "mine") return t("pages.eventsPage.tabMy")
    return t("pages.eventsPage.tabBrowse")
  })

  return {
    eventTabKeys,
    activeTab,
    pending,
    events,
    pageTitle,
    refresh,
    tabItems,
    tabCounts,
  }
}
