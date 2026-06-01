<!-- English description: Compact wallet balance card that mirrors the PHP wallet balance section. -->
<template>
  <section class="wallet-hero">
    <div class="wallet-hero__main">
      <div class="wallet-hero__icon">
        <Icon name="i-ph-wallet-duotone" class="h-7 w-7" />
      </div>
      <div class="min-w-0">
        <p class="wallet-hero__label">{{ t("pages.walletPage.balanceLabel") }}</p>
        <p class="wallet-hero__balance">{{ formattedBalance }}</p>
      </div>
    </div>

    <div class="wallet-hero__stats">
      <div class="wallet-hero__stat">
        <span>{{ transactionsCount }}</span>
        <p>{{ t("pages.walletPage.statTransactions") }}</p>
      </div>
      <div class="wallet-hero__stat">
        <span>{{ topupMethodsCount }}</span>
        <p>{{ t("pages.walletPage.topupMethod") }}</p>
      </div>
    </div>

    <div class="wallet-hero__actions">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { WalletCurrencyRule } from "../../domain/types/wallet.types"

const props = defineProps<{
  balance: number
  transactionsCount: number
  topupMethodsCount: number
  currency: string
  currencySymbol: string
  currencyRule: WalletCurrencyRule
}>()

const { t, locale } = useI18n()

const formattedBalance = computed(() =>
  formatCurrency(props.balance, {
    currency: props.currency,
    currencySymbol: props.currencySymbol,
    currencyRule: props.currencyRule,
    locale: locale.value,
  }),
)
</script>

<style scoped>
.wallet-hero {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.wallet-hero__main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
}

.wallet-hero__icon {
  display: flex;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.wallet-hero__label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.wallet-hero__balance {
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: clamp(28px, 5vw, 40px);
  line-height: 1.05;
  font-weight: 800;
  color: #0f172a;
}

.wallet-hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.wallet-hero__stat {
  min-width: 0;
  border-radius: 12px;
  background: #fafbfe;
  padding: 12px;
}

.wallet-hero__stat span {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.wallet-hero__stat p {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.wallet-hero__actions {
  display: grid;
  gap: 10px;
}

@media (min-width: 640px) {
  .wallet-hero {
    grid-template-columns: minmax(0, 1fr) 220px;
    align-items: center;
    padding: 24px;
  }

  .wallet-hero__actions {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
