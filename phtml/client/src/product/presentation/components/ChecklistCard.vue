<template>
  <UCard 
    class="surface-card group ring-1 ring-secondary-200/50 shadow-2xl bg-white transition-all duration-500 hover:shadow-3xl"
    :ui="{ body: { padding: 'p-8 sm:p-10' } }"
  >
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <p class="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-primary)] pl-1">
          {{ $t('pages.productEditor.checklistLabel') }}
        </p>
        <Icon name="i-ph-list-checks-duotone" class="h-6 w-6 text-primary-300" />
      </div>

      <div class="space-y-5">
        <div 
          v-for="item in items" 
          :key="item.label" 
          class="flex items-center gap-4 group/item"
        >
          <div 
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-500"
            :class="item.done 
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' 
              : 'bg-secondary-50 text-secondary-300 ring-1 ring-secondary-100'"
          >
            <Icon :name="item.done ? 'i-ph-check-bold' : 'i-ph-circle-duotone'" class="h-5 w-5" />
          </div>
          <div class="space-y-0.5">
            <span 
              class="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] transition-colors group-hover/item:text-secondary-900"
              :class="{ 'line-through text-secondary-300': item.done }"
            >
              {{ item.label }}
            </span>
            <p v-if="!item.done" class="text-[10px] font-bold text-[var(--text-primary)] opacity-60">
              {{ $t('pages.productEditor.required') }}
            </p>
          </div>
        </div>
      </div>

      <div class="pt-6 border-t border-secondary-50">
        <div class="flex items-center justify-between px-1">
          <p class="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
            {{ $t('pages.productEditor.completionLabel') }}
          </p>
          <p class="text-[14px] font-black text-[var(--text-primary)]">
            {{ Math.round(donePercent) }}%
          </p>
        </div>
        <div class="mt-4 h-2 w-full rounded-full bg-secondary-50 ring-1 ring-secondary-100 overflow-hidden">
          <div 
            class="h-full bg-primary-500 transition-all duration-1000 shadow-[0_0_12px_rgba(var(--color-primary-500-rgb),0.5)]" 
            :style="{ width: `${donePercent}%` }" 
          />
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { ProductChecklistItem } from "../../domain/types/product-editor.types"

const props = withDefaults(defineProps<{
  title?: string
  items: ProductChecklistItem[]
}>(), {
  title: undefined,
})

const donePercent = computed(() => {
  if (!props.items.length) return 0
  const doneCount = props.items.filter(item => item.done).length
  return (doneCount / props.items.length) * 100
})
</script>
