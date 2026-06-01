<!-- Description: Renders the backend-backed events directory using the legacy PHP tab order and list-first layout. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <section class="wow-content">
      <div class="wo-page-heading wo-page-heading--big">
        <span class="wo-page-heading__icon">
          <Icon name="i-ph-calendar-blank-fill" class="h-5 w-5" />
        </span>
        <span>{{ $t("pages.eventsPage.title") }}</span>
      </div>
    </section>

    <section class="wow-content">
      <div class="wo-page-menu">
        <div class="wo-page-menu__scroll">
          <div class="wo-page-menu__items">
            <NuxtLink
              v-for="tab in tabItems"
              :key="tab.key"
              :to="tabLink(tab.key)"
              class="wo-page-menu__link"
              :class="{ 'wo-page-menu__link--active': activeTab === tab.key }"
            >
              {{ tab.label }}
            </NuxtLink>
          </div>
        </div>

        <NuxtLink :to="appRoutes.createEvent" class="btn-main btn-mat-raised">
          <Icon name="i-ph-plus-bold" class="h-5 w-5" />
          {{ $t("pages.eventsPage.createEvent") }}
        </NuxtLink>
      </div>
    </section>

    <div v-if="pending" class="grid gap-4 lg:grid-cols-2">
      <div
        v-for="item in 4"
        :key="item"
        class="overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
      >
        <USkeleton class="aspect-[16/10] w-full" />
        <div class="space-y-3 p-4">
          <USkeleton class="h-5 w-3/4 rounded-xl" />
          <USkeleton class="h-4 w-full rounded-xl" />
          <USkeleton class="h-4 w-2/3 rounded-xl" />
        </div>
      </div>
    </div>

    <section v-else-if="events.length === 0" class="wow-content empty-state-wrap">
      <FoundationEmptyState
        icon="i-ph-calendar-x-fill"
        :title="$t('pages.eventsPage.emptyTitle')"
        :description="$t('pages.eventsPage.emptyDescription')"
      />
    </section>

    <div v-else class="events-grid">
      <EventsEventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
        :busy-state="busyEventId === event.id ? busyAction : null"
        @set-going="setGoing"
        @set-interested="setInterested"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import { normalizeEventTab } from "../../domain/constants/events-options"
import type { EventTabKey } from "../../domain/types/events.types"
import { createApiEventsRepository } from "../../infrastructure/repositories/ApiEventsRepository"
import { useEventsPageVM } from "../../application/view-models/useEventsPageVM"
import EventsEventCard from "../components/EventCard.vue"

const route = useRoute()
const { t } = useI18n()
const repository = createApiEventsRepository()
const activeTabRef = computed<EventTabKey>(() => normalizeEventTab(String(route.query.tab || "browse")))
const { activeTab, pending, events, tabItems, refresh } = useEventsPageVM(activeTabRef, repository)
const toast = useToast()

const busyEventId = ref<number | null>(null)
const busyAction = ref<"going" | "interested" | null>(null)

const tabLink = (tab: EventTabKey) =>
  tab === "browse"
    ? appRoutes.events
    : `${appRoutes.events}?tab=${encodeURIComponent(tab)}`

const updateLocalRsvp = (
  eventId: number,
  action: "going" | "interested",
  nextState: "going" | "interested" | "none",
) => {
  const event = events.value.find(item => item.id === eventId)
  if (!event) return

  if (action === "going") {
    event.isGoing = nextState === "going"
    event.rsvpState = event.isGoing
      ? "going"
      : event.isInterested
        ? "interested"
        : "none"
    event.goingCount = nextState === "going"
      ? Math.max(1, event.goingCount)
      : Math.max(0, event.goingCount - 1)
    return
  }

  event.isInterested = nextState === "interested"
  event.rsvpState = event.isGoing
    ? "going"
    : event.isInterested
      ? "interested"
      : "none"
  event.interestedCount = nextState === "interested"
    ? Math.max(1, event.interestedCount)
    : Math.max(0, event.interestedCount - 1)
}

const runRsvp = async (eventId: number, action: "going" | "interested") => {
  busyEventId.value = eventId
  busyAction.value = action

  try {
    const result = action === "going"
      ? await repository.setGoing(eventId)
      : await repository.setInterested(eventId)

    updateLocalRsvp(eventId, action, result.rsvpState)

    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: events.value.find(item => item.id === eventId)?.name || "Event",
      description: result.rsvpState === "going"
        ? t("pages.eventsPage.rsvpGoing")
        : result.rsvpState === "interested"
          ? t("pages.eventsPage.rsvpInterested")
          : t("pages.eventsPage.rsvpSkipped"),
    })

    await refresh()
  }
  finally {
    busyEventId.value = null
    busyAction.value = null
  }
}

const setGoing = (eventId: number) => runRsvp(eventId, "going")
const setInterested = (eventId: number) => runRsvp(eventId, "interested")
</script>

<style scoped>
.wow-content {
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.wo-page-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 18px 20px;
  color: #111827;
  font-weight: 700;
}

.wo-page-heading--big {
  font-size: 22px;
}

.wo-page-heading__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #111827;
}

.wo-page-menu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 14px 0 18px;
}

.wo-page-menu__scroll {
  min-width: 0;
  overflow-x: auto;
}

.wo-page-menu__items {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 2px;
}

.wo-page-menu__link {
  display: inline-flex;
  align-items: center;
  min-height: 58px;
  border-bottom: 3px solid transparent;
  padding: 0 12px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.wo-page-menu__link:hover,
.wo-page-menu__link--active {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.btn-main {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  border-radius: 3px;
  background: #2563eb;
  padding: 8px 15px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.btn-mat-raised {
  box-shadow: 0 2px 5px rgba(37, 99, 235, 0.28);
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.empty-state-wrap {
  padding: 40px 20px;
  text-align: center;
}

@media (max-width: 760px) {
  .wo-page-menu {
    align-items: stretch;
    flex-direction: column;
    padding: 0 14px 14px;
  }

  .btn-main {
    width: 100%;
  }

  .events-grid {
    grid-template-columns: 1fr;
  }
}
</style>
