<template>
  <section class="surface-card group p-6 sm:p-8 space-y-8 ring-1 ring-secondary-100 shadow-xl transition-all duration-500">
    <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
      {{ $t("orders.card.orderProgress") }}
    </p>

    <div class="space-y-6">
      <div
        v-for="event in events"
        :key="event.key"
        class="group/event flex items-start gap-4 relative"
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
        <div class="min-w-0 flex-1 surface-card p-5 group-hover/event:ring-primary-100 transition-all duration-300" :class="event.done ? 'bg-primary-50/20 ring-1 ring-primary-50' : 'bg-white ring-1 ring-secondary-100'">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[15px] font-black text-secondary-900 group-hover/event:text-secondary-900 transition-colors">
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
