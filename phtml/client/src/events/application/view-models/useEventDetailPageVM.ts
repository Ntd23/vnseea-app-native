// English description: Loads a backend-backed event detail record, attendee lists, event posts, and RSVP actions for the event detail page.

import { computed, ref, toValue, type MaybeRefOrGetter } from "vue"
import type { EventRsvpState } from "../../domain/types/events.types"
import { createApiEventsRepository } from "../../infrastructure/repositories/ApiEventsRepository"

export function useEventDetailPageVM(
  idSource: MaybeRefOrGetter<string | number>,
  repository = createApiEventsRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()
  const eventId = computed(() => String(toValue(idSource)))

  const { data, status, error, refresh } = useAsyncData(
    () => `events:detail:${eventId.value}`,
    () => repository.getEventById(eventId.value),
    {
      watch: [eventId],
      default: () => null,
    },
  )

  const { data: goingData, status: goingStatus, refresh: refreshGoing } = useAsyncData(
    () => `events:detail:${eventId.value}:going`,
    () => repository.getAttendees(eventId.value, "going"),
    {
      watch: [eventId],
      default: () => [],
    },
  )

  const { data: interestedData, status: interestedStatus, refresh: refreshInterested } = useAsyncData(
    () => `events:detail:${eventId.value}:interested`,
    () => repository.getAttendees(eventId.value, "interested"),
    {
      watch: [eventId],
      default: () => [],
    },
  )

  const { data: postsData, status: postsStatus, refresh: refreshPosts } = useAsyncData(
    () => `events:detail:${eventId.value}:posts`,
    () => repository.getPosts(eventId.value, { limit: 10 }),
    {
      watch: [eventId],
      default: () => ({
        posts: [],
        hasMore: false,
        nextOffset: null,
      }),
    },
  )

  const rsvpBusy = ref(false)
  const busyAction = ref<"going" | "interested" | null>(null)

  const pending = computed(() =>
    status.value === "pending"
    || goingStatus.value === "pending"
    || interestedStatus.value === "pending"
    || postsStatus.value === "pending"
  )

  const event = computed(() => {
    if (!data.value) {
      return null
    }

    return {
      ...data.value,
      goingCount: Math.max(data.value.goingCount, goingData.value?.length ?? 0),
      interestedCount: Math.max(data.value.interestedCount, interestedData.value?.length ?? 0),
    }
  })
  const posts = computed(() => postsData.value.posts ?? [])
  const hasPosts = computed(() => posts.value.length > 0)
  const goingAttendees = computed(() => goingData.value ?? [])
  const interestedAttendees = computed(() => interestedData.value ?? [])
  const errorMessage = computed(() =>
    error.value instanceof Error
      ? error.value.message
      : t("pages.eventDetailPage.seoDescription"),
  )

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshGoing(), refreshInterested(), refreshPosts()])
  }

  const applyRsvp = async (state: EventRsvpState) => {
    if (!data.value || rsvpBusy.value) return

    rsvpBusy.value = true
    busyAction.value = state === "interested" ? "interested" : "going"

    try {
      const result = state === "going"
        ? await repository.setGoing(data.value.id)
        : await repository.setInterested(data.value.id)

      if (!data.value) return

      const nextState = result.rsvpState

      if (state === "going") {
        data.value.isGoing = nextState === "going"
        data.value.rsvpState = data.value.isGoing
          ? "going"
          : data.value.isInterested
            ? "interested"
            : "none"
        data.value.goingCount = nextState === "going"
          ? Math.max(1, data.value.goingCount)
          : Math.max(0, data.value.goingCount - 1)
      }
      else {
        data.value.isInterested = nextState === "interested"
        data.value.rsvpState = data.value.isGoing
          ? "going"
          : data.value.isInterested
            ? "interested"
            : "none"
        data.value.interestedCount = nextState === "interested"
          ? Math.max(1, data.value.interestedCount)
          : Math.max(0, data.value.interestedCount - 1)
      }

      await Promise.all([refreshGoing(), refreshInterested()])

      toast.add({
        color: "success",
        icon: "i-ph-check-circle-fill",
        title: data.value.name,
        description: nextState === "going"
          ? t("pages.eventsPage.rsvpGoing")
          : nextState === "interested"
            ? t("pages.eventsPage.rsvpInterested")
            : t("pages.eventsPage.rsvpSkipped"),
      })
    }
    finally {
      rsvpBusy.value = false
      busyAction.value = null
    }
  }

  return {
    eventId,
    event,
    pending,
    posts,
    hasPosts,
    errorMessage,
    goingAttendees,
    interestedAttendees,
    refreshAll,
    rsvpBusy,
    busyAction,
    setGoing: () => applyRsvp("going"),
    setInterested: () => applyRsvp("interested"),
  }
}
