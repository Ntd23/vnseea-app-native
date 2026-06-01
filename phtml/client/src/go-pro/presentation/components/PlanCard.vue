<template>
  <article>
    <UCard
      class="relative flex h-full flex-col overflow-hidden rounded-[18px] border bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(37,99,235,0.12)]"
      :class="cardClass"
      :ui="{ body: 'p-5' }"
    >
      <div class="pointer-events-none absolute inset-x-0 top-0 h-1" :class="selected ? 'bg-emerald-500' : plan.highlight ? 'bg-primary-600' : 'bg-secondary-100'" />

      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex h-7 items-center rounded-full bg-primary-50 px-3 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100">
              {{ plan.badge }}
            </span>
            <span
              v-if="selected"
              class="inline-flex h-7 items-center rounded-full bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100"
            >
              {{ t("pages.goProPage.selectedPlan") }}
            </span>
            <span
              v-else-if="plan.highlight"
              class="inline-flex h-7 items-center rounded-full bg-amber-50 px-3 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100"
            >
              {{ t("pages.goProPage.bestValueBadge") }}
            </span>
          </div>

          <h3 class="text-[26px] font-extrabold leading-none text-[var(--text-primary)]">
            {{ plan.name }}
          </h3>
        </div>

        <div
          class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px]"
          :class="selected ? 'bg-emerald-50 text-emerald-700' : plan.highlight ? 'bg-primary-600 text-white' : 'bg-secondary-50 text-[var(--text-primary)]'"
        >
          <Icon :name="planIcon" class="h-6 w-6" />
        </div>
      </div>

      <div class="mt-6 rounded-[20px] border border-[#dbe3f2] bg-secondary-50/50 p-4">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p class="break-words text-[30px] font-extrabold leading-none text-[var(--text-primary)]">
              {{ formatProCurrency(price, locale) }}
            </p>
            <p class="mt-1 text-[12px] font-bold text-slate-500">
              {{ billingCycle === "monthly" ? t("pages.goProPage.billedMonthly") : t("pages.goProPage.billedYearly") }}
            </p>
          </div>

          <span
            v-if="billingCycle === 'yearly' && savingsPercent > 0"
            class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700"
          >
            {{ t("pages.goProPage.savePercent", { percent: savingsPercent }) }}
          </span>
        </div>

        <p v-if="billingCycle === 'yearly'" class="mt-3 text-[12px] font-semibold text-slate-500">
          {{ t("pages.goProPage.perMonthEquivalent", { amount: formatProCurrency(monthlyEquivalent, locale) }) }}
        </p>
      </div>

      <ul class="mt-5 grid gap-2.5">
        <li
          v-for="feature in visibleFeatures"
          :key="feature"
          class="flex gap-2 text-[13px] font-semibold leading-5 text-[var(--text-primary)]"
        >
          <Icon name="i-ph-check-circle-fill" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {{ feature }}
        </li>
      </ul>

      <div class="mt-5 grid gap-2">
        <div
          v-for="item in visibleLimits"
          :key="item.label"
          class="flex items-center justify-between gap-3 rounded-[16px] bg-secondary-50 px-3 py-2"
        >
          <span class="truncate text-[12px] font-medium text-slate-500">{{ item.label }}</span>
          <span class="shrink-0 text-[12px] font-semibold text-[var(--text-primary)]">{{ item.value }}</span>
        </div>
      </div>

      <button
        type="button"
        class="mt-6 inline-flex h-12 items-center justify-center rounded-[12px] px-5 text-[14px] font-semibold transition active:scale-95"
        :class="selected
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : plan.highlight
            ? 'bg-primary-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] hover:bg-primary-700'
            : 'border border-secondary-200 bg-white text-[var(--text-primary)] hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700'"
        :aria-pressed="selected"
        @click="emit('select', plan)"
      >
        <Icon :name="selected ? 'i-ph-check-circle-fill' : 'i-ph-crown-simple-duotone'" class="mr-2 h-5 w-5" />
        {{ selected ? t("pages.goProPage.selectedPlanAction") : t("pages.goProPage.selectPlan") }}
      </button>
    </UCard>
  </article>
</template>

<script setup lang="ts">
import type { BillingCycle, ProPlan } from "../../domain/types/go-pro.types"
import { formatProCurrency, getProPlanPrice, getProSavingsPercent } from "../../infrastructure/mocks/goProCatalog"

const props = withDefaults(defineProps<{
  plan: ProPlan
  billingCycle: BillingCycle
  selected?: boolean
}>(), {
  selected: false,
})

const emit = defineEmits<{ select: [plan: ProPlan] }>()

const { t, locale } = useI18n()

const price = computed(() => getProPlanPrice(props.plan, props.billingCycle))

const savingsPercent = computed(() => getProSavingsPercent(props.plan))

const monthlyEquivalent = computed(() => Math.round(props.plan.yearlyPrice / 12))

const visibleFeatures = computed(() => props.plan.features.slice(0, 3))

const visibleLimits = computed(() => props.plan.limits.slice(0, 2))

const planIcon = computed(() => {
  if (props.selected) return "i-ph-check-circle-fill"
  if (props.plan.highlight) return "i-ph-star-four-fill"
  return "i-ph-crown-simple-duotone"
})

const cardClass = computed(() =>
  props.selected
    ? "border-emerald-300 ring-4 ring-emerald-50 shadow-[0_18px_38px_rgba(16,185,129,0.10)]"
    : props.plan.highlight
      ? "border-primary-300 ring-4 ring-primary-50 shadow-[0_18px_38px_rgba(37,99,235,0.12)]"
      : "border-[#dbe3f2] shadow-[0_10px_28px_rgba(15,35,110,0.04)]",
)
</script>
