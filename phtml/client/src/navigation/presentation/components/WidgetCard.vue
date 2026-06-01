<template>
  <div class="surface-card group space-y-5 border border-[rgba(0,0,255,0.04)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-150 sm:p-6">
    <div class="flex items-center justify-between border-b border-secondary-50 pb-4">
      <h3 class="pl-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{{ title }}</h3>
      <UBadge
        variant="soft"
        class="rounded-lg bg-primary-50 px-2.5 py-1 text-[10px] font-semibold text-primary-600 ring-1 ring-inset ring-primary-100"
      >
        {{ $t("navigation.widgetCard.mockBadge") }}
      </UBadge>
    </div>

    <div class="space-y-3">
      <div 
        v-for="item in items" 
        :key="item.title" 
        class="rounded-2xl border border-secondary-100 bg-secondary-50/30 p-4 shadow-sm transition-all duration-150 group-hover:bg-white hover:border-primary-100"
      >
        <p class="text-[13px] font-semibold text-slate-800 transition-colors group-hover:text-slate-900">{{ item.title }}</p>
        <p class="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">{{ item.subtitle }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  items: { title: string; subtitle: string }[]
}>()
</script>
