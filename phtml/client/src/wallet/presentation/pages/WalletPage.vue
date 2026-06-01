<!-- English description: Wallet page that mirrors the PHP wallet order using backend-backed data. -->
<template>
  <div class="mx-auto max-w-5xl space-y-5 pb-10">
    <section class="surface-card p-5 sm:p-6">
      <div class="wallet-page-header">
        <div class="wallet-page-header__title">
          <div class="wallet-page-header__icon">
            <Icon name="i-ph-wallet-duotone" class="h-6 w-6" />
          </div>
          <div>
            <p class="text-label-secondary">{{ t("pages.walletPage.title") }}</p>
            <h1 class="text-heading text-[var(--text-primary)]">{{ t("pages.walletPage.myWallet") }}</h1>
          </div>
        </div>

        <NuxtLink
          v-if="overview.canWithdraw"
          :to="overview.withdrawalUrl"
          class="wallet-header-link btn-secondary w-fit"
        >
          <Icon name="i-ph-bank-duotone" class="h-4 w-4" />
          <span>{{ t("pages.walletPage.withdrawal") }}</span>
        </NuxtLink>
      </div>
    </section>

    <div v-if="loading" class="space-y-5">
      <USkeleton class="h-32 rounded-3xl" />
      <USkeleton class="h-64 rounded-3xl" />
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
        <WalletHero
          :balance="overview.balance"
          :transactions-count="walletActivityTransactions.length"
          :topup-methods-count="overview.topupMethods.length"
          :currency="overview.currency"
          :currency-symbol="overview.currencySymbol"
          :currency-rule="overview.currencyRule"
        >
          <button
            type="button"
            class="wallet-action wallet-action--primary"
            :class="{ 'wallet-action--active': topupFormOpen }"
            @click="openTopupForm"
          >
            <span class="wallet-action__icon">
              <Icon name="i-ph-plus-circle-duotone" class="h-5 w-5" />
            </span>
            <span>{{ t("pages.walletPage.addFunds") }}</span>
          </button>
          <button
            type="button"
            class="wallet-action"
            :class="{ 'wallet-action--active': sendModalOpen }"
            @click="openSendModal"
          >
            <span class="wallet-action__icon">
              <Icon name="i-ph-paper-plane-tilt-duotone" class="h-5 w-5" />
            </span>
            <span>{{ t("pages.walletPage.sendMoney") }}</span>
          </button>
          <button
            type="button"
            class="wallet-action"
            :class="{ 'wallet-action--active': receiveQrOpen }"
            @click="openReceiveQr()"
          >
            <span class="wallet-action__icon">
              <Icon name="i-ph-qr-code-duotone" class="h-5 w-5" />
            </span>
            <span>{{ t("pages.walletPage.receiveQr") }}</span>
          </button>
        </WalletHero>

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

        <section v-if="topupFormOpen" class="wallet-inline-panel">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="text-label-secondary">{{ t("pages.walletPage.addFunds") }}</p>
              <h2 class="text-heading text-[var(--text-primary)]">{{ t("pages.walletPage.topupTitle") }}</h2>
            </div>
            <button type="button" class="wallet-panel-close" @click="closeTopupForm">
              <Icon name="i-ph-x-duotone" class="h-5 w-5" />
            </button>
          </div>
          <WalletTopupForm
            :methods="overview.topupMethods"
            :submitting="toppingUp"
            @topup="createTopup"
          />

          <div v-if="sepayTopup?.qrUrl" class="wallet-sepay-result">
            <div class="wallet-sepay-result__header">
              <Icon name="i-ph-credit-card-duotone" class="h-5 w-5" />
              <h3>{{ t("pages.walletPage.sepayPaymentInfoTitle") }}</h3>
            </div>

            <div class="wallet-sepay-result__body">
              <div class="wallet-sepay-result__qr-panel">
                <p class="wallet-sepay-result__scan-text">{{ t("pages.walletPage.sepayScanInstruction") }}</p>
                <img
                  :src="sepayTopup.qrUrl"
                  :alt="t('pages.walletPage.sepayTitle')"
                  class="wallet-sepay-result__qr"
                >
                <a
                  :href="sepayTopup.qrUrl"
                  class="wallet-sepay-result__download"
                  download
                >
                  <Icon name="i-ph-download-simple-duotone" class="h-4 w-4" />
                  <span>{{ t("pages.walletPage.sepayDownloadQr") }}</span>
                </a>
              </div>

            <div class="wallet-sepay-result__details">
                <div class="wallet-sepay-result__bank-logo">
                  <img :src="mbBankLogoUrl" alt="">
                </div>
              <dl class="wallet-sepay-result__list">
                <div>
                  <dt>{{ t("pages.walletPage.sepayBank") }}</dt>
                    <dd>{{ sepayBankName }}</dd>
                </div>
                <div>
                  <dt>{{ t("pages.walletPage.sepayAccountName") }}</dt>
                    <dd>{{ sepayTopup.accountName || "-" }}</dd>
                </div>
                <div>
                  <dt>{{ t("pages.walletPage.sepayAccountNumber") }}</dt>
                    <dd>
                      <span>{{ sepayTopup.accountNumber || "-" }}</span>
                      <button type="button" class="wallet-sepay-result__copy" @click="copySepayValue(sepayTopup.accountNumber)">
                        <Icon name="i-ph-copy-duotone" class="h-4 w-4" />
                      </button>
                    </dd>
                </div>
                <div>
                    <dt>{{ t("pages.walletPage.sepayOrderCode") }}</dt>
                    <dd>
                      <span>{{ sepayTopup.orderCode || "-" }}</span>
                      <button type="button" class="wallet-sepay-result__copy" @click="copySepayValue(sepayTopup.orderCode)">
                        <Icon name="i-ph-copy-duotone" class="h-4 w-4" />
                      </button>
                    </dd>
                </div>
                <div>
                  <dt>{{ t("pages.walletPage.sepayAmount") }}</dt>
                    <dd>
                      <span>{{ formattedSepayAmount }}</span>
                      <button type="button" class="wallet-sepay-result__copy" @click="copySepayValue(String(sepayTopup.amount ?? ''))">
                        <Icon name="i-ph-copy-duotone" class="h-4 w-4" />
                      </button>
                    </dd>
                </div>
              </dl>
                <p class="wallet-sepay-result__notice">
                  {{ t("pages.walletPage.sepayTransferNoticePrefix") }}
                  <strong>{{ sepayTopup.orderCode || "-" }}</strong>
                  {{ t("pages.walletPage.sepayTransferNoticeMiddle") }}
                  <strong>{{ formattedSepayAmount }}</strong>
                  {{ t("pages.walletPage.sepayTransferNoticeSuffix") }}
                </p>
              </div>
            </div>

            <div class="wallet-sepay-result__status">
              <p>{{ t("pages.walletPage.sepayWaitingTitle") }}</p>
              <span>{{ t("pages.walletPage.sepayWaitingSubtitle") }}</span>
              <UButton
                color="primary"
                variant="ghost"
                class="wallet-sepay-result__check"
                :loading="toppingUp"
                icon="i-ph-arrows-clockwise-duotone"
                @click="checkSepayTopup"
              >
                {{ t("pages.walletPage.sepayCheck") }}
              </UButton>
            </div>
          </div>
        </section>

        <section v-if="sendModalOpen" class="wallet-inline-panel">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="text-label-secondary">{{ t("pages.walletPage.sendEyebrow") }}</p>
              <h2 class="text-heading text-[var(--text-primary)]">{{ t("pages.walletPage.sendMoneyTitle") }}</h2>
            </div>
            <button type="button" class="wallet-panel-close" @click="closeSendModal">
              <Icon name="i-ph-x-duotone" class="h-5 w-5" />
            </button>
          </div>
          <WalletSendForm
            :open="sendModalOpen"
            :recipients="recipientResults"
            :searching="recipientSearching"
            :submitting="sending"
            :balance="overview.balance"
            :currency="overview.currency"
            :currency-symbol="overview.currencySymbol"
            :currency-rule="overview.currencyRule"
            @update:open="value => value ? openSendModal() : closeSendModal()"
            @search="searchRecipients"
            @send="sendMoney"
          />
        </section>

        <section v-if="receiveQrOpen" class="wallet-inline-panel">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="text-label-secondary">{{ t("pages.walletPage.receiveQr") }}</p>
              <h2 class="text-heading text-[var(--text-primary)]">{{ t("pages.walletPage.receiveQrTitle") }}</h2>
            </div>
            <button type="button" class="wallet-panel-close" @click="closeReceiveQr">
              <Icon name="i-ph-x-duotone" class="h-5 w-5" />
            </button>
          </div>
          <div class="space-y-4 text-center">
            <div class="grid gap-2 text-left sm:grid-cols-[1fr_auto]">
              <UFormField :label="t('pages.walletPage.receiveAmount')">
                <UInputNumber
                  v-model="receiveAmount"
                  :min="0"
                  class="w-full"
                />
              </UFormField>
              <UButton
                color="neutral"
                variant="soft"
                class="self-end rounded-full font-semibold"
                icon="i-ph-arrows-clockwise-duotone"
                @click="openReceiveQr(receiveAmount)"
              >
                {{ t("pages.walletPage.updateQr") }}
              </UButton>
            </div>
            <img
              v-if="receiveQr?.imageUrl"
              :src="receiveQr.imageUrl"
              :alt="t('pages.walletPage.receiveQrTitle')"
              class="mx-auto h-64 w-64 rounded-2xl bg-white p-4 shadow-md"
            >
            <p class="text-body-secondary">{{ t("pages.walletPage.receiveQrDescription") }}</p>
          </div>
        </section>

        <WalletTransactions
          :transactions="walletActivityTransactions"
          :currency="overview.currency"
          :currency-symbol="overview.currencySymbol"
          :currency-rule="overview.currencyRule"
        />
      </template>
    </template>

  </div>
