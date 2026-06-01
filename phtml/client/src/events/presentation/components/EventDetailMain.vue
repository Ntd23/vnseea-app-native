<!-- Description: Renders the primary event description for the backend-backed event detail page. -->
<template>
  <section class="space-y-4">
    <UCard class="rounded-[3px] border-0 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]" :ui="{ body: 'p-5' }">
      <div class="space-y-2">
        <p class="text-label-secondary">{{ $t("pages.eventDetailPage.infoEyebrow") }}</p>
        <h2 class="text-heading text-[var(--text-primary)]">{{ $t("pages.eventDetailPage.infoTitle") }}</h2>
        <p class="text-body-primary whitespace-pre-line">{{ event.description }}</p>
      </div>
    </UCard>

  </section>
</template>

<script setup lang="ts">
import type { EventRecord } from "../../domain/types/events.types"

defineProps<{
  event: EventRecord
}>()
</script>
