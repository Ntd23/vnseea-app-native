<template>
  <div class="surface-card p-4 space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm font-black text-[var(--text-primary)] tracking-tight">{{ title }}</p>
      <UButton
        variant="ghost"
        color="primary"
        size="xs"
        class="font-bold -mr-2"
      >
        {{ actionLabel }}
      </UButton>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div v-for="item in items" :key="item" class="aspect-square rounded-2xl transition-transform hover:scale-[1.02] cursor-pointer" :class="tileClass" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  actionLabel: string
  items: number[]
  tileClass: string
}>()
</script>