</template>

<script setup lang="ts">
import { useWalletPageVM } from "../../application/view-models/useWalletPageVM"
import WalletHero from "../components/WalletHero.vue"
import WalletSendForm from "../components/WalletSendForm.vue"
import WalletTopupForm from "../components/WalletTopupForm.vue"
import WalletTransactions from "../components/WalletTransactions.vue"

const { t } = useI18n()

const {
  overview,
  walletActivityTransactions,
  loading,
  errorMessage,
  sendModalOpen,
  topupFormOpen,
  receiveQrOpen,
  receiveAmount,
  recipientResults,
  recipientSearching,
  receiveQr,
  sepayTopup,
  formattedSepayAmount,
  mbBankLogoUrl,
  sepayBankName,
  mutationError,
  mutationMessage,
  sending,
  toppingUp,
  openTopupForm,
  closeTopupForm,
  openSendModal,
  closeSendModal,
  openReceiveQr,
  closeReceiveQr,
  searchRecipients,
  sendMoney,
  createTopup,
  checkSepayTopup,
  copySepayValue,
} = useWalletPageVM()

</script>

<style scoped>
.wallet-page-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  justify-content: space-between;
}

.wallet-page-header__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.wallet-page-header__icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--bg-surface-active);
  color: var(--text-brand);
}

