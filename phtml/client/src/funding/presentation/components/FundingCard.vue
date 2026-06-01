<template>
  <article>
    <UCard
      class="group h-full overflow-hidden rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]"
      :ui="{ body: 'p-0' }"
    >
      <div class="relative aspect-[16/10] overflow-hidden bg-[var(--bg-surface-hover)]">
        <div class="absolute inset-0" :style="{ background: campaign.coverFallback }" />

        <NuxtImg
          v-if="showCover"
          :src="campaign.cover"
          :alt="campaign.title"
          width="960"
          height="600"
          loading="lazy"
          format="webp"
          densities="x1 x2"
          sizes="(max-width: 1024px) 100vw, 50vw"
          class="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          @error="showCover = false"
        />

        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_10%,rgba(15,23,42,0.82)_100%)]" />

        <div class="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
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

        <div class="absolute inset-x-4 bottom-4">
          <NuxtLink :to="detailHref" class="inline-block max-w-full">
            <h3 class="line-clamp-2 text-[1.2rem] font-black leading-tight text-white">
              {{ campaign.title }}
            </h3>
          </NuxtLink>
          <p class="mt-2 text-[12px] font-semibold text-white/78">
            {{ campaign.owner }} · {{ campaign.location }}
          </p>
        </div>
      </div>

      <div class="space-y-5 p-4 sm:p-5">
        <p class="min-h-[72px] text-[13px] font-semibold leading-6 text-[var(--text-secondary)]">
          {{ campaign.summary }}
        </p>

        <div class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
          <FundingProgress :raised="campaign.raisedAmount" :goal="campaign.goalAmount" />
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[13px] font-black text-[var(--text-primary)]">{{ campaign.backers }}</p>
            <p class="text-[11px] font-semibold text-[var(--text-tertiary)]">{{ t("pages.fundingPage.backersLabel") }}</p>
          </div>
          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[13px] font-black text-[var(--text-primary)]">{{ campaign.daysLeft }}</p>
            <p class="text-[11px] font-semibold text-[var(--text-tertiary)]">{{ t("pages.fundingPage.daysLabel") }}</p>
          </div>
          <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3">
            <p class="text-[13px] font-black text-[var(--text-primary)]">{{ campaign.donors.length }}</p>
            <p class="text-[11px] font-semibold text-[var(--text-tertiary)]">{{ t("pages.fundingPage.donorsLabel") }}</p>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <UButton
            type="button"
            color="primary"
            size="lg"
            class="justify-center rounded-[18px]"
            @click="emit('donate', campaign)"
          >
            <Icon name="i-ph-hand-heart-fill" class="mr-1.5 h-4 w-4" />
            {{ t("pages.fundingPage.donate") }}
          </UButton>

          <UButton
            :to="detailHref"
            color="neutral"
            variant="outline"
            size="lg"
            class="justify-center rounded-[18px]"
          >
            {{ t("pages.fundingPage.detail") }}
          </UButton>
        </div>
      </div>
    </UCard>
  </article>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type { MockFundingCampaign } from "../../domain/types/funding.types"
import FundingProgress from "./FundingProgress.vue"

type StatusColor = "primary" | "warning" | "success"

const props = defineProps<{ campaign: MockFundingCampaign }>()

const emit = defineEmits<{ donate: [campaign: MockFundingCampaign] }>()

const { t } = useI18n()

const showCover = ref(true)

const detailHref = computed(() => appRoutes.showFund(props.campaign.id))

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

watch(
  () => props.campaign.id,
  () => {
    showCover.value = true
  },
  { immediate: true },
)
</script>
