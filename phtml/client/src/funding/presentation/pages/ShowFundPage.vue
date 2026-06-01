<!-- English description: Backend-backed funding detail page for the show_fund route with donation sidebar. -->
<template>
  <main class="fund-detail">
    <USkeleton v-if="pending" class="fund-detail__skeleton" />

    <UAlert v-else-if="error" color="error" variant="soft" :title="String(error.message || error)" />

    <template v-else-if="campaign">
      <section class="fund-detail__hero">
        <NuxtImg
          v-if="campaign.imageUrl"
          :src="campaign.imageUrl"
          :alt="campaign.title"
          width="1120"
          height="560"
          class="fund-detail__image"
        />
        <div v-else class="fund-detail__image fund-detail__image--empty">
          <Icon name="i-ph-image-square-duotone" class="h-10 w-10" />
        </div>

        <div class="fund-detail__hero-body">
          <NuxtLink to="/funding" class="fund-detail__back">
            <Icon name="i-ph-arrow-left-bold" class="h-4 w-4" />
            {{ t("pages.createFundingPage.backToFunding") }}
          </NuxtLink>

          <div class="fund-detail__owner">
            <NuxtImg
              v-if="campaign.ownerAvatarUrl"
              :src="campaign.ownerAvatarUrl"
              :alt="campaign.ownerName"
              width="48"
              height="48"
              class="fund-detail__avatar"
            />
            <span v-else class="fund-detail__avatar fund-detail__avatar--empty">
              {{ ownerInitials(campaign.ownerName) }}
            </span>
            <div>
              <h1>{{ campaign.title }}</h1>
              <p>{{ campaign.ownerName || "-" }}</p>
            </div>
          </div>
        </div>
      </section>

      <div class="fund-detail__layout">
        <div class="fund-detail__main">
          <article class="fund-detail__story">
            <div class="fund-detail__section-title">
              <Icon name="i-ph-note-pencil-duotone" class="h-5 w-5" />
              <h2>{{ t("pages.createFundingPage.storyTitle") }}</h2>
            </div>
            <p>{{ campaign.description }}</p>
          </article>

          <section class="fund-detail__donors">
            <div class="fund-detail__section-title">
              <Icon name="i-ph-users-three-duotone" class="h-5 w-5" />
              <h2>{{ t("pages.fundingPage.donorsTitle") }}</h2>
            </div>

            <div class="fund-detail__donor-tools">
              <UInput
                v-model="donorSearch"
                icon="i-ph-magnifying-glass-duotone"
                :placeholder="t('pages.fundingPage.donorSearchPlaceholder')"
                class="fund-detail__donor-search"
              />
              <label class="fund-detail__donor-sort">
                <span>{{ t("pages.fundingPage.donorSortLabel") }}</span>
                <select v-model="donorSort">
                  <option value="newest">{{ t("pages.fundingPage.donorSortNewest") }}</option>
                  <option value="amount_asc">{{ t("pages.fundingPage.donorSortAmountAsc") }}</option>
                  <option value="amount_desc">{{ t("pages.fundingPage.donorSortAmountDesc") }}</option>
                </select>
              </label>
            </div>

            <div v-if="filteredDonations.length" class="fund-detail__donor-list">
              <article
                v-for="donation in filteredDonations"
                :key="donation.id"
                class="fund-detail__donor-item"
              >
                <NuxtImg
                  v-if="donation.supporterAvatarUrl"
                  :src="donation.supporterAvatarUrl"
                  :alt="donation.supporterName"
                  width="42"
                  height="42"
                  class="fund-detail__donor-avatar"
                  loading="lazy"
                />
                <span v-else class="fund-detail__donor-avatar fund-detail__donor-avatar--empty">
                  {{ ownerInitials(donation.supporterName) }}
                </span>
                <div>
                  <strong>{{ donation.supporterName || "-" }}</strong>
                  <span>{{ formatDonationDate(donation.donatedAt) }}</span>
                </div>
                <b>{{ formatMoney(donation.amount) }}</b>
              </article>
            </div>

            <div v-else class="fund-detail__donor-empty">
              <Icon name="i-ph-hand-heart-duotone" class="h-8 w-8" />
              <p>{{ t("pages.fundingPage.donorsEmpty") }}</p>
            </div>
          </section>
        </div>

        <aside class="fund-detail__sidebar">
          <section class="fund-detail__panel">
            <div class="fund-detail__amount-row">
              <div>
                <span>{{ t("pages.fundingPage.statRaised") }}</span>
                <strong>{{ formatMoney(campaign.raised) }}</strong>
              </div>
              <div>
                <span>{{ t("pages.createFundingPage.goalLabel") }}</span>
                <strong>{{ formatMoney(campaign.amount) }}</strong>
              </div>
              <div>
                <span>{{ t("pages.fundingPage.donorsLabel") }}</span>
                <strong>{{ campaign.donorCount }}</strong>
              </div>
            </div>

            <div class="fund-detail__progress">
              <div>
                <span>{{ campaign.progress }}%</span>
              </div>
              <div
                class="fund-progress"
                :class="{ 'fund-progress--completed': campaign.isCompleted }"
                aria-hidden="true"
              >
                <span :style="{ width: `${Math.min(Math.max(campaign.progress, 0), 100)}%` }"></span>
              </div>
            </div>

            <button
              v-if="campaign.canDonate"
              type="button"
              class="fund-detail__donate"
              @click="openDonate"
            >
              <Icon name="i-ph-hand-heart-duotone" class="h-4 w-4" />
              {{ t("pages.fundingPage.donate") }}
            </button>
          </section>
        </aside>
      </div>
    </template>

    <UModal v-model:open="donationOpen" :title="campaign?.title || t('pages.fundingPage.donateTitle')">
      <template #body>
        <div class="fund-detail__modal-body">
          <p>{{ t("pages.fundingPage.donateModalDescription", { title: campaign?.title || "-" }) }}</p>
          <UInput
            v-model.number="donationAmount"
            type="number"
            min="1"
            :placeholder="t('pages.fundingPage.amountPlaceholder')"
            class="w-full"
          />
        </div>
      </template>
      <template #footer>
        <div class="fund-detail__modal-actions">
          <UButton color="neutral" variant="soft" @click="donationOpen = false">
            {{ t("pages.fundingPage.close") }}
          </UButton>
          <UButton color="primary" :loading="donating" @click="submitDonation">
            {{ t("pages.fundingPage.donate") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import { useShowFundPageVM } from "../../application/view-models/useShowFundPageVM"

const { t, locale } = useI18n()
const {
  campaign,
  currency,
  currencySymbol,
  pending,
  error,
  donationOpen,
  donationAmount,
  donating,
  donorSearch,
  donorSort,
  filteredDonations,
  openDonate,
  submitDonation,
} = useShowFundPageVM()

const formatMoney = (amount: number) =>
  formatCurrency(amount, {
    currency: currency.value,
    currencySymbol: currencySymbol.value,
    locale: locale.value,
  })

const ownerInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "VN"

const formatDonationDate = (value: string) => {
  if (!value) return "-"
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

</script>

<style scoped>
.fund-detail {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 18px 12px 42px;
}

.fund-detail__skeleton {
  height: 560px;
  border-radius: 16px;
}

.fund-detail__hero,
.fund-detail__story,
.fund-detail__donors,
.fund-detail__panel {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.fund-detail__hero {
  display: grid;
}

.fund-detail__image {
  width: 100%;
  max-height: 460px;
  object-fit: cover;
  background: #eef2ff;
}

.fund-detail__image--empty {
  display: flex;
  min-height: 280px;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.fund-detail__hero-body {
  display: grid;
  gap: 18px;
  padding: 16px;
}

.fund-detail__back {
  display: inline-flex;
  width: fit-content;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  padding: 9px 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.fund-detail__owner {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.fund-detail__avatar {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  object-fit: cover;
}

.fund-detail__avatar--empty {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 13px;
  font-weight: 900;
}

.fund-detail__owner h1 {
  color: #0f172a;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.16;
}

.fund-detail__owner p,
.fund-detail__amount-row span,
.fund-detail__progress span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.fund-detail__layout {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.fund-detail__main {
  display: grid;
  gap: 14px;
}

.fund-detail__story {
  padding: 18px;
}

.fund-detail__donors {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.fund-detail__section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0000ff;
}

.fund-detail__section-title h2 {
  color: #0f172a;
  font-size: 17px;
  font-weight: 900;
}

.fund-detail__story p {
  margin-top: 14px;
  white-space: pre-line;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.75;
}

.fund-detail__donor-tools {
  display: grid;
  gap: 10px;
}

.fund-detail__donor-search {
  width: 100%;
}

.fund-detail__donor-sort {
  display: grid;
  gap: 6px;
}

.fund-detail__donor-sort span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.fund-detail__donor-sort select {
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 8px 12px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.fund-detail__donor-list {
  display: grid;
  gap: 10px;
}

.fund-detail__donor-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  background: #f8fafc;
  padding: 10px;
}

.fund-detail__donor-avatar {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  object-fit: cover;
}

.fund-detail__donor-avatar--empty {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 12px;
  font-weight: 900;
}

.fund-detail__donor-item div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.fund-detail__donor-item strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fund-detail__donor-item span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.fund-detail__donor-item b {
  grid-column: 1 / -1;
  color: #0000ff;
  font-size: 14px;
  font-weight: 900;
}

.fund-detail__donor-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  border-radius: 14px;
  background: #f8fafc;
  padding: 22px;
  color: #64748b;
  text-align: center;
}

.fund-detail__donor-empty p {
  font-size: 13px;
  font-weight: 700;
}

.fund-detail__sidebar {
  display: grid;
  align-content: start;
}

.fund-detail__panel {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.fund-detail__amount-row {
  display: grid;
  gap: 12px;
}

.fund-detail__amount-row div {
  display: grid;
  gap: 5px;
}

.fund-detail__amount-row strong {
  color: #0f172a;
  font-size: 20px;
  font-weight: 900;
}

.fund-detail__progress {
  display: grid;
  gap: 8px;
}

.fund-detail__progress div:first-child {
  display: flex;
  justify-content: flex-end;
}

.fund-progress {
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
}

.fund-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0000ff;
}

.fund-progress--completed span {
  background: #16a34a;
}

.fund-detail__donate {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #0000ff;
  border-radius: 999px;
  background: #0000ff;
  padding: 10px 14px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}

.fund-detail__donate--disabled,
.fund-detail__donate--disabled:hover {
  cursor: not-allowed;
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #64748b;
}

.fund-detail__modal-body {
  display: grid;
  gap: 14px;
}

.fund-detail__modal-body p {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.fund-detail__modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

@media (min-width: 860px) {
  .fund-detail {
    padding: 22px 20px 48px;
  }

  .fund-detail__layout {
    grid-template-columns: minmax(0, 1fr) 340px;
  }

  .fund-detail__donor-tools {
    grid-template-columns: minmax(0, 1fr) 210px;
    align-items: end;
  }

  .fund-detail__donor-item {
    grid-template-columns: 42px minmax(0, 1fr) auto;
  }

  .fund-detail__donor-item b {
    grid-column: auto;
  }

  .fund-detail__panel {
    position: sticky;
    top: 18px;
  }
}
</style>
