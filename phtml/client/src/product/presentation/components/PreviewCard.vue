<template>
  <UCard 
    class="surface-card group overflow-hidden ring-1 ring-secondary-100 hover:ring-primary-400/50 transition-all duration-500 hover:shadow-[0_48px_80px_-32px_rgba(0,0,0,0.15)] hover:-translate-y-3 bg-white" 
    :ui="{ body: { padding: 'p-0' }, base: 'overflow-hidden' }"
  >
    <!-- Media Preview Layer -->
    <div class="relative h-[280px] overflow-hidden">
      <!-- Background Decorations -->
      <div class="absolute inset-0 transition-transform duration-1000 group-hover:scale-110" :style="{ background: previewBackground }" />
      <div class="absolute inset-0 bg-gradient-to-t from-secondary-950/80 via-transparent to-transparent opacity-60" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
      
      <!-- Duotone Icon Deco -->
      <div class="absolute right-[-10%] top-8 h-48 w-48 text-white/5 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12 group-hover:text-white/10 pointer-events-none">
        <Icon :name="previewIcon + '-duotone'" class="h-full w-full" />
      </div>

      <!-- Badges -->
      <div class="absolute left-6 top-6 flex flex-wrap gap-3">
        <div class="rounded-xl border border-white/10 bg-secondary-950/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-white shadow-xl backdrop-blur-xl">
          {{ categoryLabel }}
        </div>
        <div class="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-white shadow-xl backdrop-blur-xl transition-colors group-hover:bg-primary-500/30">
          {{ conditionLabel }}
        </div>
      </div>

      <!-- Location Info -->
      <div class="absolute bottom-6 left-6 flex items-center gap-3">
        <div class="flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white shadow-xl backdrop-blur-xl">
          <Icon name="i-ph-map-pin-duotone" class="h-4 w-4 text-sky-400" />
          {{ location || locationPlaceholder || $t("pages.productEditor.previewLocationPlaceholder") }}
        </div>
        <div class="rounded-xl border border-white/20 bg-white/20 px-4 py-2.5 text-[10px] font-semibold text-white shadow-xl backdrop-blur-xl">
          {{ $t("pages.productEditor.imageCount", { count: imageCount }) }}
        </div>
      </div>
    </div>

    <!-- Content Details Layer -->
    <div class="relative p-8 space-y-6">
      <!-- Preview Action Icons (Mock) -->
      <div class="absolute -top-10 right-8 flex items-center gap-4">
        <div class="h-14 w-14 flex items-center justify-center rounded-2xl bg-white text-[var(--text-primary)] shadow-2xl ring-1 ring-secondary-100 transition-all hover:bg-primary-50 hover:text-primary-600 active:scale-90 border-none">
          <Icon :name="leadingIcon + '-duotone'" class="h-7 w-7" />
        </div>
        <div class="h-14 w-14 flex items-center justify-center rounded-2xl bg-primary-600 text-white shadow-2xl shadow-primary-500/40 active:scale-90 transition-all border-none">
          <Icon :name="trailingIcon + '-duotone'" class="h-8 w-8" />
        </div>
      </div>

      <div class="space-y-2">
        <p class="pl-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 transition-colors group-hover:text-secondary-900">
          {{ currencyLabel }}
        </p>
        <h3 class="pr-20 text-2xl font-extrabold leading-tight tracking-tight text-secondary-950 transition-colors line-clamp-1 group-hover:text-primary-950">
          {{ title || emptyTitle }}
        </h3>
      </div>

      <p class="text-sm font-medium leading-relaxed text-[var(--text-primary)] line-clamp-2 min-h-[2.5rem] italic pr-4">
        "{{ description }}"
      </p>

      <div class="flex items-center justify-between gap-4 pt-6 border-t border-secondary-50 transition-colors group-hover:border-primary-100">
        <div class="space-y-1">
          <p class="pl-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] leading-none text-slate-400">{{ $t("pages.productEditor.priceLabel") }}</p>
          <p class="pt-1 text-2xl font-extrabold leading-none tracking-tight text-sky-600">
            {{ price }}
          </p>
        </div>

        <div class="flex flex-col items-end gap-2 text-right">
          <div class="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-700 ring-1 ring-sky-100 shadow-sm">
            <Icon name="i-ph-check-circle-duotone" class="h-4 w-4" />
            {{ statusLabel }}
          </div>
          <p class="pr-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            {{ stockLabel }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  previewBackground: string
  previewIcon: string
  categoryLabel: string
  conditionLabel: string
  currencyLabel: string
  title: string
  emptyTitle: string
  description: string
  price: string
  stockLabel: string
  location: string
  imageCount: number
  leadingIcon: string
  trailingIcon: string
  statusLabel: string
  locationPlaceholder?: string
}>(), {
  locationPlaceholder: undefined,
})
</script>
