<template>
  <UForm
    :state="form"
    :validate="validateForm"
    class="sf-card"
    @submit="saveAddress"
    @error="handleFormError"
  >
    <div class="sf-heading-row">
      <h2 class="sf-heading">{{ isUsingSavedAddress ? $t("checkout.shippingForm.shippingAddress") : (form.id ? $t("checkout.shippingForm.editAddress") : $t("checkout.shippingForm.addAddressTitle")) }}</h2>
      <button type="button" class="sf-change-address" @click="emit('change-address')">
        {{ $t("checkout.shippingForm.changeAddress") }}
      </button>
    </div>

    <!-- HÌNH THỨC HIỂN THỊ ĐỊA CHỈ ĐANG DÙNG (SELECTED/SAVED ADDRESS) -->
    <div v-if="isUsingSavedAddress" class="sf-active-address-card animate-fade-in">
      <div class="sf-active-address-header">
        <span class="sf-active-address-name">{{ form.fullName }}</span>
        <span class="sf-active-address-badge">{{ $t("checkout.shippingForm.inUseBadge") }}</span>

        <div class="sf-active-address-actions">
          <button
            type="button"
            class="sf-active-address-action-btn edit"
            @click="isUsingSavedAddress = false"
            :title="$t('checkout.shippingForm.editAddress')"
          >
            <Icon name="i-ph-pencil-simple-line-bold" class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="sf-active-address-action-btn delete"
            @click="onDeleteActiveAddress"
            :title="$t('checkout.shippingForm.deleteAddress')"
          >
            <Icon name="i-ph-trash-bold" class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div class="sf-active-address-phone">
        <Icon name="i-ph-phone-bold" class="h-4 w-4 text-[#4361ee]" />
        <span>{{ form.phone }}</span>
      </div>
      <div class="sf-active-address-detail">
        <Icon name="i-ph-map-pin-bold" class="h-4 w-4 text-[#4361ee] mt-0.5" />
        <span>
          {{ formattedActiveAddress }}
        </span>
      </div>
    </div>

    <!-- HÌNH THỨC NHẬP ĐỊA CHỈ MỚI -->
    <div v-else class="space-y-4">
      <UAlert
        v-if="statusAlert"
        :color="statusAlert.color"
        variant="subtle"
        :icon="statusAlert.icon"
        :title="statusAlert.title"
        :description="statusAlert.description"
        class="sf-alert"
        aria-live="polite"
      />

      <!-- Họ và tên -->
      <UFormField name="fullName" class="sf-field">
        <template #label>
          <span class="sf-label">{{ $t("checkout.shippingForm.fullName") }} <span class="sf-req">*</span></span>
        </template>
        <UInput
          ref="fullNameInputRef"
          v-model="form.fullName"
          autocomplete="name"
          :placeholder="$t('checkout.shippingForm.fullNamePlaceholder')"
          :disabled="isBusy"
          class="w-full"
          size="xl"
          :ui="inputUi"
        />
      </UFormField>

      <!-- Số điện thoại -->
      <UFormField name="phone" class="sf-field">
        <template #label>
          <span class="sf-label">{{ $t("checkout.shippingForm.phone") }} <span class="sf-req">*</span></span>
        </template>
        <UInput
          v-model="form.phone"
          autocomplete="tel"
          type="tel"
          :placeholder="$t('checkout.shippingForm.phonePlaceholder')"
          :disabled="isBusy"
          class="w-full"
          size="xl"
          :ui="inputUi"
        />
      </UFormField>

      <!-- Quốc gia -->
      <UFormField name="country" class="sf-field">
        <template #label>
          <span class="sf-label">{{ $t("checkout.shippingForm.country") }} <span class="sf-req">*</span></span>
        </template>
        <UInput
          v-model="form.country"
          autocomplete="country-name"
          :placeholder="$t('checkout.shippingForm.country')"
          :disabled="isBusy"
          class="w-full"
          size="xl"
          :ui="inputUi"
        />
      </UFormField>

      <!-- Tỉnh/Thành phố + Mã bưu chính -->
      <div class="sf-row">
        <UFormField name="city" class="sf-field sf-field--half">
          <template #label>
            <span class="sf-label">{{ $t("checkout.shippingForm.city") }}</span>
          </template>
          <UInput
            v-model="form.city"
            autocomplete="address-level2"
            :placeholder="$t('checkout.shippingForm.city')"
            :disabled="isBusy"
            class="w-full"
            size="xl"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField name="postalCode" class="sf-field sf-field--half">
          <template #label>
            <span class="sf-label">{{ $t("checkout.shippingForm.postalCode") }}</span>
          </template>
          <UInput
            v-model="form.postalCode"
            autocomplete="postal-code"
            :placeholder="$t('checkout.shippingForm.postalCode')"
            :disabled="isBusy"
            class="w-full"
            size="xl"
            :ui="inputUi"
          />
        </UFormField>
      </div>

      <!-- Địa chỉ chi tiết -->
      <UFormField name="streetAddress" class="sf-field">
        <template #label>
          <span class="sf-label">{{ $t("checkout.shippingForm.streetAddress") }} <span class="sf-req">*</span></span>
        </template>
        <UInput
          v-model="form.streetAddress"
          autocomplete="street-address"
          :placeholder="$t('checkout.shippingForm.streetAddressPlaceholder')"
          :disabled="isBusy"
          class="w-full"
          size="xl"
          :ui="inputUi"
        />
      </UFormField>

      <!-- Checkbox điều khoản -->
      <label class="sf-terms">
        <UCheckbox v-model="agreedTerms" :disabled="isBusy" />
        <span>{{ $t("checkout.shippingForm.agreeTermsPrefix") }}
          <a href="#" class="sf-terms-link" @click.prevent>{{ $t("checkout.shippingForm.termsAndConditions") }}</a>.
        </span>
      </label>

      <!-- Xác nhận -->
      <div class="flex gap-4">
        <UButton
          v-if="form.id"
          type="button"
          color="neutral"
          variant="outline"
          size="xl"
          class="flex-1 sf-submit justify-center"
          :disabled="isBusy"
          @click="cancelEdit"
        >
          {{ $t("checkout.shippingForm.resetChanges") }}
        </UButton>
        <UButton
          type="submit"
          color="primary"
          variant="outline"
          size="xl"
          class="flex-1 sf-submit justify-center"
          :loading="isBusy"
          :disabled="isSubmitDisabled"
        >
          {{ submitLabel }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { useStorage, watchDebounced } from "@vueuse/core"
import type { SavedShippingAddress, ShippingAddressForm } from "../../domain/types/checkout.types"

type ShippingFormStatus = "idle" | "loading" | "success" | "error"

type ShippingFormError = {
  name?: keyof ShippingAddressForm
  message: string
}

const props = withDefaults(defineProps<{
  initialAddress?: SavedShippingAddress | null
}>(), {
  initialAddress: null,
})

const emit = defineEmits<{
  submit: [address: SavedShippingAddress]
  'change-address': []
  delete: [addressId: string]
}>()

const { t } = useI18n()
const toast = useToast()

const totalFieldCount = 6

const inputUi = {
  base: "h-[62px] rounded-lg px-4 text-[15px]",
}

const createEmptyForm = (): ShippingAddressForm => ({
  id: undefined,
  fullName: "",
  phone: "",
  country: "",
  city: "",
  postalCode: "",
  streetAddress: "",
})

const normalizeAddress = (address: ShippingAddressForm): SavedShippingAddress => ({
  id: address.id,
  fullName: address.fullName.trim(),
  phone: address.phone.trim(),
  country: address.country.trim(),
  city: address.city.trim(),
  postalCode: address.postalCode.trim(),
  streetAddress: address.streetAddress.trim(),
})

const hasAnyField = (address: ShippingAddressForm | SavedShippingAddress | null | undefined) =>
  Boolean(address) && Object.values(address).some(value => typeof value === "string" && value.trim().length > 0)

const isSameAddress = (
  first: ShippingAddressForm | SavedShippingAddress | null | undefined,
  second: ShippingAddressForm | SavedShippingAddress | null | undefined,
) => {
  if (!first || !second) {
    return false
  }

  const normalizedFirst = normalizeAddress(first)
  const normalizedSecond = normalizeAddress(second)

  return Object.entries(normalizedFirst).every(([key, value]) => {
    if (key === "id") return true // Skip ID comparison for similarity check
    return normalizedSecond[key as keyof SavedShippingAddress] === value
  })
}

const form = reactive<ShippingAddressForm>(createEmptyForm())
const latestSavedAddress = ref<SavedShippingAddress | null>(null)
const submitState = ref<ShippingFormStatus>("idle")
const draftRestored = ref(false)
const storageHydrated = ref(false)
const agreedTerms = ref(false)
const fullNameInputRef = ref<any>(null)
const isUsingSavedAddress = ref(false)

const draftStorage = useStorage<ShippingAddressForm>(
  "checkout:shipping-address-draft",
  createEmptyForm(),
  undefined,
  {
    mergeDefaults: true,
    initOnMounted: true,
  },
)

const filledFieldsCount = computed(() =>
  Object.entries(form)
    .filter(([key, value]) => key !== "id" && typeof value === "string" && value.trim().length > 0)
    .length,
)

const hasCompleteForm = computed(() => filledFieldsCount.value === totalFieldCount)
const isBusy = computed(() => submitState.value === "loading")
const isSubmitDisabled = computed(() => isBusy.value || !hasCompleteForm.value || !agreedTerms.value)

const formattedActiveAddress = computed(() => {
  const toTitleCase = (str: string) => {
    if (!str) return ""
    return str
      .split(/\s+/)
      .map(word => {
        if (!word) return ""
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }

  return [form.streetAddress, form.city, form.country]
    .map(part => toTitleCase(part?.trim()))
    .filter(Boolean)
    .join(', ')
})

const submitLabel = computed(() =>
  submitState.value === "loading"
    ? t("checkout.shippingForm.saving")
    : t("checkout.shippingForm.saveAddress"),
)

const statusAlert = computed(() => {
  if (submitState.value === "success") {
    return {
      color: "success" as const,
      icon: "i-ph-check-circle-fill",
      title: t("checkout.shippingForm.statusSuccessTitle"),
      description: t("checkout.shippingForm.statusSuccessDescription"),
    }
  }

  if (submitState.value === "error") {
    return {
      color: "error" as const,
      icon: "i-ph-warning-circle-fill",
      title: t("checkout.shippingForm.statusErrorTitle"),
      description: t("checkout.shippingForm.statusErrorDescription"),
    }
  }

  return null
})

watch(
  () => props.initialAddress,
  (address, previousAddress) => {
    if (!address) {
      isUsingSavedAddress.value = false
      latestSavedAddress.value = null
      Object.assign(form, createEmptyForm())
      return
    }

    const normalized = normalizeAddress(address)
    const shouldSyncForm = !hasAnyField(form) || (previousAddress ? isSameAddress(form, previousAddress) : false)

    latestSavedAddress.value = normalized

    if (shouldSyncForm || form.id === normalized.id) {
      Object.assign(form, normalized)
    }

    isUsingSavedAddress.value = true
  },
  { immediate: true },
)

onMounted(async () => {
  storageHydrated.value = true

  const storedDraft = normalizeAddress(draftStorage.value)

  if (hasAnyField(storedDraft) && (!latestSavedAddress.value || !isSameAddress(storedDraft, latestSavedAddress.value))) {
    Object.assign(form, storedDraft)
    await nextTick()
    draftRestored.value = true
  }
})

watchDebounced(
  () => ({ ...form }),
  (value) => {
    if (!storageHydrated.value) {
      return
    }

    if (latestSavedAddress.value && isSameAddress(value, latestSavedAddress.value)) {
      draftStorage.value = createEmptyForm()
    }
    else {
      draftStorage.value = value
    }
  },
  {
    debounce: 250,
    maxWait: 1000,
  },
)

watch(
  () => [form.fullName, form.phone, form.country, form.city, form.postalCode, form.streetAddress],
  () => {
    if (submitState.value !== "loading") {
      submitState.value = "idle"
    }

    draftRestored.value = false
  },
)

const validateForm = (state: ShippingAddressForm): ShippingFormError[] => {
  const errors: ShippingFormError[] = []

  if (!state.fullName.trim()) {
    errors.push({
      name: "fullName",
      message: t("checkout.shippingForm.validationFullNameRequired"),
    })
  }

  const normalizedPhone = state.phone.replace(/\D/g, "")

  if (!state.phone.trim()) {
    errors.push({
      name: "phone",
      message: t("checkout.shippingForm.validationPhoneRequired"),
    })
  }
  else if (normalizedPhone.length < 8) {
    errors.push({
      name: "phone",
      message: t("checkout.shippingForm.validationPhoneInvalid"),
    })
  }

  if (!state.country.trim()) {
    errors.push({
      name: "country",
      message: t("checkout.shippingForm.validationCountryRequired"),
    })
  }

  if (!state.city.trim()) {
    errors.push({
      name: "city",
      message: t("checkout.shippingForm.validationCityRequired"),
    })
  }

  if (!state.postalCode.trim()) {
    errors.push({
      name: "postalCode",
      message: t("checkout.shippingForm.validationPostalCodeRequired"),
    })
  }

  if (!state.streetAddress.trim()) {
    errors.push({
      name: "streetAddress",
      message: t("checkout.shippingForm.validationStreetRequired"),
    })
  }

  return errors
}

async function saveAddress() {
  submitState.value = "loading"

  await new Promise(resolve => setTimeout(resolve, 500))

  const normalized = normalizeAddress(form)

  latestSavedAddress.value = normalized
  draftStorage.value = normalized
  draftRestored.value = false
  submitState.value = "success"

  emit("submit", normalized)

  toast.add({
    title: t("checkout.shippingForm.statusSuccessTitle"),
    description: t("checkout.shippingForm.statusSuccessDescription"),
    color: "success",
  })
}

function handleFormError() {
  submitState.value = "error"
}

function clearAndFocus() {
  isUsingSavedAddress.value = false
  Object.assign(form, createEmptyForm())
  draftStorage.value = createEmptyForm()
  agreedTerms.value = false
  submitState.value = "idle"
  nextTick(() => {
    if (fullNameInputRef.value?.$el) {
      const inputEl = fullNameInputRef.value.$el.querySelector('input')
      if (inputEl) {
        inputEl.focus()
      } else {
        fullNameInputRef.value.focus?.()
      }
    } else {
      fullNameInputRef.value?.focus?.()
    }
  })
}

function populateAndFocus(address: SavedShippingAddress) {
  isUsingSavedAddress.value = false
  Object.assign(form, address)
  agreedTerms.value = true
  submitState.value = "idle"
  nextTick(() => {
    if (fullNameInputRef.value?.$el) {
      const inputEl = fullNameInputRef.value.$el.querySelector('input')
      if (inputEl) {
        inputEl.focus()
      } else {
        fullNameInputRef.value.focus?.()
      }
    } else {
      fullNameInputRef.value?.focus?.()
    }
  })
}

function cancelEdit() {
  if (latestSavedAddress.value) {
    Object.assign(form, latestSavedAddress.value)
    isUsingSavedAddress.value = true
  } else {
    clearAndFocus()
  }
}

async function onDeleteActiveAddress() {
  if (!form.id) return

  if (!confirm(t("checkout.shippingForm.confirmDeleteAddress"))) {
    return
  }

  submitState.value = "loading"
  try {
    emit("delete", form.id)
    toast.add({
      title: t("checkout.shippingForm.deleteSuccessTitle"),
      description: t("checkout.shippingForm.deleteSuccessDescription"),
      color: "success",
    })
    clearAndFocus()
  } catch {
    toast.add({
      title: t("checkout.shippingForm.deleteErrorTitle"),
      description: t("checkout.shippingForm.deleteErrorDescription"),
      color: "error",
    })
    submitState.value = "idle"
  }
}

defineExpose({
  clearAndFocus,
  populateAndFocus,
})
</script>

<style scoped>
.sf-card {
  background: #fff;
  padding: 0;
  border-radius: 16px;
  max-width: 540px;
}

.sf-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 28px;
}

.sf-heading {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}

.sf-change-address {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #4361ee;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.sf-change-address:hover {
  text-decoration: underline;
}

.sf-alert {
  margin-bottom: 20px;
  border-radius: 10px;
}

.sf-field {
  margin-bottom: 22px;
}

.sf-field :deep(input) {
  height: 42px !important;
}

.sf-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.sf-req {
  color: #ef4444;
  margin-left: 2px;
}

.sf-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.sf-terms {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 28px 0 24px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  line-height: 1.5;
}

.sf-terms-link {
  color: #4361ee;
  font-weight: 600;
  text-decoration: none;
}

.sf-terms-link:hover {
  text-decoration: underline;
}

.sf-submit {
  height: 52px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
}

@media (max-width: 540px) {
  .sf-row {
    grid-template-columns: 1fr;
  }
}

.sf-active-address-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  position: relative;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sf-active-address-card:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.sf-active-address-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.sf-active-address-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.sf-active-address-badge {
  font-size: 11px;
  font-weight: 600;
  color: #4361ee;
  background: rgba(67, 97, 238, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
}

.sf-active-address-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.sf-active-address-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sf-active-address-action-btn.edit {
  color: #4361ee;
}

.sf-active-address-action-btn.edit:hover {
  background: rgba(67, 97, 238, 0.08);
  border-color: #4361ee;
}

.sf-active-address-action-btn.delete {
  color: #ef4444;
}

.sf-active-address-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
}

.sf-active-address-phone {
  font-size: 14px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sf-active-address-detail {
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease forwards;
}
</style>
