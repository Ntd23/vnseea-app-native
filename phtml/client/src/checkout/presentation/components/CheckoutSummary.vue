<template>
  <section class="os-card" aria-labelledby="os-title">
    <h2 id="os-title" class="os-heading">
      {{ $t("checkout.summary.title") }}
    </h2>

    <!-- Items -->
    <template v-if="items.length">
      <div class="os-items">
        <article v-for="item in items" :key="item.id" class="os-item">
          <div class="os-item-img">
            <div
              v-if="!item.imageUrl"
              class="os-item-img-fallback"
              :style="{ backgroundImage: item.imageStyle || defaultCardBackground }"
            />
            <NuxtImg
              v-else
              :src="item.imageUrl"
              :alt="item.name"
              class="os-item-img-real"
              loading="lazy"
            />
          </div>
          <div class="os-item-info">
            <h3 class="os-item-name">{{ item.name }}</h3>
            
            <div class="os-item-controls">
              <!-- Bộ tăng giảm số lượng -->
              <div class="os-qty-selector">
                <button
                  type="button"
                  class="os-qty-btn decrease"
                  @click="emit('decreaseQuantity', item.id)"
                  :aria-label="$t('checkout.summary.decreaseQuantityAria', { name: item.name })"
                >
                  <Icon name="i-ph-minus-bold" class="h-3 w-3" />
                </button>
                <span class="os-qty-val">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="os-qty-btn increase"
                  @click="emit('increaseQuantity', item.id)"
                  :aria-label="$t('checkout.summary.increaseQuantityAria', { name: item.name })"
                >
                  <Icon name="i-ph-plus-bold" class="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <span class="os-item-price">{{ formatVnd(item.price * item.quantity) }}</span>
        </article>
      </div>

      <!-- Totals -->
      <div class="os-totals">
        <div class="os-row">
          <span>{{ $t("checkout.summary.subtotal") }}</span>
          <span>{{ formatVnd(subtotal) }}</span>
        </div>
        <div class="os-row">
          <span>{{ $t("checkout.summary.shippingFee") }}</span>
          <span>{{ shippingFee > 0 ? formatVnd(shippingFee) : $t("checkout.summary.free") }}</span>
        </div>
        <div class="os-row os-row--total">
          <span>{{ $t("checkout.summary.totalPayment") }}</span>
          <span>{{ formatVnd(total) }}</span>
        </div>
      </div>

      <!-- Alert -->
      <UAlert
        v-if="statusAlert"
        :color="statusAlert.color"
        variant="subtle"
        :icon="statusAlert.icon"
        :title="statusAlert.title"
        :description="statusAlert.description"
        class="os-alert"
        aria-live="polite"
      />

      <!-- CTA -->
      <UButton
        color="primary"
        variant="solid"
        block
        size="lg"
        :loading="isBusy"
        :disabled="ctaDisabled"
        class="os-cta"
        @click="emit('submit')"
      >
        {{ ctaLabel }}
      </UButton>
    </template>

    <!-- Empty -->
    <div v-else class="os-empty">
      <div class="os-empty-icon">
        <Icon name="i-ph-shopping-cart-simple" class="h-7 w-7" />
      </div>
      <h3 class="os-empty-title">{{ $t("checkout.summary.emptyCart") }}</h3>
      <p class="os-empty-hint">{{ $t("checkout.summary.emptyCartHint") }}</p>
      <UButton
        :to="appRoutes.products"
        color="primary"
        variant="outline"
        class="os-empty-cta"
      >
        {{ $t("checkout.summary.backToMarketplace") }}
      </UButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import type { CheckoutLineItem } from "../../domain/types/checkout.types"

const props = withDefaults(defineProps<{
  items: CheckoutLineItem[]
  walletBalance: number
  shippingFee?: number
  addressReady?: boolean
  checkoutState?: "idle" | "loading" | "success" | "error"
}>(), {
  shippingFee: 0,
  addressReady: false,
  checkoutState: "idle",
})

const emit = defineEmits<{
  increaseQuantity: [itemId: string]
  decreaseQuantity: [itemId: string]
  removeItem: [itemId: string]
  submit: []
}>()