.wallet-action {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.wallet-header-link,
.wallet-sepay-result__download {
  position: relative;
  z-index: 2;
  pointer-events: auto;
  user-select: none;
}

.wallet-action > *,
.wallet-header-link > *,
.wallet-panel-close > *,
.wallet-sepay-result__download > *,
.wallet-sepay-result__copy > * {
  pointer-events: none;
}

.wallet-action:hover {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.03);
  color: #0000ff;
}

.wallet-action--active {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.wallet-action--primary {
  border-color: #0000ff;
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
}

.wallet-action--primary:hover {
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  color: #ffffff;
  box-shadow: 0 6px 20px rgba(0, 0, 255, 0.28);
}

.wallet-action--primary.wallet-action--active {
  color: #ffffff;
}

.wallet-action__icon {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #0000ff;
}

.wallet-action--primary .wallet-action__icon {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.wallet-action--active:not(.wallet-action--primary) .wallet-action__icon {
  background: rgba(0, 0, 255, 0.08);
  color: #0000ff;
}

.wallet-inline-panel {
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.wallet-panel-close {
  position: relative;
  z-index: 2;
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.wallet-panel-close:hover {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.03);
  color: #0000ff;
}

.wallet-sepay-result {
  display: grid;
  gap: 18px;
  margin-top: 18px;
  border: 1px solid #dbeafe;
  border-radius: 18px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
}

.wallet-sepay-result__header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7f1d1d;
}

.wallet-sepay-result__header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 800;
}

.wallet-sepay-result__body {
  display: grid;
  gap: 22px;
}

.wallet-sepay-result__qr-panel {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.wallet-sepay-result__scan-text {
  max-width: 220px;
  margin: 0;
  text-align: center;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.wallet-sepay-result__qr {
  width: min(100%, 240px);
  justify-self: center;
  border-radius: 8px;
  background: #ffffff;
  padding: 0;
  box-shadow: none;
  display: block;
}

.wallet-sepay-result__download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #ffffff;
  padding: 7px 12px;
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s ease;
}

.wallet-sepay-result__download:hover {
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.wallet-sepay-result__details {
  min-width: 0;
}

.wallet-sepay-result__bank-logo {
  margin-bottom: 18px;
}

.wallet-sepay-result__bank-logo img {
  display: block;
  height: 24px;
  width: auto;
}

.wallet-sepay-result__list {
  display: grid;
  gap: 14px;
  margin: 0;
}

.wallet-sepay-result__list div {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.wallet-sepay-result__list dt {
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
}

.wallet-sepay-result__list dd {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
}

.wallet-sepay-result__copy {
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.wallet-sepay-result__copy:hover {
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.wallet-sepay-result__notice {
  margin: 18px 0 0;
  border-left: 4px solid #facc15;
  border-radius: 8px;
  background: #fff8db;
  padding: 14px 16px;
  color: #6b4f0d;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.wallet-sepay-result__notice strong {
  color: #dc2626;
}

.wallet-sepay-result__status {
  display: grid;
  justify-items: center;
  gap: 6px;
  border-radius: 12px;
  background: #fbfaff;
  padding: 20px 16px 14px;
  text-align: center;
}

.wallet-sepay-result__status p {
  margin: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 800;
}

.wallet-sepay-result__status span {
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
}

.wallet-sepay-result__check {
  position: relative;
  z-index: 2;
  margin-top: 8px;
  border-top: 3px solid #991b1b;
  border-radius: 0;
  padding-top: 10px;
  pointer-events: auto;
}

@media (min-width: 768px) {
  .wallet-sepay-result__body {
    grid-template-columns: 260px minmax(0, 1fr);
    align-items: start;
  }
}

@media (max-width: 520px) {
  .wallet-sepay-result {
    padding: 14px;
  }

  .wallet-sepay-result__list div {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .wallet-sepay-result__list dd {
    justify-content: flex-start;
    text-align: left;
  }
}

@media (min-width: 640px) {
  .wallet-page-header {
    flex-direction: row;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .wallet-page-header :deep(.btn-secondary) {
    width: 100%;
    justify-content: center;
  }
}
</style>

