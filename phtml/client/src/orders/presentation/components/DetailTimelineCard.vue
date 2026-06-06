<!-- English description: Buyer order detail timeline card with responsive progress events. -->
<template>
  <section class="surface-card group min-w-0 space-y-6 p-4 ring-1 ring-secondary-100 shadow-xl transition-all duration-500 sm:space-y-8 sm:p-6 lg:p-8">
    <p class="pl-1 text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-900">
      {{ $t("orders.card.orderProgress") }}
    </p>

    <div class="space-y-6">
      <div
        v-for="event in events"
        :key="event.key"
        class="group/event relative flex min-w-0 items-start gap-3 sm:gap-4"
      >
        <!-- Timeline Link Line -->
        <div 
          v-if="events.indexOf(event) !== events.length - 1"
          class="absolute left-4 top-8 bottom-0 w-px bg-secondary-100 group-hover/event:bg-primary-100 transition-colors"
          :class="{ 'bg-primary-500/30': event.done }"
        />

        <!-- Marker -->
        <div
          class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-500"
          :class="event.done ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 ring-1 ring-primary-500' : 'bg-secondary-50 text-secondary-300 ring-1 ring-secondary-100 group-hover/event:bg-secondary-100'"
        >
          <Icon :name="event.done ? 'i-ph-check-bold' : 'i-ph-clock-duotone'" class="h-4 w-4" />
        </div>

        <!-- Content Card -->
        <div class="surface-card min-w-0 flex-1 p-4 transition-all duration-300 group-hover/event:ring-primary-100 sm:p-5" :class="event.done ? 'bg-primary-50/20 ring-1 ring-primary-50' : 'bg-white ring-1 ring-secondary-100'">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="break-words text-sm font-extrabold text-secondary-900 transition-colors group-hover/event:text-secondary-900 sm:text-[15px]">
              {{ $t(event.label) }}
            </p>
            <UBadge v-if="event.time" variant="soft" color="white" class="rounded-lg bg-white/50 ring-1 ring-secondary-100 font-black text-[10px] px-2.5 py-1 text-secondary-400">
              {{ $t(event.time) }}
            </UBadge>
          </div>

          <p class="mt-3 text-xs font-medium leading-relaxed text-secondary-500">
            {{ $t(event.description) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OrderTimelineEntry } from "../../domain/types/orders.types"

defineProps<{
  events: OrderTimelineEntry[]
}>()
</script>
