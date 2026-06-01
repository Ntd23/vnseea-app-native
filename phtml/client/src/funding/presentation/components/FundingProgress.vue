<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3 text-[12px] font-bold text-[var(--text-secondary)]">
      <span>{{ formatMoney(raised) }}</span>
      <span>{{ percent }}%</span>
    </div>

    <UProgress
      :model-value="clampedPercent"
      color="primary"
      size="xl"
      :aria-label="progressAriaLabel"
    />

    <p class="text-[12px] font-semibold text-[var(--text-tertiary)]">
      {{ t("pages.fundingPage.goalAmount", { amount: formatMoney(goal) }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"

const props = defineProps<{
  raised: number
  goal: number
}>()

const { t, locale } = useI18n()

const safeGoal = computed(() => (props.goal > 0 ? props.goal : 0))

const percent = computed(() => {
  if (!safeGoal.value) return 0
  return Math.round((props.raised / safeGoal.value) * 100)
})

const clampedPercent = computed(() => Math.min(Math.max(percent.value, 0), 100))

const formatMoney = (amount: number) =>
  formatCurrency(amount, {
    currency: "VND",
    locale: locale.value,
  })

const progressAriaLabel = computed(() =>
  t("pages.fundingPage.progressAriaLabel", {
    raised: formatMoney(props.raised),
    goal: formatMoney(props.goal),
    percent: percent.value,
  }),
)
</script>
