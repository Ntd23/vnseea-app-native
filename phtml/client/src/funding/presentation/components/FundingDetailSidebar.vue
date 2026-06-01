<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start gap-3">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-black text-white"
          :style="{ background: campaign.ownerGradient }"
        >
          {{ campaign.ownerInitials }}
        </div>

        <div class="min-w-0">
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.showFundPage.ownerEyebrow") }}
          </p>
          <p class="truncate text-[18px] font-black text-[var(--text-primary)]">
            {{ campaign.owner }}
          </p>
          <p class="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {{ t("pages.showFundPage.ownerDescription") }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1.5 text-[11px] font-bold">
          {{ campaign.categoryLabel }}
        </UBadge>
        <UBadge
          v-if="campaign.isOwner"
          color="neutral"
          variant="soft"
          class="rounded-full px-3 py-1.5 text-[11px] font-bold"
        >
          {{ t("pages.fundingPage.ownerBadge") }}
        </UBadge>
      </div>

      <UButton
        type="button"
        color="primary"
        size="lg"
        class="mt-4 w-full justify-center rounded-[18px]"
        @click="emit('donate', campaign)"
      >
        <Icon name="i-ph-hand-heart-fill" class="mr-1.5 h-4 w-4" />
        {{ t("pages.fundingPage.donate") }}
      </UButton>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-4' }">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.showFundPage.donorsEyebrow") }}
          </p>
          <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {{ t("pages.showFundPage.supportersDescription") }}
          </p>
        </div>

        <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1.5 text-[11px] font-bold">
          {{ campaign.donors.length }}
        </UBadge>
      </div>

      <div v-if="campaign.donors.length > 0" class="mt-4 space-y-3">
        <div
          v-for="donor in campaign.donors"
          :key="donor.id"
          class="rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-3"
        >
          <div class="flex gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white"
              :style="{ background: donor.gradient }"
            >
              {{ donor.initials }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="truncate text-[13px] font-bold text-[var(--text-primary)]">
                  {{ donor.name }}
                </p>
                <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1 text-[11px] font-bold">
                  {{ formatMoney(donor.amount) }}
                </UBadge>
              </div>

              <p class="mt-1 text-[11px] font-semibold text-[var(--text-tertiary)]">
                {{ donor.donatedAt }}
              </p>
              <p class="mt-2 text-[12px] leading-6 text-[var(--text-secondary)]">
                {{ donor.message }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <FoundationEmptyState
        v-else
        class="mt-4 rounded-[24px] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4"
        icon="i-ph-users-three-fill"
        :title="t('pages.showFundPage.supportersEmptyTitle')"
        :description="t('pages.showFundPage.supportersEmptyDescription')"
      />
    </UCard>

    <UCard
      v-if="campaign.isOwner"
      class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]"
      :ui="{ body: 'p-4' }"
    >
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ t("pages.showFundPage.managementEyebrow") }}
      </p>
      <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {{ t("pages.showFundPage.managementDescription") }}
      </p>

      <UAlert
        class="mt-4 rounded-[22px]"
        :color="managementAlert.color"
        variant="subtle"
        :icon="managementAlert.icon"
        :title="managementAlert.title"
        :description="managementAlert.description"
      />

      <div class="mt-4 grid gap-2">
        <UButton
          type="button"
          color="primary"
          variant="soft"
          class="justify-center rounded-[18px]"
          :loading="isActionLoading('edit')"
          :disabled="isBusy"
          @click="runManagementAction('edit')"
        >
          {{ t("pages.showFundPage.edit") }}
        </UButton>

        <UButton
          type="button"
          color="neutral"
          variant="outline"
          class="justify-center rounded-[18px]"
          :loading="isActionLoading('delete')"
          :disabled="isBusy"
          @click="runManagementAction('delete')"
        >
          {{ t("pages.showFundPage.delete") }}
        </UButton>
      </div>
    </UCard>
  </aside>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import type { MockFundingCampaign } from "../../domain/types/funding.types"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"

type ManagementAction = "edit" | "delete" | null
type ManagementStatus = "idle" | "loading" | "success" | "error"

const props = defineProps<{ campaign: MockFundingCampaign }>()

const emit = defineEmits<{ donate: [campaign: MockFundingCampaign] }>()

const { t, locale } = useI18n()
const toast = useToast()

const formatMoney = (amount: number) =>
  formatCurrency(amount, {
    currency: "VND",
    locale: locale.value,
  })

const managementAction = ref<ManagementAction>(null)
const managementStatus = ref<ManagementStatus>("idle")

const isBusy = computed(() => managementStatus.value === "loading")

const managementAlert = computed(() => {
  if (managementStatus.value === "loading") {
    return {
      color: "primary" as const,
      icon: "i-ph-spinner-gap-bold",
      title: t("pages.showFundPage.manageStatusLoadingTitle"),
      description: t("pages.showFundPage.manageStatusLoadingDescription"),
    }
  }

  if (managementStatus.value === "success") {
    if (managementAction.value === "delete") {
      return {
        color: "success" as const,
        icon: "i-ph-check-circle-fill",
        title: t("pages.showFundPage.manageDeleteSuccessTitle"),
        description: t("pages.showFundPage.manageDeleteSuccessDescription"),
      }
    }

    return {
      color: "success" as const,
      icon: "i-ph-check-circle-fill",
      title: t("pages.showFundPage.manageEditSuccessTitle"),
      description: t("pages.showFundPage.manageEditSuccessDescription"),
    }
  }

  if (managementStatus.value === "error") {
    return {
      color: "warning" as const,
      icon: "i-ph-warning-circle-fill",
      title: t("pages.showFundPage.manageErrorTitle"),
      description: t("pages.showFundPage.manageErrorDescription"),
    }
  }

  return {
    color: "neutral" as const,
    icon: "i-ph-sliders-fill",
    title: t("pages.showFundPage.manageStatusIdleTitle"),
    description: t("pages.showFundPage.manageStatusIdleDescription"),
  }
})

watch(
  () => props.campaign.id,
  () => {
    managementAction.value = null
    managementStatus.value = "idle"
  },
  { immediate: true },
)

function isActionLoading(action: Exclude<ManagementAction, null>) {
  return isBusy.value && managementAction.value === action
}

async function runManagementAction(action: Exclude<ManagementAction, null>) {
  managementAction.value = action
  managementStatus.value = "loading"

  try {
    await new Promise(resolve => setTimeout(resolve, 240))

    managementStatus.value = "success"

    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: action === "delete"
        ? t("pages.showFundPage.manageDeleteSuccessTitle")
        : t("pages.showFundPage.manageEditSuccessTitle"),
      description: action === "delete"
        ? t("pages.showFundPage.manageDeleteSuccessDescription")
        : t("pages.showFundPage.manageEditSuccessDescription"),
    })
  }
  catch {
    managementStatus.value = "error"
  }
}
</script>
