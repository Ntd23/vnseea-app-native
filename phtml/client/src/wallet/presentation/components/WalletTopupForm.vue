<!-- English description: Backend-backed wallet top-up form for redirect and bank-transfer methods. -->
<template>
  <section class="wallet-topup-form">
    <div v-if="methods.length" class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="method in methods"
          :key="method.value"
          type="button"
          class="wallet-topup-form__method"
          :class="{ 'wallet-topup-form__method--active': method.value === draft.method }"
          @click="selectMethod(method.value)"
        >
          <span class="wallet-topup-form__method-icon">
            <Icon :name="methodIcon(method.value, method.type)" class="h-5 w-5" />
          </span>
          <span class="min-w-0">
            <span class="block text-title-primary">{{ method.label }}</span>
            <span class="block text-caption-secondary">
              {{ methodHint(method) }}
            </span>
          </span>
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <UFormField :label="t('pages.walletPage.amountLabel')">
        <UInputNumber
          v-model="draft.amount"
          :min="1"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('pages.walletPage.topupMethod')">
        <USelect
          v-model="draft.method"
          :items="methods"
          label-key="label"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      </div>
    </div>

    <UAlert
      v-else
      class="mt-5 rounded-2xl"
      color="warning"
      variant="subtle"
      :description="t('pages.walletPage.noTopupMethods')"
    />

    <div v-if="selectedMethod?.type === 'upload'" class="mt-5 space-y-3">
      <UFormField :label="t('pages.walletPage.receipt')">
        <input
          class="block w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-body-primary"
          type="file"
          accept="image/*"
          @change="onReceiptChange"
        >
      </UFormField>
      <p v-if="selectedMethod.note" class="text-caption-secondary">
        {{ selectedMethod.note }}
      </p>
    </div>

    <UAlert
      v-if="localError"
      class="mt-5 rounded-2xl"
      color="error"
      variant="subtle"
      :description="localError"
    />

    <UButton
      class="mt-6 rounded-full font-semibold"
      color="primary"
      :loading="submitting"
      :disabled="!methods.length || draft.amount <= 0"
      @click="submit"
    >
      {{ t("pages.walletPage.topupSubmit") }}
    </UButton>
  </section>
</template>

<script setup lang="ts">
import type {
  WalletTopupDraft,
  WalletTopupMethod,
} from "../../domain/types/wallet.types"

const props = defineProps<{
  methods: WalletTopupMethod[]
  submitting: boolean
}>()

const emit = defineEmits<{
  topup: [payload: WalletTopupDraft]
}>()

const { t } = useI18n()
const receiptFile = ref<File | null>(null)
const localError = ref("")
const draft = reactive<WalletTopupDraft>({
  amount: 0,
  method: "",
})

const selectedMethod = computed(() =>
  props.methods.find(method => method.value === draft.method) ?? null,
)

watch(
  () => props.methods,
  (methods) => {
    if (!draft.method && methods.length) {
      draft.method = methods[0].value
    }

    if (draft.method && !methods.some(method => method.value === draft.method)) {
      draft.method = methods[0]?.value ?? ""
    }
  },
  { immediate: true },
)

function onReceiptChange(event: Event) {
  const input = event.target as HTMLInputElement
  receiptFile.value = input.files?.[0] ?? null
  localError.value = ""
}

function selectMethod(method: string) {
  draft.method = method
  receiptFile.value = null
  localError.value = ""
}

function methodIcon(value: string, type: WalletTopupMethod["type"]) {
  if (value === "sepay" || type === "qr") return "i-ph-qr-code-duotone"
  if (value === "paypal") return "i-ph-paypal-logo-duotone"
  if (type === "upload") return "i-ph-bank-duotone"
  return "i-ph-arrow-square-out-duotone"
}

function methodHint(method: WalletTopupMethod) {
  if (method.value === "sepay" || method.type === "qr") return t("pages.walletPage.sepayHint")
  if (method.type === "upload") return t("pages.walletPage.bankTransferHint")
  return t("pages.walletPage.redirectHint")
}

function submit() {
  localError.value = ""

  if (!draft.method || draft.amount <= 0) return

  if (selectedMethod.value?.type === "upload" && !receiptFile.value) {
    localError.value = t("pages.walletPage.errorReceipt")
    return
  }

  emit("topup", {
    amount: draft.amount,
    method: draft.method,
    receiptFile: selectedMethod.value?.type === "upload" ? receiptFile.value : null,
  })
}
</script>

<style scoped>
.wallet-topup-form {
  padding: 2px;
}

.wallet-topup-form__method {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 80px;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px 14px;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  text-align: left;
  transition: all 0.15s ease;
}

.wallet-topup-form__method > * {
  pointer-events: none;
}

.wallet-topup-form__method:hover {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.03);
}

.wallet-topup-form__method--active {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.05);
}

.wallet-topup-form__method-icon {
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f1f5f9;
  color: #0000ff;
}
</style>
