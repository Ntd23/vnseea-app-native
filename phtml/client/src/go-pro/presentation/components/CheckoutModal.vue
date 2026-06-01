<template>
  <FoundationModalShell
    :open="Boolean(plan)"
    :title="modalTitle"
    :description="modalDescription"
    size="lg"
    :status="submitStatus"
    :status-title="statusTitle"
    :status-description="statusDescription"
    body-class="space-y-5"
    @close="emit('close')"
  >
    <UForm :state="form" class="space-y-5" @submit="submit">
      <div class="space-y-2">
        <p class="text-label-secondary text-[var(--text-primary)]">
          {{ t("pages.goProPage.checkoutEyebrow") }}
        </p>
        <p class="text-body-secondary">
          {{ t("pages.goProPage.checkoutHelper") }}
        </p>
      </div>

      <UCard
        v-if="plan"
        class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]"
        :ui="{ body: 'p-4' }"
      >
        <div class="space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-black tracking-[-0.03em] text-[var(--text-primary)]">
                {{ plan.name }}
              </h3>
              <p class="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                {{ billingCycle === "monthly" ? t("pages.goProPage.checkoutMonthly") : t("pages.goProPage.checkoutYearly") }}
              </p>
            </div>

            <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1.5 text-[12px] font-semibold">
              {{ plan.badge }}
            </UBadge>
          </div>

          <div class="rounded-[20px] border border-[var(--border-default)] bg-white p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {{ t("pages.goProPage.totalPayment") }}
              </p>
              <p class="text-[1.6rem] font-black text-[var(--text-primary)]">
                {{ formatProCurrency(amount, locale) }}
              </p>
            </div>
            <p class="mt-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              {{ t("pages.goProPage.mockPaymentNote") }}
            </p>
          </div>
        </div>
      </UCard>

      <UFormField
        name="paymentMethod"
        :label="t('pages.goProPage.paymentMethodLabel')"
        required
        size="xl"
        class="space-y-3"
        :error="fieldErrors.paymentMethod || undefined"
      >
        <URadioGroup
          v-model="form.paymentMethod"
          :items="paymentMethods"
          value-key="value"
          label-key="label"
          color="primary"
          variant="card"
          indicator="end"
          size="xl"
          :disabled="isBusy || !plan"
          :ui="radioGroupUi"
        >
          <template #legend>
            <span class="sr-only">{{ t("pages.goProPage.paymentMethodLabel") }}</span>
          </template>

          <template #label="{ item }">
            <span class="inline-flex items-center gap-2 text-[0.98rem] font-semibold text-[var(--text-primary)]">
              <Icon :name="item.icon" class="h-5 w-5 shrink-0 text-[var(--text-primary)]" />
              {{ item.label }}
            </span>
          </template>
        </URadioGroup>
      </UFormField>

      <UCheckbox
        v-model="form.agree"
        :label="t('pages.goProPage.agreementLabel')"
        color="primary"
        :disabled="isBusy || !plan"
      />
      <p v-if="fieldErrors.agree" class="text-sm font-medium text-rose-600">
        {{ fieldErrors.agree }}
      </p>

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
          {{ t("pages.goProPage.close") }}
        </UButton>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          class="rounded-full"
          :loading="isBusy"
          :disabled="isBusy || !plan"
        >
          <Icon name="i-ph-lock-key-fill" class="mr-1.5 h-4 w-4" />
          {{ t("pages.goProPage.pay") }}
        </UButton>
      </div>
    </UForm>
  </FoundationModalShell>
</template>

<script setup lang="ts">
import FoundationModalShell from "../../../foundation/presentation/components/ModalShell.vue"
import type { BillingCycle, PaymentMethodKey, ProCheckoutPayload, ProPaymentMethod, ProPlan } from "../../domain/types/go-pro.types"
import { formatProCurrency, getProPlanPrice, paymentMethodKeys } from "../../infrastructure/mocks/goProCatalog"

type CheckoutSubmitStatus = "idle" | "loading" | "success" | "error"

type CheckoutFormState = {
  paymentMethod: PaymentMethodKey
  agree: boolean
}

