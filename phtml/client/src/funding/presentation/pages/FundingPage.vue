<!-- English description: Backend-backed funding listing page with a polished campaign browsing experience. -->
<template>
  <main class="funding-page">
    <section class="funding-hero">
      <div class="funding-hero__content">
        <div class="funding-hero__icon">
          <Icon name="i-ph-hand-heart-duotone" class="h-7 w-7" />
        </div>
        <div class="funding-hero__copy">
          <p>{{ t("pages.fundingPage.heroEyebrow") }}</p>
          <h1>{{ t("pages.fundingPage.heroTitle") }}</h1>
          <span>{{ t("pages.fundingPage.heroDescription") }}</span>
        </div>
      </div>

      <div class="funding-hero__actions">
        <NuxtLink v-if="canCreate" to="/create_funding" class="funding-action funding-action--primary">
          <Icon name="i-ph-plus-bold" class="h-4 w-4" />
          {{ t("pages.fundingPage.createCampaign") }}
        </NuxtLink>
      </div>
    </section>

    <section class="funding-stats">
      <div>
        <span>{{ t("pages.fundingPage.statTotalContributed") }}</span>
        <strong>{{ formatMoney(totalRaised) }}</strong>
      </div>
      <div>
        <span>{{ t("pages.fundingPage.statDonorCount") }}</span>
        <strong>{{ totalDonations }}</strong>
      </div>
      <div>
        <span>{{ t("pages.fundingPage.statCompletedFunds") }}</span>
        <strong>{{ completedFunds }}</strong>
      </div>
      <div>
        <span>{{ t("pages.fundingPage.statActiveCampaigns") }}</span>
        <strong>{{ activeCampaigns }}</strong>
      </div>
    </section>

    <section class="funding-toolbar">
      <div class="funding-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="funding-tab"
          :class="{ 'funding-tab--active': activeTab === tab.value }"
          @click="setTab(tab.value)"
        >
          <Icon :name="tab.icon" class="h-4 w-4" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <section v-if="pending" class="funding-grid">
      <USkeleton v-for="index in 4" :key="index" class="funding-skeleton" />
    </section>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="String(error.message || error)"
    />

    <section v-else-if="items.length" class="funding-grid">
      <article
        v-for="campaign in items"
        :key="campaign.id"
        class="funding-card"
      >
        <NuxtLink :to="campaign.detailUrl" class="funding-card__media">
          <NuxtImg
            v-if="campaign.imageUrl"
            :src="campaign.imageUrl"
            :alt="campaign.title"
            width="720"
            height="430"
            class="funding-card__image"
            loading="lazy"
          />
          <div v-else class="funding-card__fallback">
            <Icon name="i-ph-image-square-duotone" class="h-8 w-8" />
          </div>
          <span
            class="funding-card__badge"
            :class="{ 'funding-card__badge--completed': campaign.isCompleted }"
          >
            {{ campaign.progress }}%
          </span>
        </NuxtLink>

        <div class="funding-card__body">
          <div class="funding-card__owner">
            <NuxtImg
              v-if="campaign.ownerAvatarUrl"
              :src="campaign.ownerAvatarUrl"
              :alt="campaign.ownerName"
              width="40"
              height="40"
              class="funding-card__avatar"
              loading="lazy"
            />
            <span v-else class="funding-card__avatar funding-card__avatar--empty">
              {{ ownerInitials(campaign.ownerName) }}
            </span>
            <div>
              <NuxtLink :to="campaign.detailUrl" class="funding-card__title">
                {{ campaign.title }}
              </NuxtLink>
              <p>{{ campaign.ownerName || "-" }}</p>
            </div>
          </div>

          <p class="funding-card__description">{{ campaign.description }}</p>

          <div class="funding-card__progress">
            <div class="funding-card__amounts">
              <span>{{ formatMoney(campaign.raised) }}</span>
              <span>{{ formatMoney(campaign.amount) }}</span>
            </div>
            <div
              class="funding-progress"
              :class="{ 'funding-progress--completed': campaign.isCompleted }"
              aria-hidden="true"
            >
              <span :style="{ width: `${Math.min(Math.max(campaign.progress, 0), 100)}%` }"></span>
            </div>
          </div>

          <div class="funding-card__metrics">
            <div>
              <Icon name="i-ph-users-three-duotone" class="h-4 w-4" />
              <span>{{ campaign.donorCount }} {{ t("pages.fundingPage.donorsLabel") }}</span>
            </div>
            <div v-if="campaign.donated">
              <Icon name="i-ph-check-circle-duotone" class="h-4 w-4" />
              <span>{{ t("pages.fundingPage.donatedBadge") }}</span>
            </div>
          </div>

          <div class="funding-card__actions">
            <button
              v-if="campaign.canDonate"
              type="button"
              class="funding-action funding-action--primary"
              @click="openDonate(campaign)"
            >
              <Icon name="i-ph-hand-heart-duotone" class="h-4 w-4" />
              {{ t("pages.fundingPage.donate") }}
            </button>
            <NuxtLink
              v-if="activeTab === 'mine' && campaign.canManage"
              :to="campaign.editUrl"
              class="funding-action"
            >
              <Icon name="i-ph-pencil-simple-duotone" class="h-4 w-4" />
              {{ t("pages.fundingPage.editCampaign") }}
            </NuxtLink>
            <button
              v-if="activeTab === 'mine' && campaign.canManage"
              type="button"
              class="funding-action funding-action--danger"
              @click="openDelete(campaign)"
            >
              <Icon name="i-ph-trash-duotone" class="h-4 w-4" />
              {{ t("pages.fundingPage.deleteCampaign") }}
            </button>
            <NuxtLink :to="campaign.detailUrl" class="funding-action">
              {{ t("pages.fundingPage.detail") }}
            </NuxtLink>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="funding-empty">
      <Icon name="i-ph-hand-heart-duotone" class="h-10 w-10" />
      <h2>{{ t("pages.fundingPage.emptyTitle") }}</h2>
      <p>{{ t("pages.fundingPage.emptyDescription") }}</p>
    </section>

    <div v-if="hasMore && !pending" class="funding-load-more">
      <button
        type="button"
        class="funding-action"
        :disabled="loadingMore"
        @click="loadMore"
      >
        <Icon name="i-ph-arrow-down-duotone" class="h-4 w-4" />
        {{ t("navigation.leftSidebar.showMore") }}
      </button>
    </div>

    <UModal v-model:open="donationOpen" :title="donationTarget?.title || t('pages.fundingPage.donateTitle')">
      <template #body>
        <div class="funding-donate">
          <p>{{ t("pages.fundingPage.donateModalDescription", { title: donationTarget?.title || "-" }) }}</p>
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
        <div class="funding-modal-actions">
          <UButton color="neutral" variant="soft" @click="donationTarget = null">
            {{ t("pages.fundingPage.close") }}
          </UButton>
          <UButton color="primary" :loading="donating" @click="submitDonation">
            {{ t("pages.fundingPage.donate") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" :title="t('pages.fundingPage.deleteConfirmTitle')">
      <template #body>
        <p class="funding-delete-copy">
          {{ t("pages.fundingPage.deleteConfirmDescription", { title: deleteTarget?.title || "-" }) }}
        </p>
      </template>
      <template #footer>
        <div class="funding-modal-actions">
          <UButton color="neutral" variant="soft" @click="deleteTarget = null">
            {{ t("pages.fundingPage.close") }}
          </UButton>
          <UButton color="error" :loading="deleting" @click="submitDelete">
            {{ t("pages.fundingPage.deleteCampaign") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import { useFundingPageVM } from "../../application/view-models/useFundingPageVM"

const { t, locale } = useI18n()
const {
  activeTab,
  items,
  canCreate,
  currency,
  currencySymbol,
  hasMore,
  pending,
  error,
  loadingMore,
  donationTarget,
  deleteTarget,
  donationOpen,
  deleteOpen,
  donationAmount,
  donating,
  deleting,
  totalRaised,
  totalDonations,
  completedFunds,
  activeCampaigns,
  setTab,
  loadMore,
  openDonate,
  submitDonation,
  openDelete,
  submitDelete,
} = useFundingPageVM()

const tabs = computed(() => [
  { value: "browse" as const, label: t("pages.fundingPage.results"), icon: "i-ph-compass-duotone" },
  { value: "mine" as const, label: t("pages.fundingPage.ownerBadge"), icon: "i-ph-user-circle-duotone" },
])

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
</script>

<style scoped>
.funding-page {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 18px 12px 42px;
}

.funding-hero,
.funding-toolbar,
.funding-empty,
.funding-stats {
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.funding-hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
}

.funding-hero__content {
  display: flex;
  min-width: 0;
  gap: 14px;
}

.funding-hero__icon {
  display: flex;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.funding-hero__copy {
  min-width: 0;
}

.funding-hero__copy p,
.funding-stats span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.funding-hero__copy h1 {
  margin-top: 4px;
  color: #0f172a;
  font-size: 26px;
  font-weight: 900;
  line-height: 1.12;
}

.funding-hero__copy span {
  display: block;
  max-width: 720px;
  margin-top: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.55;
}

.funding-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.funding-action {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  padding: 9px 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: all 0.15s ease;
}

.funding-action:hover {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.funding-action--primary {
  border-color: #0000ff;
  background: #0000ff;
  color: #ffffff;
}

.funding-action--primary:hover {
  background: #0000d6;
  color: #ffffff;
}

.funding-action--disabled,
.funding-action--disabled:hover {
  cursor: not-allowed;
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #64748b;
}

.funding-action--danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.funding-action--danger:hover {
  border-color: #ef4444;
  background: #fef2f2;
  color: #991b1b;
}

.funding-stats {
  display: grid;
  gap: 1px;
  margin-top: 14px;
  overflow: hidden;
}

.funding-stats div {
  display: grid;
  gap: 6px;
  background: #ffffff;
  padding: 14px;
}

.funding-stats strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
}

.funding-toolbar {
  margin-top: 14px;
  padding: 10px;
}

.funding-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.funding-tab {
  display: inline-flex;
  min-height: 38px;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  padding: 8px 12px;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.funding-tab--active {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.funding-grid {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.funding-skeleton {
  height: 360px;
  border-radius: 16px;
}

.funding-card {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
  transition: all 0.15s ease;
}

.funding-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.funding-card__media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eef2ff;
}

.funding-card__image,
.funding-card__fallback {
  width: 100%;
  height: 100%;
}

.funding-card__image {
  object-fit: cover;
}

.funding-card__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.funding-card__badge {
  position: absolute;
  right: 12px;
  bottom: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.84);
  padding: 6px 10px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
}

.funding-card__badge--completed {
  background: rgba(22, 101, 52, 0.9);
}

.funding-card__body {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.funding-card__owner {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.funding-card__avatar {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  object-fit: cover;
}

.funding-card__avatar--empty {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 12px;
  font-weight: 900;
}

.funding-card__title {
  display: -webkit-box;
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
  text-decoration: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.funding-card__owner p,
.funding-card__description,
.funding-card__amounts {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.funding-card__description {
  display: -webkit-box;
  min-height: 42px;
  overflow: hidden;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.funding-card__progress {
  display: grid;
  gap: 8px;
}

.funding-card__amounts {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.funding-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.funding-card__metrics div {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: #f8fafc;
  padding: 7px 10px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.funding-progress {
  overflow: hidden;
  height: 9px;
  border-radius: 999px;
  background: #e2e8f0;
}

.funding-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0000ff;
}

.funding-progress--completed span {
  background: #16a34a;
}

.funding-card__actions,
.funding-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.funding-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 34px 18px;
  text-align: center;
  color: #64748b;
}

.funding-empty h2 {
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
}

.funding-empty p {
  max-width: 520px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.funding-load-more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.funding-donate {
  display: grid;
  gap: 14px;
}

.funding-donate p {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.funding-delete-copy {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

@media (min-width: 640px) {
  .funding-page {
    padding: 22px 20px 48px;
  }

  .funding-hero {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 22px;
  }

  .funding-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .funding-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
