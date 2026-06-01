<template>
  <section class="surface-card group p-6 sm:p-8 space-y-8 ring-1 ring-secondary-100 shadow-xl transition-all duration-500">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-secondary-50 pb-6">
      <div class="space-y-1">
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-900 pl-1">
          {{ $t("orders.detail.operating") }}
        </p>
        <h3 class="text-2xl font-black tracking-tight text-secondary-900 leading-tight">
          {{ $t("orders.detail.checklist") }}
        </h3>
      </div>

      <UBadge
        variant="soft"
        class="rounded-lg font-black text-[10px] uppercase tracking-widest px-3 py-1.5 ring-1 ring-inset"
        :class="statusMeta.badgeClass"
      >
        <template #leading>
          <Icon :name="statusMeta.icon.includes('duotone') ? statusMeta.icon : statusMeta.icon.replace('-fill', '-duotone')" class="h-3.5 w-3.5 mr-1" />
        </template>
        {{ $t(statusMeta.label) }}
      </UBadge>
    </div>

    <div
      v-if="order.status === 'cancelled'"
      class="surface-card p-5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black uppercase tracking-widest leading-relaxed text-center"
    >
      <Icon name="i-ph-warning-duotone" class="h-4 w-4 mr-2" />
      {{ $t("orders.detail.cancelledWarning") }}
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <UButton
        variant="soft"
        color="white"
        class="surface-card block p-6 text-left transition-all duration-300 group/stage active:scale-[0.98] ring-1"
        :class="shippingStageClass"
      >
        <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
          {{ $t("orders.detail.shippedLabel") }}
        </p>
        <p class="mt-2 text-base font-black tracking-tight">
          {{ $t("orders.detail.shippedTitle") }}
        </p>
        <p class="mt-2 text-[11px] font-medium leading-relaxed opacity-80">
          {{ $t("orders.detail.shippedDesc") }}
        </p>
      </UButton>

      <UButton
        variant="soft"
        color="white"
        class="surface-card block p-6 text-left transition-all duration-300 group/stage active:scale-[0.98] ring-1"
        :class="completedStageClass"
      >
        <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
          {{ $t("orders.detail.completedLabel") }}
        </p>
        <p class="mt-2 text-base font-black tracking-tight">
          {{ $t("orders.detail.completedTitle") }}
        </p>
        <p class="mt-2 text-[11px] font-medium leading-relaxed opacity-80">
          {{ $t("orders.detail.completedDesc") }}
        </p>
      </UButton>
    </div>

    <div class="space-y-4">
      <div
        v-for="task in order.tasks"
        :key="task.key"
        class="surface-card p-5 ring-1 transition-all duration-300 group/task"
        :class="task.done ? 'bg-primary-50/20 ring-primary-50' : 'bg-white ring-secondary-100'"
      >
        <div class="flex items-start gap-4">
          <div
            class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500"
            :class="task.done ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 ring-1 ring-primary-500' : 'bg-secondary-50 text-secondary-300 ring-1 ring-secondary-100 group-hover/task:bg-secondary-100'"
          >
            <Icon :name="task.done ? 'i-ph-check-bold' : 'i-ph-hourglass-duotone'" class="h-5 w-5" />
          </div>

          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-sm font-black text-secondary-900 group-hover/task:text-secondary-900 transition-colors">
                {{ $t(task.label) }}
              </p>
              <UBadge
                variant="soft"
                class="rounded-lg font-black text-[9px] uppercase tracking-widest px-2.5 py-1 ring-1 ring-inset"
                :class="task.done ? 'bg-primary-50 text-primary-600 ring-primary-100' : 'bg-secondary-50 text-secondary-400 ring-secondary-100'"
              >
                {{ $t(task.done ? 'orders.detail.taskStatus.done' : 'orders.detail.taskStatus.pending') }}
              </UBadge>
            </div>
            <p class="text-xs font-medium leading-relaxed text-secondary-500">
              {{ $t(task.description) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useOrderPresentation } from "../../application/composables/useOrderPresentation"
import type { SellerOrder } from "../../domain/types/orders.types"

const props = defineProps<{
  order: SellerOrder
}>()

const { statusMeta } = useOrderPresentation(computed(() => props.order))

const shippingStageClass = computed(() => {
  if (props.order.status === "shipping" || props.order.status === "delivered") {
    return "ring-primary-100 bg-primary-50/50 text-secondary-900"
  }

  return "ring-secondary-100 bg-white text-secondary-400 hover:ring-primary-100 hover:text-secondary-900"
})

const completedStageClass = computed(() => {
  if (props.order.status === "delivered") {
    return "ring-sky-100 bg-sky-50/50 text-sky-700"
  }

  return "ring-secondary-100 bg-white text-secondary-400 hover:ring-primary-100 hover:text-secondary-900"
})
</script>
