<!-- English description: Withdrawal page wired to backend data and the PHP withdrawal request flow. -->
<template>
  <div class="mx-auto max-w-5xl space-y-5 pb-10">
    <section class="surface-card p-5 sm:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-surface-active)] text-[var(--text-brand)]">
            <Icon name="i-ph-bank-duotone" class="h-6 w-6" />
          </div>
          <div>
            <p class="text-label-secondary">{{ t("pages.withdrawalPage.title") }}</p>
            <h1 class="text-heading text-[var(--text-primary)]">{{ t("pages.withdrawalPage.heroTitle") }}</h1>
          </div>
        </div>

        <NuxtLink to="/wallet" class="withdrawal-page__back btn-secondary w-fit">
          <Icon name="i-ph-arrow-left-bold" class="h-4 w-4" />
          <span>{{ t("pages.withdrawalPage.goBack") }}</span>
        </NuxtLink>
      </div>
    </section>

    <div v-if="loading" class="space-y-5">
      <USkeleton class="h-32 rounded-3xl" />
      <USkeleton class="h-72 rounded-3xl" />
    </div>

    <template v-else>
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        class="rounded-2xl"
        :description="errorMessage"
      />

      <template v-else>
        <WithdrawalHero
          :balance="overview.balance"
          :wallet-balance="overview.walletBalance"
          :currency="overview.currency"
          :currency-symbol="overview.currencySymbol"
          :currency-rule="overview.currencyRule"
        />

        <UAlert
          v-if="belowMinimum"
          color="error"
          variant="subtle"
          class="rounded-2xl"
          :description="t('pages.withdrawalPage.minimumWarning', {
            balance: formattedBalance,
            minimum: formattedMinimumAmount
          })"
        />

        <UAlert
          v-if="overview.hasPendingRequest"
          color="warning"
          variant="subtle"
          class="rounded-2xl"
          :description="t('pages.withdrawalPage.hasPendingRequest')"
        />

        <UAlert
          v-if="mutationError"
          color="error"
          variant="subtle"
          class="rounded-2xl"
          :description="mutationError"
        />
        <UAlert
          v-if="mutationMessage"
          color="primary"
          variant="subtle"
          class="rounded-2xl"
          :description="mutationMessage"
        />

        <WithdrawalRequestForm
          :balance="overview.balance"
          :minimum-amount="overview.minimumAmount"
          :currency="overview.currency"
          :currency-symbol="overview.currencySymbol"
          :currency-rule="overview.currencyRule"
          :methods="overview.methods"
          :paypal-email="overview.paypalEmail"
          :submitting="submitting"
          :disabled="!canSubmit"
          @request="requestWithdrawal"
        />

        <WithdrawalHistory
          :items="overview.history"
          :currency="overview.currency"
          :currency-symbol="overview.currencySymbol"
          :currency-rule="overview.currencyRule"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useWithdrawalPageVM } from "../../application/view-models/useWithdrawalPageVM"
import WithdrawalHero from "../components/WithdrawalHero.vue"
import WithdrawalHistory from "../components/WithdrawalHistory.vue"
import WithdrawalRequestForm from "../components/WithdrawalRequestForm.vue"

const { t } = useI18n()

const {
  overview,
  loading,
  errorMessage,
  belowMinimum,
  canSubmit,
  formattedBalance,
  formattedMinimumAmount,
  submitting,
  mutationError,
  mutationMessage,
  requestWithdrawal,
} = useWithdrawalPageVM()

useSeoMeta({
  title: () => t("pages.withdrawalPage.seoTitle"),
  description: () => t("pages.withdrawalPage.seoDescription"),
})
</script>

<style scoped>
.withdrawal-page__back {
  position: relative;
  z-index: 2;
  pointer-events: auto;
  user-select: none;
}

.withdrawal-page__back > * {
  pointer-events: none;
}
</style>
