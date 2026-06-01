<!-- Description: Renders the API-backed memory post list and forwards real share interactions for each memory card. -->
<template>
  <div class="space-y-8">
    <div v-if="entries.length === 0" class="surface-card flex flex-col items-center justify-center p-20 text-center space-y-6">
      <div class="flex h-24 w-24 items-center justify-center rounded-[32px] bg-secondary-50 text-secondary-200">
        <Icon name="i-ph-clock-counter-clockwise-duotone" class="h-12 w-12" />
      </div>
      <div class="space-y-2">
        <h3 class="text-xl font-bold text-secondary-900">{{ $t('pages.memoriesPage.emptyTitle') }}</h3>
        <p class="text-sm text-secondary-500 max-w-xs mx-auto">{{ $t('pages.memoriesPage.emptyDescription') }}</p>
      </div>
    </div>

    <MemoriesMemoryCard
      v-for="item in entries"
      :key="item.id"
      :entry="item"
    />
  </div>
</template>

<script setup lang="ts">
import MemoriesMemoryCard from "./MemoryCard.vue"
import type { FeedMemoryRecord } from "../../../feed/domain/types/feed.types"

defineProps<{
  entries: FeedMemoryRecord[]
}>()
</script>
