<!-- Description: Renders an event item close to the WoWonder events-list cover layout. -->
<template>
  <article class="events-list-wrapper">
    <div class="events-list-cover">
      <NuxtLink :to="appRoutes.eventDetail(event.id)" class="event-cover">
        <div class="event-cover__fallback" :style="{ background: event.coverFallback }" />
        <img
          v-if="event.coverUrl && !imageFailed"
          :src="event.coverUrl"
          :alt="event.name"
          class="events-list-cover-img"
          loading="lazy"
          @error="imageFailed = true"
        >
        <span class="event-cover__date">{{ event.dateBadge }}</span>
        <div class="event-cover__location">
          <Icon name="i-ph-map-pin-fill" class="h-5 w-5" />
          <span>{{ event.location }}</span>
        </div>
      </NuxtLink>

      <div class="event-l-info">
        <h3 class="events-list-name">
          <NuxtLink :to="appRoutes.eventDetail(event.id)">
            {{ event.name }}
          </NuxtLink>
        </h3>

        <div class="event-l-btns">
          <button
            class="btn-mat"
            :class="{ 'btn-main': event.isGoing || event.rsvpState === 'going' }"
            type="button"
            :disabled="busyState === 'going'"
            @click="$emit('setGoing', event.id)"
          >
            <Icon v-if="busyState === 'going'" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            <Icon v-else name="i-ph-users-three-fill" class="h-4 w-4" />
            {{ $t("pages.eventsPage.rsvpGoing") }}
          </button>
          <button
            class="btn-mat"
            :class="{ 'btn-main': event.isInterested || event.rsvpState === 'interested' }"
            type="button"
            :disabled="busyState === 'interested'"
            @click="$emit('setInterested', event.id)"
          >
            <Icon v-if="busyState === 'interested'" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            <Icon v-else name="i-ph-heart-fill" class="h-4 w-4" />
            {{ $t("pages.eventsPage.rsvpInterested") }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type { EventRecord } from "../../domain/types/events.types"

const props = defineProps<{
  event: EventRecord
  busyState?: "going" | "interested" | null
}>()

defineEmits<{
  setGoing: [id: number]
  setInterested: [id: number]
}>()

const imageFailed = ref(false)

watch(
  () => props.event.id,
  () => {
    imageFailed.value = false
  },
  { immediate: true },
)
</script>

<style scoped>
.events-list-wrapper {
  min-width: 0;
}

.events-list-cover {
  overflow: hidden;
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.event-cover {
  position: relative;
  display: block;
  height: 260px;
  overflow: hidden;
  background: #eef2f7;
}

.event-cover__fallback,
.events-list-cover-img {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.events-list-cover-img {
  object-fit: cover;
}

.event-cover__date {
  position: absolute;
  right: 14px;
  top: 14px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.94);
  padding: 7px 11px;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.14);
}

.event-cover__location {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 36px 16px 14px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.74));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.event-cover__location span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-l-info {
  padding: 16px 18px 18px;
}

.events-list-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}

.events-list-name a {
  color: #111827;
  text-decoration: none;
}

.events-list-name a:hover {
  color: #2563eb;
}

.event-l-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.btn-mat {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  border: 1px solid #d7dee8;
  border-radius: 3px;
  background: #fff;
  padding: 7px 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-mat:hover {
  border-color: #c5d1df;
  background: #f8fafc;
}

.btn-mat:disabled {
  cursor: wait;
  opacity: 0.75;
}

.btn-main {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

@media (max-width: 640px) {
  .event-cover {
    height: 220px;
  }
}
</style>
