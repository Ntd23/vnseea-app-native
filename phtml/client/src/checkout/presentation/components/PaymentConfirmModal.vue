<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="pm-confirm">
        <!-- Header -->
        <div class="pm-confirm-header">
          <div class="pm-confirm-icon-wrapper">
            <Icon name="i-ph-shield-check-bold" class="h-6 w-6 text-indigo-600" />
          </div>
          <h3 class="pm-confirm-title">{{ $t("checkout.confirmModal.title", "Xác nhận mua hàng") }}</h3>
          <p class="pm-confirm-subtitle">
            {{ $t("checkout.confirmModal.description", "Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi tiến hành thanh toán.") }}
          </p>
        </div>

        <!-- Order Snapshot Details -->
        <div class="pm-confirm-summary">
          <div class="pm-confirm-row">
            <span class="pm-confirm-label">{{ $t("checkout.confirmModal.itemsCount", "Số lượng mặt hàng") }}</span>
            <span class="pm-confirm-value">{{ totalItemsCount }}</span>
          </div>
          
          <div class="pm-confirm-row">
            <span class="pm-confirm-label">{{ $t("checkout.confirmModal.walletBalance", "Số dư ví hiện tại") }}</span>
            <span class="pm-confirm-value wallet-balance">{{ formatVnd(walletBalance) }}</span>
          </div>
          
          <div class="pm-confirm-divider" />
          
          <div class="pm-confirm-row total-row">
            <span class="pm-confirm-label total-label">{{ $t("checkout.confirmModal.totalPayment", "Tổng thanh toán") }}</span>
            <span class="pm-confirm-value total-value">{{ formatVnd(totalPayment) }}</span>
          </div>
        </div>

        <!-- Action CTAs -->
        <div class="pm-confirm-actions">
          <button
            type="button"
            class="pm-btn pm-btn--ghost"
            @click="isOpen = false"
          >
            {{ $t("checkout.confirmModal.cancel", "Hủy bỏ") }}
          </button>
          <button
            type="button"
            class="pm-btn pm-btn--primary"
            @click="onConfirm"
          >
            <Icon name="i-ph-wallet-bold" class="h-4 w-4 mr-2" />
            <span>{{ $t("checkout.confirmModal.confirm", "Xác nhận mua") }}</span>
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { CheckoutLineItem } from "../../domain/types/checkout.types"

const props = withDefaults(defineProps<{
  open: boolean
  items: CheckoutLineItem[]
  walletBalance: number
  shippingFee?: number
}>(), {
  shippingFee: 0,
})

const emit = defineEmits<{
  "update:open": [value: boolean]
  confirm: []
}>()

const { locale } = useI18n()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
})

const totalItemsCount = computed(() =>
  props.items.reduce((sum, item) => sum + item.quantity, 0),
)

const subtotal = computed(() =>
  props.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

const totalPayment = computed(() => subtotal.value + props.shippingFee)

const formatVnd = (value: number) => {
  return formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })
}

const onConfirm = () => {
  emit("confirm")
}
</script>

<style scoped>
.pm-confirm {
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .pm-confirm {
    padding: 24px;
    min-width: 420px;
  }
}

.pm-confirm-header {
  text-align: center;
  margin-bottom: 24px;
}

.pm-confirm-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  margin-bottom: 16px;
}

.pm-confirm-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.pm-confirm-subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
}

/* ── Summary Card ── */
.pm-confirm-summary {
  background: #f8fafc;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f1f5f9;
  margin-bottom: 28px;
}

.pm-confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.pm-confirm-label {
  font-size: 14px;
  color: #64748b;
}

.pm-confirm-value {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.pm-confirm-value.wallet-balance {
  color: #0284c7;
}

.pm-confirm-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 12px 0;
}

.pm-confirm-row.total-row {
  padding-top: 4px;
}

.pm-confirm-label.total-label {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.pm-confirm-value.total-value {
  font-size: 18px;
  font-weight: 900;
  color: #4361ee;
}

/* ── Actions ── */
.pm-confirm-actions {
  display: flex;
  gap: 12px;
}

.pm-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.pm-btn--ghost {
  background: #f1f5f9;
  color: #475569;
}

.pm-btn--ghost:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.pm-btn--primary {
  background: #4361ee;
  color: #ffffff;
}

.pm-btn--primary:hover {
  background: #364fc7;
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.2);
}
</style>
