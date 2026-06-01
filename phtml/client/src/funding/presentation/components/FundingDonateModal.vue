<template>
  <UModal
    :open="Boolean(campaign)"
    :title="t('pages.fundingPage.donateTitle')"
    :description="modalDescription"
    class="sm:max-w-2xl"
    @update:open="handleOpenChange"
  >
    <template #body>
      <UForm :state="form" class="space-y-5" @submit="submit">
        <div class="space-y-2">
          <p class="text-label-secondary text-[var(--text-primary)]">
            {{ t("pages.fundingPage.donateEyebrow") }}
          </p>
          <p class="text-body-secondary">
            {{ t("pages.fundingPage.donateDescription") }}
          </p>
        </div>

        <UAlert
          v-if="statusAlert"
          :color="statusAlert.color"
          variant="subtle"
          :icon="statusAlert.icon"
          :title="statusAlert.title"
          :description="statusAlert.description"
          class="rounded-[22px]"
          aria-live="polite"
        />

        <UCard
          v-if="campaign"
          class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]"
          :ui="{ body: 'p-4' }"
        >
          <div class="space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-black tracking-[-0.03em] text-[var(--text-primary)]">
                  {{ campaign.title }}
                </h3>
                <p class="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {{ campaign.owner }} · {{ campaign.location }}
                </p>
              </div>

              <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1.5 text-[12px] font-semibold">
                {{ campaign.categoryLabel }}
              </UBadge>
            </div>

            <FundingProgress :raised="campaign.raisedAmount" :goal="campaign.goalAmount" />
          </div>
        </UCard>

        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[12px] font-bold text-[var(--text-secondary)]">
              {{ t("pages.fundingPage.presetAmountsLabel") }}
            </p>
            <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1 text-[11px] font-semibold">
              {{ formattedAmount }}
            </UBadge>
          </div>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <UButton
              v-for="amount in amounts"
              :key="amount"
              type="button"
              :color="selectedPreset === amount ? 'primary' : 'neutral'"
              :variant="selectedPreset === amount ? 'solid' : 'outline'"
              class="justify-center rounded-[18px]"
              @click="form.amount = amount"
            >
              {{ formatMoney(amount) }}
            </UButton>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="amount"
            :label="t('pages.fundingPage.otherAmount')"
            required
            size="xl"
            class="space-y-2"
            :error="fieldErrors.amount || undefined"
          >
            <UInputNumber
              v-model="form.amount"
              :min="10000"
              :step="100000"
              orientation="vertical"
              size="xl"
              class="w-full"
              :placeholder="t('pages.fundingPage.amountPlaceholder')"
              :disabled="isBusy || !campaign"
              :ui="{ base: 'h-14 rounded-[20px] px-4 text-[15px] font-semibold' }"
            />
          </UFormField>

          <UFormField
            name="paymentMethod"
            :label="t('pages.fundingPage.paymentMethod')"
            required
            size="xl"
            class="space-y-2"
            :error="fieldErrors.paymentMethod || undefined"
          >
            <USelect
              v-model="form.paymentMethod"
              :items="paymentOptions"
              value-key="value"
              label-key="label"
              size="xl"
              color="primary"
              class="w-full"
              :disabled="isBusy || !campaign"
              :ui="{ base: 'h-14 rounded-[20px] px-4 text-[15px] font-semibold' }"
            />
          </UFormField>
        </div>

        <UFormField
          name="message"
          :label="t('pages.fundingPage.message')"
          size="xl"
          class="space-y-2"
        >
          <UTextarea
            v-model="form.message"
            autoresize
            :rows="5"
            color="primary"
            size="xl"
            class="w-full"
            :disabled="isBusy || !campaign"
            :placeholder="t('pages.fundingPage.messagePlaceholder')"
            :ui="{
              base: 'min-h-[120px] resize-y rounded-[20px] border-[var(--border-default)] bg-[var(--bg-surface-hover)] px-4 py-3 text-[14px] leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
            }"
          />
        </UFormField>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="lg"
            class="rounded-full"
            :disabled="isBusy"
            @click="emit('close')"
          >
            {{ t("pages.fundingPage.close") }}
          </UButton>

          <UButton
            type="submit"
            color="primary"
            size="lg"
            class="rounded-full"
            :loading="isBusy"
            :disabled="isBusy || !campaign"
          >
            <Icon name="i-ph-hand-heart-fill" class="mr-1.5 h-4 w-4" />
            {{ t("pages.fundingPage.donate") }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import type { DonationPayload, MockFundingCampaign } from "../../domain/types/funding.types"
import FundingProgress from "./FundingProgress.vue"

type DonateSubmitStatus = "idle" | "loading" | "success" | "error"

type DonationFormState = {
  campaignId: string
  amount: number | null
  paymentMethod: DonationPayload["paymentMethod"]
  message: string
}

const props = defineProps<{ campaign?: MockFundingCampaign | null }>()

const emit = defineEmits<{
  close: []
  donate: [payload: DonationPayload]
}>()

const { t, locale } = useI18n()
const toast = useToast()

const amounts = [100000, 300000, 500000]
const validPaymentMethods = ["wallet", "card", "bank"] as const satisfies DonationPayload["paymentMethod"][]

const form = reactive<DonationFormState>({
  campaignId: "",
  amount: 300000,
  paymentMethod: "wallet",
  message: "",
})

const fieldErrors = reactive({
  amount: "",
  paymentMethod: "",
})

const submitStatus = ref<DonateSubmitStatus>("idle")

const paymentOptions = computed(() => [
  { label: t("pages.fundingPage.paymentWallet"), value: "wallet" },
  { label: t("pages.fundingPage.paymentCard"), value: "card" },
  { label: t("pages.fundingPage.paymentBank"), value: "bank" },
])

const modalDescription = computed(() => {
  if (!props.campaign) return t("pages.fundingPage.donateDescription")

  return t("pages.fundingPage.donateModalDescription", {
    title: props.campaign.title,
  })
})

const isBusy = computed(() => submitStatus.value === "loading")

const formatMoney = (amount: number) =>
  formatCurrency(amount, {
    currency: "VND",
    locale: locale.value,
  })

const formattedAmount = computed(() =>
  formatMoney(form.amount ?? 0),
)

const selectedPreset = computed(() =>
  amounts.find(amount => amount === form.amount) ?? null,
)

const statusAlert = computed(() => {
  if (submitStatus.value === "idle") return null

  if (submitStatus.value === "loading") {
    return {
      color: "primary" as const,
      icon: "i-ph-spinner-gap-bold",
      title: t("pages.fundingPage.donateStatusLoadingTitle"),
      description: t("pages.fundingPage.donateStatusLoadingDescription"),
    }
  }

  if (submitStatus.value === "success") {
    return {
      color: "success" as const,
      icon: "i-ph-check-circle-fill",
      title: t("pages.fundingPage.donateStatusSuccessTitle"),
      description: t("pages.fundingPage.donateStatusSuccessDescription"),
    }
  }

  return {
    color: "warning" as const,
    icon: "i-ph-warning-circle-fill",
    title: t("pages.fundingPage.donateStatusErrorTitle"),
    description: t("pages.fundingPage.donateStatusErrorDescription"),
  }
})

watch(
  () => props.campaign?.id,
  (campaignId) => {
    resetForm(campaignId ?? "")
  },
  { immediate: true },
)

watch(
  () => [form.amount, form.paymentMethod, form.message],
  () => {
    if (submitStatus.value !== "loading") {
      submitStatus.value = "idle"
    }

    clearErrors()
  },
)

function handleOpenChange(nextOpen: boolean) {
  if (!nextOpen) {
    emit("close")
  }
}

function clearErrors() {
  fieldErrors.amount = ""
  fieldErrors.paymentMethod = ""
}

function resetForm(campaignId: string) {
  form.campaignId = campaignId
  form.amount = 300000
  form.paymentMethod = "wallet"
  form.message = ""
  clearErrors()
  submitStatus.value = "idle"
}

function validateForm() {
  clearErrors()

  if (!form.amount || form.amount < 10000) {
    fieldErrors.amount = t("pages.fundingPage.amountError")
  }

  if (!validPaymentMethods.includes(form.paymentMethod)) {
    fieldErrors.paymentMethod = t("pages.fundingPage.paymentMethodError")
  }

  return !fieldErrors.amount && !fieldErrors.paymentMethod
}

async function submit() {
  if (!props.campaign || !validateForm()) {
    submitStatus.value = "error"
    return
  }

  submitStatus.value = "loading"

  await new Promise(resolve => setTimeout(resolve, 240))

  emit("donate", {
    campaignId: props.campaign.id,
    amount: form.amount ?? 0,
    paymentMethod: form.paymentMethod,
    message: form.message.trim(),
  })

  submitStatus.value = "success"

  toast.add({
    color: "success",
    icon: "i-ph-check-circle-fill",
    title: t("pages.fundingPage.donateStatusSuccessTitle"),
    description: t("pages.fundingPage.donateStatusSuccessDescription"),
  })
}
</script>
