<!-- Description: Renders the WoWonder-style event profile cover header. -->
<template>
  <section class="wo-event-profile">
    <div class="profile-container">
      <div class="card hovercard">
        <div class="cardheader user-cover">
          <div class="cover-fallback" :style="{ background: event.coverFallback }" />
          <img
            v-if="event.coverUrl && !imageFailed"
            id="cover-image"
            :src="event.coverUrl"
            :alt="`${event.name} Cover Image`"
            @error="imageFailed = true"
          >
          <div class="event-info-cont-small">
            <div class="info">
              <span class="short-start-dt">
                <b>{{ startDay }}</b>
                <p>{{ startMonth }}</p>
              </span>
              <h3>{{ event.name }}</h3>
            </div>
          </div>
        </div>

        <div class="event-info-cont">
          <ul class="event-cdown">
            <li><span>{{ countdown.days }}</span>days</li>
            <li><span>{{ countdown.hours }}</span>Hours</li>
            <li><span>{{ countdown.minutes }}</span>Minutes</li>
            <li><span>{{ countdown.seconds }}</span>Seconds</li>
          </ul>

          <div class="wow-event-page-btns">
            <button
              class="btn btn-default btn-mat"
              :class="{ 'btn-main': event.isGoing || event.rsvpState === 'going' }"
              type="button"
              :disabled="rsvpBusy === 'going'"
              @click="$emit('setGoing')"
            >
              <Icon v-if="rsvpBusy === 'going'" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
              <Icon v-else name="i-ph-users-three-fill" class="h-4 w-4" />
              {{ $t("pages.eventsPage.rsvpGoing") }}
            </button>
            <button
              class="btn btn-default btn-mat"
              :class="{ 'btn-main': event.isInterested || event.rsvpState === 'interested' }"
              type="button"
              :disabled="rsvpBusy === 'interested'"
              @click="$emit('setInterested')"
            >
              <Icon v-if="rsvpBusy === 'interested'" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
              <Icon v-else name="i-ph-heart-fill" class="h-4 w-4" />
              {{ $t("pages.eventsPage.rsvpInterested") }}
            </button>
            <NuxtLink :to="appRoutes.events" class="btn btn-default btn-mat">
              {{ $t("pages.createEventPage.backToEvents") }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type { EventRecord } from "../../domain/types/events.types"

const props = defineProps<{
  event: EventRecord
  rsvpBusy?: "going" | "interested" | null
}>()

defineEmits<{
  setGoing: []
  setInterested: []
}>()

const imageFailed = ref(false)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const parseTimeParts = (value: string) => {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":")

  return {
    hours: Number(hours) || 0,
    minutes: Number(minutes) || 0,
    seconds: Number(seconds) || 0,
  }
}

const normalizeYear = (value: string) => {
  if (value.length === 4) {
    return Number(value)
  }

  const year = Number(value)
  return year >= 70 ? 1900 + year : 2000 + year
}

const parseEventDate = (dateValue: string, timeValue: string) => {
  const date = dateValue.trim()
  const time = timeValue.trim() || "00:00:00"
  const timeParts = parseTimeParts(time)
  const parts = date.split(/[-/]/).map(part => part.trim()).filter(Boolean)

  if (parts.length === 3) {
    const [first, second, third] = parts
    let parsedDate: Date

    if (first.length === 4) {
      parsedDate = new Date(
        Number(first),
        Number(second) - 1,
        Number(third),
        timeParts.hours,
        timeParts.minutes,
        timeParts.seconds,
      )
    }
    else if (third.length === 4 || Number(first) > 12) {
      parsedDate = new Date(
        normalizeYear(third),
        Number(second) - 1,
        Number(first),
        timeParts.hours,
        timeParts.minutes,
        timeParts.seconds,
      )
    }
    else {
      parsedDate = new Date(
        normalizeYear(first),
        Number(second) - 1,
        Number(third),
        timeParts.hours,
        timeParts.minutes,
        timeParts.seconds,
      )
    }

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const parsed = new Date(`${date} ${time}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const startDate = computed(() =>
  parseEventDate(props.event.startDateValue || props.event.startDateLabel, props.event.startTime),
)

const endDate = computed(() =>
  parseEventDate(props.event.endDateValue || props.event.endDateLabel, props.event.endTime),
)

const countdownTarget = computed(() => {
  if (startDate.value && startDate.value.getTime() > now.value) {
    return startDate.value
  }

  if (endDate.value && endDate.value.getTime() > now.value) {
    return endDate.value
  }

  return null
})

const startDay = computed(() => {
  const date = startDate.value
  return date ? String(date.getDate()).padStart(2, "0") : props.event.dateBadge.slice(0, 2)
})

const startMonth = computed(() => {
  const date = startDate.value
  return date
    ? date.toLocaleString("en", { month: "short" })
    : props.event.dateBadge.slice(3, 5)
})

const countdown = computed(() => {
  const date = countdownTarget.value
  const distance = date ? Math.max(0, date.getTime() - now.value) : 0
  const days = Math.floor(distance / 86400000)
  const hours = Math.floor((distance % 86400000) / 3600000)
  const minutes = Math.floor((distance % 3600000) / 60000)
  const seconds = Math.floor((distance % 60000) / 1000)

  return { days, hours, minutes, seconds }
})

watch(
  () => props.event.id,
  () => {
    imageFailed.value = false
  },
  { immediate: true },
)

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.wo-event-profile {
  margin-top: 0;
}

.profile-container,
.card,
.hovercard {
  min-width: 0;
}

.hovercard {
  overflow: hidden;
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.cardheader {
  position: relative;
  height: 360px;
  overflow: hidden;
  background: #eef2f7;
}

.cover-fallback,
#cover-image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

#cover-image {
  object-fit: cover;
}

.event-info-cont-small {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 60px 28px 22px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.76));
  color: #fff;
}

.info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.short-start-dt {
  display: flex;
  width: 58px;
  min-width: 58px;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  border-radius: 3px;
  background: #fff;
  color: #111827;
  text-align: center;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
}

.short-start-dt b {
  padding-top: 8px;
  font-size: 24px;
  line-height: 1;
}

.short-start-dt p {
  width: 100%;
  margin: 7px 0 0;
  background: #2563eb;
  padding: 4px 0 5px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.info h3 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.25;
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.3);
}

.event-info-cont {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid #e5e7eb;
  padding: 14px 18px;
}

.event-cdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.event-cdown li {
  min-width: 72px;
  border-radius: 3px;
  background: #f8fafc;
  padding: 7px 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.event-cdown span {
  display: block;
  color: #111827;
  font-size: 18px;
  line-height: 1.1;
}

.wow-event-page-btns {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.btn-mat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  border: 1px solid #d7dee8;
  border-radius: 3px;
  background: #fff;
  padding: 8px 13px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.btn-main {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

@media (max-width: 760px) {
  .cardheader {
    height: 280px;
  }

  .event-info-cont {
    align-items: stretch;
    flex-direction: column;
  }

  .wow-event-page-btns {
    justify-content: flex-start;
  }
}
</style>
