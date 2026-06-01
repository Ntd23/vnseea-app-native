<template>
  <div class="surface-card p-4 space-y-4">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-[var(--text-primary)] shadow-sm border border-primary-100">
        <Icon :name="icon" class="h-5 w-5" />
      </div>
      <p class="text-base font-black text-[var(--text-primary)] tracking-tight">{{ title }}</p>
    </div>

    <div class="overflow-hidden rounded-2xl border border-secondary-100 bg-secondary-50/20 divide-y divide-secondary-100/50">
      <div v-for="row in rows" :key="row.label" class="flex items-center gap-4 px-4 py-3.5 group transition-colors hover:bg-white/60">
        <Icon :name="row.icon" class="h-5 w-5 text-[var(--text-primary)] group-hover:text-secondary-900 transition-colors" />
        <span v-if="row.left" class="flex-1 text-sm font-semibold text-[var(--text-primary)]">{{ row.left }}</span>
        <template v-else>
          <span v-if="row.center" class="flex-1 text-center text-sm font-bold text-[var(--text-primary)]">{{ row.center }}</span>
          <span v-if="row.right" :class="[row.rightClass || 'text-[var(--text-primary)]', 'text-sm font-bold']">{{ row.right }}</span>
        </template>
      </div>
    </div>

    <!-- Premium Map Preview Placeholder -->
    <div class="group relative mt-4 overflow-hidden rounded-2xl border border-secondary-200 bg-secondary-100/30 aspect-[4/3] sm:aspect-auto sm:h-[200px]">
      <div class="absolute inset-0 bg-[linear-gradient(135deg,var(--tw-gradient-from),var(--tw-gradient-to))] from-primary-50 to-secondary-100 opacity-60" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:20px_20px]" />
      
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="relative">
          <div class="animate-ping absolute -inset-1 rounded-full bg-primary-400 opacity-30"></div>
          <Icon name="i-ph-map-pin-fill" class="relative h-10 w-10 text-[var(--text-primary)] drop-shadow-lg" />
        </div>
      </div>

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2">
        <UBadge color="white" variant="solid" size="xs" class="rounded-full shadow-sm font-bold px-3 text-[var(--text-primary)] border border-secondary-200">
          Google Maps
        </UBadge>
      </div>

      <div class="absolute left-3 top-3 flex flex-col items-center gap-1.5 p-1 rounded-xl bg-white/80 backdrop-blur-md shadow-lg border border-white/40">
        <UButton color="gray" variant="ghost" icon="i-ph-plus-bold" size="xs" class="rounded-lg h-8 w-8" />
        <div class="w-4 h-px bg-secondary-200" />
        <UButton color="gray" variant="ghost" icon="i-ph-minus-bold" size="xs" class="rounded-lg h-8 w-8" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  rows: Array<{
    label: string
    icon: string
    left?: string
    center?: string
    right?: string
    rightClass?: string
  }>
}>()
</script>
