<template>
  <section :class="[theme.container, 'surface-card group relative overflow-hidden ring-1 ring-secondary-200/50 shadow-2xl transition-all duration-700']">
    <!-- Premium Decorations -->
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_40%)]" />
    <div class="pointer-events-none absolute right-[-10%] top-[-30%] h-[500px] w-[500px] rounded-full bg-white/5 blur-[120px] transition-transform duration-1000 group-hover:scale-110" />
    <div :class="theme.bottomGlow" />

    <div class="relative z-10 flex flex-col gap-12 px-8 py-16 sm:px-12 lg:px-16 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-[780px] space-y-8">
        <div class="space-y-4">
          <p class="pl-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary-200/80">
            {{ badge }}
          </p>
          <h1 class="text-5xl sm:text-7xl font-extrabold leading-none tracking-tight text-white transition-colors group-hover:text-primary-100">
            {{ title }}
          </h1>
          <p class="text-base font-medium leading-relaxed text-white/70 sm:text-lg pl-1 max-w-2xl italic">
            "{{ description }}"
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-4 pt-4">
          <UButton
            :to="appRoutes.myProducts"
            variant="soft"
            size="xl"
            class="h-14 rounded-xl bg-white/10 px-8 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95"
          >
            <template #leading>
              <Icon name="i-ph-arrow-left-duotone" class="h-5 w-5" />
            </template>
            {{ $t("pages.productsPage.backToMyProducts") || "Back" }}
          </UButton>

          <UButton
            size="xl"
            class="h-14 rounded-xl border-none px-10 text-[11px] font-semibold shadow-[0_4px_14px_rgba(0,0,255,0.2)] transition-all active:scale-95"
            :class="theme.secondaryAction"
            @click="$emit('secondaryAction')"
          >
            <template #leading>
              <Icon name="i-ph-sparkle-duotone" class="h-6 w-6" />
            </template>
            {{ secondaryActionLabel }}
          </UButton>
        </div>
      </div>

      <!-- Hero Stats -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:w-[380px]">
        <div
          v-for="item in stats"
          :key="item.label"
          class="group/stat rounded-[18px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl transition-all duration-500 hover:bg-white/10 hover:border-white/10"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/45 transition-colors group-hover/stat:text-primary-300">
            {{ item.label }}
          </p>
          <p class="mt-4 text-3xl font-extrabold leading-none tracking-tight text-white">
            {{ item.value }}
          </p>
          <p class="mt-2 text-[10px] font-bold text-white/40 group-hover/stat:text-white/60 line-clamp-1">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type { ProductHeroStat } from "../../domain/types/product-editor.types"

const props = defineProps<{
  variant: "create" | "edit"
  badge: string
  title: string
  description: string
  stats: ProductHeroStat[]
  secondaryActionLabel: string
}>()

defineEmits<{
  (e: "secondaryAction"): void
}>()

const theme = computed(() => {
  if (props.variant === "edit") {
    return {
      container: "bg-gradient-to-br from-secondary-950 via-primary-900 to-secondary-900",
      bottomGlow: "pointer-events-none absolute bottom-[-22%] left-[-8%] h-[300px] w-[300px] rounded-full bg-primary-400/10 blur-3xl",
      secondaryAction: "bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/40",
    }
  }

  return {
    container: "bg-gradient-to-br from-orange-950 via-amber-900 to-rose-900",
    bottomGlow: "pointer-events-none absolute bottom-[-22%] left-[-8%] h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-3xl",
    secondaryAction: "bg-white text-amber-900 hover:bg-amber-50 shadow-white/20",
  }
})
</script>
