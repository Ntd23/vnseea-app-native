<template>
  <section class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.showFundPage.progressEyebrow") }}
          </p>
          <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {{ t("pages.showFundPage.progressDescription") }}
          </p>
        </div>

        <UBadge :color="statusColor" variant="subtle" class="rounded-full px-3 py-1.5 text-[12px] font-bold">
          {{ statusLabel }}
        </UBadge>
      </div>

      <div class="mt-4 rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
        <FundingProgress :raised="campaign.raisedAmount" :goal="campaign.goalAmount" />
      </div>

      <UAlert
        class="mt-4 rounded-[22px]"
        color="neutral"
        variant="subtle"
        icon="i-ph-map-pin-fill"
        :title="t('pages.showFundPage.locationLabel')"
        :description="campaign.location"
      />

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.showFundPage.raisedLabel") }}
          </p>
          <p class="mt-1 text-[1.25rem] font-black text-[var(--text-primary)]">
            {{ formatMoney(campaign.raisedAmount) }}
          </p>
        </div>

        <div class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.showFundPage.goalLabel") }}
          </p>
          <p class="mt-1 text-[1.25rem] font-black text-[var(--text-primary)]">
            {{ formatMoney(campaign.goalAmount) }}
          </p>
        </div>

        <div class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.showFundPage.backersLabel") }}
          </p>
          <p class="mt-1 text-[1.25rem] font-black text-[var(--text-primary)]">
            {{ campaign.backers }}
          </p>
        </div>

        <div class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ t("pages.showFundPage.daysLeftLabel") }}
          </p>
          <p class="mt-1 text-[1.25rem] font-black text-[var(--text-primary)]">
            {{ campaign.daysLeft }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.showFundPage.descriptionEyebrow") }}
      </p>
      <p class="mt-3 text-[15px] leading-8 text-[var(--text-secondary)]">
        {{ campaign.description }}
      </p>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.showFundPage.impactEyebrow") }}
      </p>
      <ul class="mt-4 space-y-3">
        <li
          v-for="item in campaign.impact"
          :key="item"
          class="flex gap-3 rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4 text-[14px] leading-7 text-[var(--text-secondary)]"
        >
          <Icon name="i-ph-check-circle-fill" class="mt-1 h-4 w-4 shrink-0 text-[var(--color-success)]" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.showFundPage.rewardsEyebrow") }}
      </p>
      <h2 class="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--text-primary)]">
        {{ t("pages.showFundPage.rewardsTitle") }}
      </h2>
      <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {{ t("pages.showFundPage.rewardsDescription") }}
      </p>

      <div class="mt-4 grid gap-3">
        <div
          v-for="reward in campaign.rewards"
          :key="reward"
          class="rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4"
        >
          <div class="flex gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-50)] text-[var(--text-primary)]">
              <Icon name="i-ph-gift-fill" class="h-5 w-5" />
            </div>
            <p class="text-[14px] font-semibold leading-7 text-[var(--text-secondary)]">
              {{ reward }}
            </p>
          </div>
        </div>
      </div>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import type { MockFundingCampaign } from "../../domain/types/funding.types"
import FundingProgress from "./FundingProgress.vue"

type StatusColor = "primary" | "warning" | "success"

const props = defineProps<{ campaign: MockFundingCampaign }>()

const { t, locale } = useI18n()

const formatMoney = (amount: number) =>
  formatCurrency(amount, {
    currency: "VND",
    locale: locale.value,
  })

const statusLabel = computed(() => {
  if (props.campaign.status === "ending") return t("pages.fundingPage.statusEnding")
  if (props.campaign.status === "funded") return t("pages.fundingPage.statusFunded")
  return t("pages.fundingPage.statusActive")
})

const statusColor = computed<StatusColor>(() => {
  if (props.campaign.status === "ending") return "warning"
  if (props.campaign.status === "funded") return "success"
  return "primary"
})
</script>
