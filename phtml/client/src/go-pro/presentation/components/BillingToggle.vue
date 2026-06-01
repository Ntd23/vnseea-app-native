<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-3 shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
    <div class="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <div class="flex items-center gap-3 px-2">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-primary-50 text-primary-700 ring-1 ring-primary-100">
          <Icon name="i-ph-currency-circle-dollar-duotone" class="h-5 w-5" />
        </div>
        <div>
          <p class="text-[11px] font-extrabold uppercase text-slate-500">
            {{ t("pages.goProPage.billingShortTitle") }}
          </p>
          <p class="text-[14px] font-black text-[var(--text-primary)]">
            {{ activeLabel }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-1 rounded-[18px] bg-secondary-50 p-1 ring-1 ring-secondary-100">
        <button
          v-for="item in billingOptions"
          :key="item.value"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-black transition active:scale-95"
          :class="model === item.value
            ? 'bg-white text-primary-700 shadow-[0_8px_18px_rgba(15,35,110,0.08)]'
            : 'text-slate-500 hover:text-[var(--text-primary)]'"
          :aria-pressed="model === item.value"
          type="button"
          @click="model = item.value"
        >
          {{ item.label }}
          <span
            v-if="item.value === 'yearly'"
            class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700"
          >
            {{ t("pages.goProPage.yearlySavingsShort", { percent: yearlySavingsPercent }) }}
          </span>
        </button>
      </div>

      <p class="hidden max-w-[300px] truncate px-2 text-right text-[12px] font-semibold text-slate-500 lg:block">
        {{ statusLabel }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BillingCycle } from "../../domain/types/go-pro.types"

const model = defineModel<BillingCycle>({ default: "yearly" })

withDefaults(defineProps<{
  statusLabel?: string
  yearlySavingsPercent?: number
}>(), {
  statusLabel: "",
  yearlySavingsPercent: 0,
})

const { t } = useI18n()

const billingOptions = computed(() => [
  {
    label: t("pages.goProPage.monthly"),
    value: "monthly",
    description: t("pages.goProPage.billingMonthlyDescription"),
  },
  {
    label: t("pages.goProPage.yearlySavings"),
    value: "yearly",
    description: t("pages.goProPage.billingYearlyDescription"),
  },
])

const activeLabel = computed(() =>
  billingOptions.value.find(item => item.value === model.value)?.label ?? "",
)
</script>
