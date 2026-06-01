<template>
  <div class="space-y-5">
    <CheckoutLayout
      :title="$t('checkout.page.layoutTitle')"
      :description="$t('checkout.page.layoutDescription')"
      :left-label="$t('checkout.page.formRegion')"
      :right-label="$t('checkout.page.summaryRegion')"
      :progress-label="$t('checkout.page.progressLabel')"
      :progress-text="progressText"
      :progress-value="progressValue"
      :has-address="hasSavedAddress"
      :has-items="hasItems"
    >
      <template #left>
        <div v-if="isLoading" class="space-y-6 p-6 bg-white border border-[#e2e8f0] rounded-[16px] animate-pulse">
          <div class="flex justify-between items-center">
            <div class="h-6 bg-slate-200 rounded w-1/3"></div>
            <div class="h-4 bg-slate-200 rounded w-1/4"></div>
          </div>
          <div class="h-[120px] bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
            <div class="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
        <ShippingAddressFormUI
          v-else
          ref="addressFormRef"
          :initial-address="savedAddress"
          @submit="handleAddressSubmit"
          @change-address="showAddressPicker = true"
          @delete="handleDeleteAddress"
        />
      </template>

      <template #right>
        <div v-if="isLoading" class="space-y-6 p-6 bg-white border border-[#e2e8f0] rounded-[16px] animate-pulse">
          <div class="h-6 bg-slate-200 rounded w-1/2"></div>
          <div class="flex gap-4">
            <div class="w-16 h-16 bg-slate-100 rounded-lg"></div>
            <div class="flex-1 space-y-2 py-1">
              <div class="h-4 bg-slate-200 rounded w-3/4"></div>
              <div class="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
          </div>
          <div class="border-t border-slate-100 pt-4 space-y-3">
            <div class="flex justify-between">
              <div class="h-4 bg-slate-200 rounded w-1/4"></div>
              <div class="h-4 bg-slate-200 rounded w-1/6"></div>
            </div>
            <div class="flex justify-between">
              <div class="h-4 bg-slate-200 rounded w-1/4"></div>
              <div class="h-4 bg-slate-200 rounded w-1/6"></div>
            </div>
          </div>
          <div class="h-[52px] bg-slate-100 rounded-xl"></div>
        </div>
        <CheckoutSummary
          v-else
          :items="cartItems"
          :shipping-fee="shippingFee"
          :wallet-balance="walletBalance"
          :address-ready="hasSavedAddress"
          :checkout-state="checkoutState"
          @decrease-quantity="decreaseQuantity"
          @increase-quantity="increaseQuantity"
          @remove-item="removeItem"
          @submit="triggerCheckoutConfirmation"
        />
      </template>
    </CheckoutLayout>

    <AddressPickerModal
      v-model:open="showAddressPicker"
      :fetch-addresses="fetchSavedAddresses"
      :delete-address="deleteAddress"
      @select="handlePickedAddress"
      @add-new="handleAddNewAddress"
      @edit="handleEditAddress"
    />

    <!-- Modal xác nhận thanh toán -->
    <PaymentConfirmModal
      v-model:open="showConfirmModal"
      :items="cartItems"
      :wallet-balance="walletBalance"
      :shipping-fee="shippingFee"
      @confirm="confirmPurchase"
    />
  </div>
</template>

<script setup lang="ts">
import CheckoutLayout from "../components/CheckoutLayout.vue"
import CheckoutSummary from "../components/CheckoutSummary.vue"
import ShippingAddressFormUI from "../components/ShippingAddressFormUI.vue"
import AddressPickerModal from "../components/AddressPickerModal.vue"
import PaymentConfirmModal from "../components/PaymentConfirmModal.vue"
import { useCheckoutPageVM } from "../../application/view-models/useCheckoutPageVM"
import type { SavedShippingAddress } from "../../domain/types/checkout.types"

const { t } = useI18n()
const showAddressPicker = ref(false)
const showConfirmModal = ref(false)

const {
  isLoading,
  cartItems,
  savedAddress,
  walletBalance,
  shippingFee,
  checkoutState,
  progressText,
  progressValue,
  handleAddressSubmit,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  handleCheckoutAction,
  selectAddress,
  deleteAddress,
  fetchSavedAddresses,
} = useCheckoutPageVM()

const triggerCheckoutConfirmation = () => {
  // Kiểm tra trước các điều kiện tiên quyết (đã chọn địa chỉ và đủ số dư)
  if (!hasSavedAddress.value) {
    handleCheckoutAction() // Gọi để kích hoạt toast báo lỗi địa chỉ của VM
    return
  }
  const subtotalValue = cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalValue = subtotalValue + shippingFee.value
  if (totalValue > walletBalance.value) {
    handleCheckoutAction() // Gọi để kích hoạt toast báo lỗi thiếu tiền của VM
    return
  }
  // Mở modal xác nhận
  showConfirmModal.value = true
}

const confirmPurchase = () => {
  showConfirmModal.value = false
  handleCheckoutAction()
}

const hasItems = computed(() => cartItems.value.length > 0)
const hasSavedAddress = computed(() => Boolean(savedAddress.value))

const addressFormRef = ref<any>(null)

const handlePickedAddress = (address: SavedShippingAddress) => {
  selectAddress(address)
}

const handleAddNewAddress = () => {
  addressFormRef.value?.clearAndFocus()
}

const handleEditAddress = (addr: SavedShippingAddress) => {
  addressFormRef.value?.populateAndFocus(addr)
}

const handleDeleteAddress = async (id: string) => {
  await deleteAddress(id)
}
</script>
