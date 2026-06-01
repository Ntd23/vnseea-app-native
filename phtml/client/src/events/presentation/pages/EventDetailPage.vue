<!-- Description: Renders the backend-backed event detail page with real RSVP counts, attendee lists, and event posts. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <section
      v-if="!pending && !event"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-12 text-center shadow-[var(--shadow-sm)]"
    >
      <FoundationEmptyState
        icon="i-ph-calendar-x-fill"
        :title="$t('pages.eventDetailPage.seoTitle')"
        :description="errorMessage"
      />
    </section>

    <template v-else-if="event">
      <EventsEventDetailHero
        :event="event"
        :rsvp-busy="busyAction"
        @set-going="setGoing"
        @set-interested="setInterested"
      />

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-4">
          <EventsEventDetailMain :event="event" />

          <section class="space-y-4">
            <FeedPublisherBox :event-id="event.id" @created="handlePostCreated" />

            <div
              v-if="posts.length === 0"
              class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-10 text-center shadow-[var(--shadow-sm)]"
            >
              <FoundationEmptyState
                icon="i-ph-newspaper-clipping-fill"
                :title="emptyPostsTitle"
                :description="emptyPostsDescription"
              />
            </div>

            <template v-else>
              <FeedPostCard
                v-for="post in posts"
                :key="post.id"
                :post="post"
              />
            </template>
          </section>
        </div>
        <EventsEventDetailSidebar
          :event="event"
          :going-attendees="goingAttendees"
          :interested-attendees="interestedAttendees"
        />
      </div>
    </template>

    <div v-else class="space-y-4">
      <USkeleton class="h-[360px] w-full rounded-[18px]" />
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <USkeleton class="h-[280px] w-full rounded-[18px]" />
        <USkeleton class="h-[280px] w-full rounded-[18px]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import FeedPublisherBox from "../../../feed/presentation/components/FeedPublisherBox.vue"
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import { useEventDetailPageVM } from "../../application/view-models/useEventDetailPageVM"
import EventsEventDetailHero from "../components/EventDetailHero.vue"
import EventsEventDetailMain from "../components/EventDetailMain.vue"
import EventsEventDetailSidebar from "../components/EventDetailSidebar.vue"

const route = useRoute()
const { locale } = useI18n()
const { event, pending, posts, errorMessage, goingAttendees, interestedAttendees, busyAction, refreshAll, setGoing, setInterested } = useEventDetailPageVM(
  computed(() => String(route.params.id || "")),
)

const handlePostCreated = async () => {
  await refreshAll()
}

const emptyPostsTitle = computed(() =>
  locale.value === "vi"
    ? "Chưa có bài viết nào trong sự kiện này"
    : "No posts in this event yet",
)

const emptyPostsDescription = computed(() =>
  locale.value === "vi"
    ? "Đăng bài mới ở khung phía trên để bài viết được gắn trực tiếp vào sự kiện này."
    : "Publish from the composer above to attach a post directly to this event.",
)
</script>
