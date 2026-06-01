<!-- Description: Renders WoWonder-style event side information and capped attendee lists. -->
<template>
  <aside class="space-y-4">
    <section class="wow-content event-options-list">
      <div class="event-two-blocks">
        <div>
          <Icon name="i-ph-calendar-fill" class="h-6 w-6 text-[#4CAF50]" />
          <p>
            <span>{{ $t("pages.createEventPage.startDate") }}</span>
            <strong>{{ event.startDateLabel }} - {{ event.startTime }}</strong>
          </p>
        </div>
        <div>
          <Icon name="i-ph-calendar-check-fill" class="h-6 w-6 text-[#e91e63]" />
          <p>
            <span>{{ $t("pages.createEventPage.endDate") }}</span>
            <strong>{{ event.endDateLabel }} - {{ event.endTime }}</strong>
          </p>
        </div>
      </div>
    </section>

    <section class="wow-content event-options-list right-user-info">
      <div class="wo-page-heading">
        <span><Icon name="i-ph-info-fill" class="h-4 w-4" /></span>
        {{ $t("pages.eventDetailPage.locationEyebrow") }}
      </div>
      <ul class="list-unstyled">
        <li>
          <Icon name="i-ph-users-three-fill" class="h-5 w-5" />
          {{ event.goingCount }} {{ $t("pages.eventsPage.rsvpGoing") }}
        </li>
        <li>
          <Icon name="i-ph-heart-fill" class="h-5 w-5" />
          {{ event.interestedCount }} {{ $t("pages.eventsPage.rsvpInterested") }}
        </li>
        <li v-if="event.location">
          <Icon name="i-ph-map-pin-fill" class="h-5 w-5" />
          {{ event.location }}
        </li>
      </ul>
    </section>

    <section class="wow-content event-options-list">
      <div class="wo-page-heading">
        <span><Icon name="i-ph-users-three-fill" class="h-4 w-4" /></span>
        {{ $t("pages.eventsPage.rsvpGoing") }}
      </div>
      <div v-if="goingAttendees.length > 0" class="users-list">
        <div v-for="attendee in visibleGoingAttendees" :key="`going-${attendee.id}`" class="user-row">
          <img v-if="attendee.avatarUrl" :src="attendee.avatarUrl" :alt="attendee.name">
          <div v-else class="avatar-sm avatar-muted">EV</div>
          <div class="min-w-0">
            <p>{{ attendee.name }}</p>
            <span>{{ attendee.username ? `@${attendee.username}` : "" }}</span>
          </div>
        </div>
        <button
          v-if="goingAttendees.length > attendeePreviewLimit"
          class="view-more-btn"
          type="button"
          @click="showAllGoing = !showAllGoing"
        >
          {{ showAllGoing ? collapseText : viewMoreText(goingAttendees.length - attendeePreviewLimit) }}
        </button>
      </div>
      <p v-else class="empty-small">{{ emptyGoingText }}</p>
    </section>

    <section class="wow-content event-options-list">
      <div class="wo-page-heading">
        <span><Icon name="i-ph-heart-fill" class="h-4 w-4" /></span>
        {{ $t("pages.eventsPage.rsvpInterested") }}
      </div>
      <div v-if="interestedAttendees.length > 0" class="users-list">
        <div v-for="attendee in visibleInterestedAttendees" :key="`interested-${attendee.id}`" class="user-row">
          <img v-if="attendee.avatarUrl" :src="attendee.avatarUrl" :alt="attendee.name">
          <div v-else class="avatar-sm avatar-muted">EV</div>
          <div class="min-w-0">
            <p>{{ attendee.name }}</p>
            <span>{{ attendee.username ? `@${attendee.username}` : "" }}</span>
          </div>
        </div>
        <button
          v-if="interestedAttendees.length > attendeePreviewLimit"
          class="view-more-btn"
          type="button"
          @click="showAllInterested = !showAllInterested"
        >
          {{ showAllInterested ? collapseText : viewMoreText(interestedAttendees.length - attendeePreviewLimit) }}
        </button>
      </div>
      <p v-else class="empty-small">{{ emptyInterestedText }}</p>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { EventAttendeeRecord, EventRecord } from "../../domain/types/events.types"

const props = defineProps<{
  event: EventRecord
  goingAttendees: EventAttendeeRecord[]
  interestedAttendees: EventAttendeeRecord[]
}>()

const { locale } = useI18n()
const attendeePreviewLimit = 5
const showAllGoing = ref(false)
const showAllInterested = ref(false)

const visibleGoingAttendees = computed(() =>
  showAllGoing.value
    ? props.goingAttendees
    : props.goingAttendees.slice(0, attendeePreviewLimit),
)

const visibleInterestedAttendees = computed(() =>
  showAllInterested.value
    ? props.interestedAttendees
    : props.interestedAttendees.slice(0, attendeePreviewLimit),
)

const viewMoreText = (count: number) =>
  locale.value === "vi"
    ? `Xem thêm ${count} người`
    : `View ${count} more`

const collapseText = computed(() =>
  locale.value === "vi" ? "Thu gọn" : "Show less",
)

const emptyGoingText = computed(() =>
  locale.value === "vi"
    ? "Chưa có người xác nhận tham gia."
    : "No confirmed attendees yet.",
)

const emptyInterestedText = computed(() =>
  locale.value === "vi"
    ? "Chưa có người bày tỏ quan tâm."
    : "No interested attendees yet.",
)
</script>

<style scoped>
.wow-content {
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.event-options-list {
  overflow: hidden;
}

.event-two-blocks {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0;
}

.event-two-blocks > div {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: 12px;
  border-right: 1px solid #eef2f7;
  border-bottom: 0;
  padding: 13px 16px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.event-two-blocks > div:last-child {
  border-right: 0;
}

.event-two-blocks p {
  min-width: 0;
  margin: 0;
}

.event-two-blocks span {
  display: block;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.event-two-blocks strong {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-two-blocks svg {
  flex: 0 0 auto;
}

.wo-page-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid #eef2f7;
  padding: 14px 16px;
  color: #111827;
  font-size: 14px;
  font-weight: 800;
}

.wo-page-heading span {
  display: inline-flex;
}

.list-unstyled {
  margin: 0;
  padding: 4px 0;
  list-style: none;
}

.list-unstyled li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.users-list {
  padding: 8px 0;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
}

.user-row img,
.avatar-sm {
  height: 36px;
  width: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.user-row p {
  margin: 0;
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-row span {
  color: #64748b;
  font-size: 12px;
}

.view-more-btn {
  width: calc(100% - 32px);
  margin: 4px 16px 10px;
  border: 0;
  border-top: 1px solid #eef2f7;
  background: transparent;
  padding: 10px 0 0;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.empty-small {
  margin: 0;
  padding: 16px;
  color: #64748b;
  font-size: 14px;
}

@media (max-width: 520px) {
  .event-two-blocks {
    flex-direction: column;
  }

  .event-two-blocks > div {
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
  }

  .event-two-blocks > div:last-child {
    border-bottom: 0;
  }
}
</style>