const { t, locale } = useI18n()

const defaultCardBackground = [
  "radial-gradient(circle at 78% 12%, rgba(255,214,182,0.5), transparent 18%)",
  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.26), transparent 22%)",
  "linear-gradient(150deg, #243b63 0%, #f1959b 42%, #f8c184 100%)",
].join(", ")

const subtotal = computed(() =>
  props.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

const total = computed(() => subtotal.value + props.shippingFee)
const walletShortage = computed(() => Math.max(total.value - props.walletBalance, 0))
const isBusy = computed(() => props.checkoutState === "loading")

const statusAlert = computed(() => {
  if (props.items.length === 0) {
    return null
  }

  if (props.checkoutState === "success") {
    return null
  }

  if (props.checkoutState === "error") {
    return {
      color: "error" as const,
      icon: "i-ph-warning-circle-fill",
      title: t("checkout.summary.purchaseErrorTitle"),
      description: t("checkout.summary.purchaseErrorDescription"),
    }
  }

  if (!props.addressReady) {
    return {
      color: "warning" as const,
      icon: "i-ph-map-pin-fill",
      title: t("checkout.summary.addressRequiredTitle"),
      description: t("checkout.summary.addressRequiredDescription"),
    }
  }

  if (walletShortage.value > 0) {
    return {
      color: "warning" as const,
      icon: "i-ph-wallet-fill",
      title: t("checkout.summary.walletAttentionTitle"),
      description: t("checkout.summary.insufficientBalance"),
    }
  }

  return null
})

const ctaLabel = computed(() => {
  if (!props.addressReady) {
    return t("checkout.summary.saveAddressFirst")
  }

  if (props.checkoutState === "loading") {
    return t("checkout.summary.processing")
  }

  if (props.checkoutState === "success") {
    return t("checkout.summary.orderPlaced")
  }

  if (props.checkoutState === "error") {
    return t("checkout.summary.retry")
  }

  if (walletShortage.value > 0) {
    return t("checkout.summary.addFunds")
  }

  return t("checkout.summary.buy")
})

const ctaDisabled = computed(() =>
  props.items.length === 0
  || !props.addressReady
  || props.checkoutState === "loading"
  || props.checkoutState === "success",
)

function formatVnd(value: number) {
  return formatCurrency(value, {
    currency: "VND",
    locale: locale.value,
  })
}
</script>

<style scoped>
.os-card {
  background: #fff;
  padding: 0;
  border-radius: 16px;
}

.os-heading {
  margin: 0 0 28px;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}

/* ── Items ── */
.os-items {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 8px;
}

.os-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.os-item-img {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.os-item-img-fallback {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
}

.os-item-img-real {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.os-item-info {
  flex: 1;
  min-width: 0;
}

.os-item-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.os-item-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.os-qty-selector {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 2px;
}

.os-qty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #475569;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.os-qty-btn:hover:not(:disabled) {
  background: #fff;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.os-qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.os-qty-val {
  min-width: 22px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.os-item-remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #ef4444;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.os-item-remove-btn:hover {
  background: rgba(239, 68, 68, 0.06);
  border-color: #fca5a5;
}

.os-item-price {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
}

/* ── Totals ── */
.os-totals {
  padding: 16px 0 24px;
}

.os-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #4b5563;
}

.os-row--total {
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 16px;
  font-weight: 800;
  color: #111827;
}

/* ── Alert ── */
.os-alert {
  margin-bottom: 16px;
  border-radius: 10px;
}

/* ── CTA ── */
.os-cta {
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  background: #4361ee;
}

.os-cta:hover:not(:disabled) {
  background: #3a56d4;
}

/* ── Empty ── */
.os-empty {
  padding: 32px 0;
  text-align: center;
}

.os-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #9ca3af;
  margin-bottom: 16px;
}

.os-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.os-empty-hint {
  margin: 6px 0 0;
  font-size: 14px;
  color: #6b7280;
}

.os-empty-cta {
  margin-top: 16px;
  border-radius: 8px;
}
</style>
