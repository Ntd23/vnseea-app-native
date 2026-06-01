<!-- English description: Withdrawal balance block that follows the PHP withdrawal page order. -->
<template>
  <section class="surface-card p-5 sm:p-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface-active)] text-[var(--text-brand)]">
          <Icon name="i-ph-bank-duotone" class="h-7 w-7" />
        </div>
        <div>
          <p class="text-label-secondary">{{ t("pages.withdrawalPage.balanceTitle") }}</p>
          <p class="mt-1 text-3xl font-black text-[var(--text-primary)]">
            {{ totalBalance }}
          </p>
        </div>
      </div>

      <div class="rounded-2xl bg-[var(--bg-muted)] px-4 py-3">
        <p class="text-caption-secondary">{{ t("pages.withdrawalPage.availableBalance") }}</p>
        <p class="text-title-primary">{{ availableBalance }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { WithdrawalCurrencyRule } from "../../domain/types/withdrawal.types"

const props = defineProps<{
  balance: number
  walletBalance: number
  currency: string
  currencySymbol: string
  currencyRule: WithdrawalCurrencyRule
}>()

const { t, locale } = useI18n()

const formatAmount = (amount: number) =>
  formatCurrency(amount, {
    currency: props.currency,
    currencySymbol: props.currencySymbol,
    currencyRule: props.currencyRule,
    locale: locale.value,
  })

const totalBalance = computed(() =>
  formatAmount(props.balance + props.walletBalance),
)
const availableBalance = computed(() =>
  formatAmount(props.balance),
)
</script>