const props = defineProps<{
  plan?: ProPlan | null
  billingCycle: BillingCycle
  paymentMethods: ReadonlyArray<ProPaymentMethod>
}>()

const emit = defineEmits<{
  close: []
  checkout: [payload: ProCheckoutPayload]
}>()

const { t, locale } = useI18n()
const toast = useToast()

const form = reactive<CheckoutFormState>({
  paymentMethod: "wallet",
  agree: false,
})

const fieldErrors = reactive({
  paymentMethod: "",
  agree: "",
})

const submitStatus = ref<CheckoutSubmitStatus>("idle")

const isBusy = computed(() => submitStatus.value === "loading")

const modalTitle = computed(() => {
  if (!props.plan) return t("pages.goProPage.checkoutTitle")

  return t("pages.goProPage.checkoutTitlePlan", {
    plan: props.plan.name,
  })
})

const modalDescription = computed(() => {
  if (!props.plan) return t("pages.goProPage.checkoutDescription")

  return t("pages.goProPage.checkoutDescriptionPlan", {
    plan: props.plan.name,
  })
})

const amount = computed(() => {
  if (!props.plan) return 0
  return getProPlanPrice(props.plan, props.billingCycle)
})

const statusTitle = computed(() => {
  if (submitStatus.value === "loading") return t("pages.goProPage.checkoutStatusLoadingTitle")
  if (submitStatus.value === "success") return t("pages.goProPage.checkoutStatusSuccessTitle")
  if (submitStatus.value === "error") return t("pages.goProPage.checkoutStatusErrorTitle")
  return ""
})

const statusDescription = computed(() => {
  if (submitStatus.value === "loading") return t("pages.goProPage.checkoutStatusLoadingDescription")
  if (submitStatus.value === "success") return t("pages.goProPage.checkoutStatusSuccessDescription")
  if (submitStatus.value === "error") return t("pages.goProPage.checkoutStatusErrorDescription")
  return ""
})

const radioGroupUi = {
  fieldset: "grid grid-cols-1 gap-3 sm:grid-cols-3",
  item: "min-h-[5rem] items-start rounded-[1.15rem] border px-4 py-4 transition",
  container: "h-full",
  wrapper: "flex-1",
  label: "text-[0.98rem] font-semibold",
  base: "size-5 ring-[var(--border-default)] bg-white data-[state=checked]:ring-[var(--color-primary-500)]",
}

watch(
  () => props.plan?.id,
  (planId) => {
    resetForm()

    if (!planId) {
      submitStatus.value = "idle"
    }
  },
  { immediate: true },
)

watch(
  () => [form.paymentMethod, form.agree],
  () => {
    if (submitStatus.value !== "loading") {
      submitStatus.value = "idle"
    }

    clearErrors()
  },
)

async function submit() {
  if (!props.plan) return

  clearErrors()

  if (!paymentMethodKeys.includes(form.paymentMethod)) {
    fieldErrors.paymentMethod = t("pages.goProPage.paymentMethodError")
  }

  if (!form.agree) {
    fieldErrors.agree = t("pages.goProPage.agreementError")
  }

  if (fieldErrors.paymentMethod || fieldErrors.agree) {
    submitStatus.value = "error"
    return
  }

  submitStatus.value = "loading"

  await new Promise(resolve => setTimeout(resolve, 320))

  if (!props.plan) return

  submitStatus.value = "success"

  emit("checkout", {
    planId: props.plan.id,
    billingCycle: props.billingCycle,
    paymentMethod: form.paymentMethod,
    amount: amount.value,
  })

  toast.add({
    title: t("pages.goProPage.checkoutToastTitle"),
    description: t("pages.goProPage.checkoutToastDescription", {
      plan: props.plan.name,
      amount: formatProCurrency(amount.value, locale.value),
    }),
    color: "success",
    icon: "i-ph-check-circle-fill",
  })

  setTimeout(() => {
    emit("close")
  }, 220)
}

function clearErrors() {
  fieldErrors.paymentMethod = ""
  fieldErrors.agree = ""
}

function resetForm() {
  form.paymentMethod = "wallet"
  form.agree = false
  clearErrors()
  submitStatus.value = "idle"
}
</script>
