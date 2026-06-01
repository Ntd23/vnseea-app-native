<template>
  <section class="overflow-hidden rounded-[24px] border border-[#dbe3f2] bg-white shadow-[0_10px_28px_rgba(15,35,110,0.05)]">
    <div class="border-b border-secondary-100 p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] font-extrabold uppercase text-slate-500">
            {{ t("pages.goProPage.comparisonEyebrow") }}
          </p>
          <h2 class="mt-1 text-[24px] font-black text-[var(--text-primary)]">
            {{ t("pages.goProPage.comparisonShortTitle") }}
          </h2>
        </div>

        <Icon name="i-ph-table-duotone" class="h-7 w-7 text-primary-600" />
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left">
        <thead class="bg-secondary-50/70">
          <tr>
            <th class="px-5 py-4 text-[11px] font-black uppercase text-slate-500">
              {{ t("pages.goProPage.featureColumn") }}
            </th>
            <th
              v-for="plan in plans"
              :key="plan.id"
              class="px-5 py-4 align-top"
              :class="selectedPlanId === plan.id ? 'bg-primary-50' : ''"
            >
              <div class="space-y-1.5">
                <div class="flex items-center gap-2">
                  <p class="text-[12px] font-black uppercase text-slate-500">
                    {{ plan.name }}
                  </p>
                  <span
                    v-if="selectedPlanId === plan.id"
                    class="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-black text-white"
                  >
                    {{ t("pages.goProPage.selectedPlan") }}
                  </span>
                </div>
                <p class="text-[16px] font-black text-[var(--text-primary)]">
                  {{ formatProCurrency(getProPlanPrice(plan, billingCycle), locale) }}
                </p>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.label"
            class="border-t border-secondary-100"
          >
            <td class="px-5 py-4 text-[14px] font-extrabold text-[var(--text-primary)]">
              {{ row.label }}
            </td>
            <td
              v-for="plan in plans"
              :key="plan.id"
              class="px-5 py-4"
              :class="selectedPlanId === plan.id ? 'bg-primary-50/70' : ''"
            >
              <div class="flex items-center">
                <Icon
                  :name="row[plan.id] ? 'i-ph-check-circle-fill' : 'i-ph-x-circle-fill'"
                  class="h-6 w-6"
                  :class="row[plan.id] ? 'text-emerald-600' : 'text-slate-300'"
                />
                <span class="sr-only">
                  {{ row[plan.id] ? t("pages.goProPage.featureIncluded") : t("pages.goProPage.featureNotIncluded") }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BillingCycle, ProComparisonRow, ProPlan, ProPlanKey } from "../../domain/types/go-pro.types"
import { formatProCurrency, getProPlanPrice } from "../../infrastructure/mocks/goProCatalog"

const props = withDefaults(defineProps<{
  plans: ReadonlyArray<ProPlan>
  rows: ReadonlyArray<ProComparisonRow>
  billingCycle: BillingCycle
  selectedPlanId?: ProPlanKey | ""
}>(), {
  selectedPlanId: "",
})

const { t, locale } = useI18n()
</script>
