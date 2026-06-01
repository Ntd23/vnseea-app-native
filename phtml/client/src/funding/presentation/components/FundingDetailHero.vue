<template>
  <article>
    <UCard
      class="overflow-hidden rounded-[32px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-lg)]"
      :ui="{ body: 'p-0' }"
    >
      <div class="relative min-h-[380px] overflow-hidden sm:min-h-[460px]">
        <div class="absolute inset-0" :style="{ background: campaign.coverFallback }" />

        <NuxtImg
          v-if="showCover"
          :src="campaign.cover"
          :alt="campaign.title"
          width="1600"
          height="900"
          loading="eager"
          format="webp"
          densities="x1 x2"
          sizes="100vw"
          class="absolute inset-0 h-full w-full object-cover"
          @error="showCover = false"
        />

        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12)_5%,rgba(15,23,42,0.84)_100%)]" />
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

        <div class="relative z-10 flex min-h-[380px] flex-col justify-between p-5 text-white sm:min-h-[460px] sm:p-7 lg:p-8">
          <div class="flex flex-wrap gap-2">
            <UBadge color="neutral" variant="soft" class="rounded-full border border-white/15 bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white">
              {{ campaign.categoryLabel }}
            </UBadge>
            <UBadge :color="statusColor" variant="solid" class="rounded-full px-3 py-1.5 text-[11px] font-bold">
              {{ statusLabel }}
            </UBadge>
            <UBadge
              v-if="campaign.isFeatured"
              color="warning"
              variant="solid"
              class="rounded-full px-3 py-1.5 text-[11px] font-bold"
            >
              {{ t("pages.fundingPage.featuredBadge") }}
            </UBadge>
            <UBadge
              v-if="campaign.isOwner"
              color="neutral"
              variant="soft"
              class="rounded-full border border-white/15 bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white"
            >
              {{ t("pages.fundingPage.ownerBadge") }}
            </UBadge>
          </div>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
            <div>
              <p class="text-sm font-semibold text-white/80">
                {{ campaign.owner }} · {{ campaign.location }}
              </p>
              <h1 class="mt-4 max-w-[820px] text-[2rem] font-black leading-tight tracking-[-0.05em] text-white sm:text-[3rem]">
                {{ campaign.title }}
              </h1>
              <p class="mt-3 max-w-[720px] text-[15px] leading-7 text-white/84">
                {{ campaign.summary }}
              </p>

              <div class="mt-6 flex flex-wrap gap-3">
                <UButton
                  type="button"
                  color="neutral"
                  variant="solid"
                  size="xl"
                  class="rounded-full bg-white text-[var(--text-primary)]"
                  @click="emit('donate', campaign)"
                >
                  <Icon name="i-ph-hand-heart-fill" class="mr-2 h-4 w-4" />
                  {{ t("pages.showFundPage.donateNow") }}
                </UButton>

                <UButton
                  :to="appRoutes.funding"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  class="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  {{ t("pages.showFundPage.backToFundingShort") }}
                </UButton>
              </div>
            </div>

            <UCard
              class="rounded-[24px] border border-white/15 bg-white/12 backdrop-blur-[8px]"
              :ui="{ body: 'p-4' }"
            >
              <UAlert
                :color="statusColor"
                variant="subtle"
                icon="i-ph-flag-banner-fold-fill"
                :title="t('pages.showFundPage.statusTitle')"
                :description="statusDescription"
                class="rounded-[20px]"
              />

              <div class="mt-4 rounded-[20px] border border-white/15 bg-white/10 p-4">
                <FundingProgress :raised="campaign.raisedAmount" :goal="campaign.goalAmount" />
              </div>

              <div class="mt-4 grid grid-cols-2 gap-2">
                <div class="rounded-[18px] border border-white/15 bg-white/10 p-3">
                  <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">
                    {{ t("pages.showFundPage.raisedLabel") }}
                  </p>
                  <p class="mt-1 text-[15px] font-black text-white">
                    {{ formatMoney(campaign.raisedAmount) }}
                  </p>
                </div>

                <div class="rounded-[18px] border border-white/15 bg-white/10 p-3">
                  <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">
                    {{ t("pages.showFundPage.goalLabel") }}
                  </p>
                  <p class="mt-1 text-[15px] font-black text-white">
                    {{ formatMoney(campaign.goalAmount) }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </UCard>
  </article>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import type { MockFundingCampaign } from "../../domain/types/funding.types"
import FundingProgress from "./FundingProgress.vue"

type StatusColor = "primary" | "warning" | "success"

const props = defineProps<{ campaign: MockFundingCampaign }>()

const emit = defineEmits<{ donate: [campaign: MockFundingCampaign] }>()

const { t, locale } = useI18n()

const showCover = ref(true)

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

const statusDescription = computed(() => {
  if (props.campaign.status === "ending") return t("pages.showFundPage.statusDescriptionEnding")
  if (props.campaign.status === "funded") return t("pages.showFundPage.statusDescriptionFunded")
  return t("pages.showFundPage.statusDescriptionActive")
})

watch(
  () => props.campaign.id,
  () => {
    showCover.value = true
  },
  { immediate: true },
)
</script>
