<template>
  <aside class="space-y-4 xl:sticky xl:top-24">
    <section class="overflow-hidden rounded-[24px] border border-[#dbe3f2] bg-white shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
      <div class="bg-[#0f172a] p-5 text-white">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] font-extrabold uppercase text-white/52">
              {{ t("pages.goProPage.currentPlanShort") }}
            </p>
            <h2 class="mt-2 text-[24px] font-black leading-none">
              {{ subscription.plan }}
            </h2>
          </div>

          <button
            v-if="hasActiveSelection"
            class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-white/18"
            type="button"
            @click="emit('reset')"
          >
            {{ t("pages.goProPage.resetSelection") }}
          </button>
        </div>

        <p class="mt-3 text-[13px] font-semibold text-white/68">
          {{ subscription.renewsAt }}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-px bg-secondary-100">
        <div
          v-for="item in stats"
          :key="item.label"
          class="bg-white p-3"
        >
          <p class="truncate text-[10px] font-extrabold uppercase text-slate-500">
            {{ item.label }}
          </p>
          <p class="mt-1 truncate text-[15px] font-black text-[var(--text-primary)]">
            {{ item.value }}
          </p>
        </div>
      </div>

      <div class="p-4">
        <p class="text-[11px] font-extrabold uppercase text-slate-500">
          {{ t("pages.goProPage.selectionStatusTitle") }}
        </p>
        <p class="mt-1 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-600">
          {{ statusLabel }}
        </p>
      </div>
    </section>

    <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-4 shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] font-extrabold uppercase text-slate-500">
            {{ t("pages.goProPage.perksEyebrow") }}
          </p>
          <h2 class="mt-1 text-[20px] font-black text-[var(--text-primary)]">
            {{ selectedPlan?.name ?? t("pages.goProPage.bestValueBadge") }}
          </h2>
        </div>
        <Icon name="i-ph-sparkle-fill" class="h-6 w-6 text-primary-600" />
      </div>

      <div class="mt-4 space-y-2">
        <div
          v-for="item in perkItems"
          :key="item"
          class="flex gap-2 rounded-[16px] bg-secondary-50 px-3 py-2.5"
        >
          <Icon name="i-ph-check-circle-fill" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p class="line-clamp-2 text-[12px] font-bold leading-5 text-[var(--text-primary)]">
            {{ item }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-4 shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] font-extrabold uppercase text-slate-500">
            {{ t("pages.goProPage.recentPaymentsLabel") }}
          </p>
          <h2 class="mt-1 text-[18px] font-black text-[var(--text-primary)]">
            {{ t("pages.goProPage.transactionCount", { count: payments.length }) }}
          </h2>
        </div>
        <Icon name="i-ph-receipt-duotone" class="h-6 w-6 text-primary-600" />
      </div>

      <div v-if="payments.length > 0" class="mt-4 space-y-2">
        <div
          v-for="item in payments.slice(0, 3)"
          :key="item.id"
          class="rounded-[16px] bg-secondary-50 px-3 py-2.5"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="truncate text-[13px] font-extrabold text-[var(--text-primary)]">
              {{ item.plan }}
            </p>
            <p class="shrink-0 text-[12px] font-black text-[var(--text-primary)]">
              {{ item.amount }}
            </p>
          </div>
          <p class="mt-1 truncate text-[11px] font-semibold text-slate-500">
            {{ item.method }} · {{ item.time }}
          </p>
        </div>
      </div>

      <p v-else class="mt-4 rounded-[16px] bg-secondary-50 px-3 py-3 text-[12px] font-bold leading-5 text-slate-500">
        {{ t("pages.goProPage.emptyPaymentsTitle") }}
      </p>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { ProPlan } from "../../domain/types/go-pro.types"

const props = withDefaults(defineProps<{
  subscription: { plan: string; status: string; renewsAt: string }
  payments: ReadonlyArray<{ id: number; plan: string; amount: string; method: string; time: string }>
  stats: ReadonlyArray<{ label: string; value: string | number }>
  statusLabel: string
  selectedPlan?: ProPlan | null
  hasActiveSelection?: boolean
}>(), {
  selectedPlan: null,
  hasActiveSelection: false,
})

const emit = defineEmits<{
  reset: []
}>()

const { t } = useI18n()

const perkItems = computed(() =>
  props.selectedPlan?.features.slice(0, 3)
  ?? [
      t("pages.goProPage.perksItem1"),
      t("pages.goProPage.perksItem2"),
      t("pages.goProPage.perksItem3"),
    ],
)
</script>
