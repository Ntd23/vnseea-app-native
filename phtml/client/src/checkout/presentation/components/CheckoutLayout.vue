<!-- English description: Provides the checkout shell with dynamic backend branding and step navigation. -->
<template>
  <div class="ck-page">
    <!-- Header -->
    <header class="ck-header">
      <div class="ck-header-inner">
        <NuxtLink to="/" class="ck-logo">
          <img
            v-if="checkoutLogoUrl && !checkoutLogoFailed"
            :src="checkoutLogoUrl"
            :alt="checkoutLogoAlt"
            class="ck-logo-img"
            @error="checkoutLogoFailed = true"
          />
          <span v-else class="ck-logo-text">{{ checkoutBrandName }}</span>
        </NuxtLink>
        <nav class="ck-stepper" aria-label="Checkout steps">
          <!-- Bước 1: Giỏ hàng - DONE nếu hasItems, ngược lại ACTIVE -->
          <div class="ck-step" :class="{ 'ck-step--done': hasItems, 'ck-step--active': !hasItems }">
            <span class="ck-step-circle" :class="{ 'ck-step-circle--done': hasItems, 'ck-step-circle--active': !hasItems }">
              <Icon v-if="hasItems" name="i-ph-check-bold" class="ck-step-check" />
              <span v-else>1</span>
            </span>
            <span class="ck-step-text" :class="{ 'ck-step-text--done': hasItems, 'ck-step-text--active': !hasItems }">
              {{ $t("checkout.stepper.cart") }}
            </span>
          </div>
          <span class="ck-step-line" :class="{ 'ck-step-line--done': hasItems }" />

          <!-- Bước 2: Xác nhận (Địa chỉ) - DONE nếu hasItems && hasAddress, ACTIVE nếu hasItems && !hasAddress, ngược lại PENDING -->
          <div class="ck-step" :class="{ 'ck-step--done': hasItems && hasAddress, 'ck-step--active': hasItems && !hasAddress }">
            <span class="ck-step-circle" :class="{ 'ck-step-circle--done': hasItems && hasAddress, 'ck-step-circle--active': hasItems && !hasAddress }">
              <Icon v-if="hasItems && hasAddress" name="i-ph-check-bold" class="ck-step-check" />
              <span v-else>2</span>
            </span>
            <span class="ck-step-text" :class="{ 'ck-step-text--done': hasItems && hasAddress, 'ck-step-text--active': hasItems && !hasAddress }">
              {{ $t("checkout.stepper.confirm") }}
            </span>
          </div>
          <span class="ck-step-line" :class="{ 'ck-step-line--done': hasItems && hasAddress }" />

          <!-- Bước 3: Thanh toán (Payment) - DONE nếu isSuccess, ACTIVE nếu !isSuccess && hasItems && hasAddress, ngược lại PENDING -->
          <div class="ck-step" :class="{ 'ck-step--done': isSuccess, 'ck-step--active': !isSuccess && hasItems && hasAddress }">
            <span class="ck-step-circle" :class="{ 'ck-step-circle--done': isSuccess, 'ck-step-circle--active': !isSuccess && hasItems && hasAddress }">
              <Icon v-if="isSuccess" name="i-ph-check-bold" class="ck-step-check" />
              <span v-else>3</span>
            </span>
            <span class="ck-step-text" :class="{ 'ck-step-text--done': isSuccess, 'ck-step-text--active': !isSuccess && hasItems && hasAddress }">
              {{ $t("checkout.stepper.payment") }}
            </span>
          </div>
        </nav>
      </div>
    </header>

    <!-- Main -->
    <main class="ck-main">
      <div class="ck-grid">
        <section class="ck-col-left" :aria-label="leftLabel || title">
          <h1 class="ck-title">{{ title }}</h1>
          <slot name="left" />
        </section>
        <section class="ck-col-right" :aria-label="rightLabel">
          <slot name="right" />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useSiteBrandingStore } from "../../../site-branding/application/stores/useSiteBrandingStore"

withDefaults(defineProps<{
  title: string
  eyebrow?: string
  description?: string
  progressLabel?: string
  progressText?: string
  progressValue?: number
  leftLabel?: string
  rightLabel?: string
  hasAddress?: boolean
  hasItems?: boolean
  isSuccess?: boolean
}>(), {
  eyebrow: "",
  description: "",
  progressLabel: "",
  progressText: "",
  progressValue: 0,
  leftLabel: "",
  rightLabel: "",
  hasAddress: false,
  hasItems: true,
  isSuccess: false,
})

const siteBrandingStore = useSiteBrandingStore()
const { branding } = storeToRefs(siteBrandingStore)
const checkoutLogoFailed = ref(false)

const checkoutBrandName = computed(() => branding.value.siteName || "VNSEEA")
const checkoutLogoUrl = computed(() => branding.value.logoUrl)
const checkoutLogoAlt = computed(() => `${checkoutBrandName.value} Logo`)

watch(checkoutLogoUrl, () => {
  checkoutLogoFailed.value = false
})

useHead({
  bodyAttrs: {
    style: "background:#fff;overflow-x:hidden",
  },
})
</script>

<style scoped>
.ck-page {
  min-height: 100vh;
  background: #fff;
  overflow-x: hidden;
}

/* ── Header ── */
.ck-header {
  background: #fff;
  border-bottom: 1px solid #e8eaed;
}

.ck-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1140px;
  margin: 0 auto;
  padding: 18px 24px;
}

.ck-logo {
  font-family: 'Montserrat', sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: #1B08FF;
  text-decoration: none;
  letter-spacing: -2px;
}

.ck-logo-img {
  height: 40px;
  max-width: 160px;
  display: block;
  object-fit: contain;
}

.ck-logo-text {
  display: inline-block;
  color: #1B08FF;
}

/* ── Stepper ── */
.ck-stepper {
  display: flex;
  align-items: center;
  gap: 0;
}

.ck-step {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ck-step-circle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  background: #f3f4f6;
  color: #9ca3af;
  border: 1.5px solid #e5e7eb;
  transition: all 0.3s ease;
}

.ck-step-circle--done {
  background: #4361ee;
  color: #fff;
  border-color: #4361ee;
}

.ck-step-circle--active {
  background: #4361ee;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 0 0 1px rgba(67, 97, 238, 0.15);
}

.ck-step-circle--active::after {
  content: "";
  position: absolute;
  top: -3.5px;
  left: -3.5px;
  right: -3.5px;
  bottom: -3.5px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: #4361ee;
  border-right-color: #4361ee;
  border-bottom-color: rgba(67, 97, 238, 0.15);
  border-left-color: rgba(67, 97, 238, 0.15);
  animation: ck-spin 1.8s linear infinite;
}

@keyframes ck-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.ck-step-check {
  width: 14px;
  height: 14px;
}

.ck-step-text {
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.ck-step-text--active {
  font-weight: 700;
  color: #111827;
}

.ck-step-text--done {
  font-weight: 600;
  color: #4b5563;
}

.ck-step-line {
  width: 48px;
  height: 2px;
  margin: 0 12px;
  background: #e5e7eb;
  border-radius: 1px;
  transition: all 0.3s ease;
}

.ck-step-line--done {
  background: #4361ee;
}

/* ── Main ── */
.ck-main {
  max-width: 1140px;
  margin: 0 auto;
  padding: 36px 24px 40px;
  position: relative;
  min-height: calc(100vh - 65px);
}

.ck-main::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc(380px + 40px + 24px);
  width: 1px;
  background: #e5e7eb;
}

.ck-title {
  margin: 0 0 28px;
  font-size: 30px;
  font-weight: 900;
  color: #111827;
  letter-spacing: -0.3px;
}

.ck-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 0;
  align-items: start;
}

.ck-col-right {
  padding-left: 40px;
  margin-left: 40px;
}

.ck-sticky {
  position: sticky;
  top: 24px;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .ck-main::after {
    display: none;
  }

  .ck-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .ck-col-right {
    padding-left: 0;
    margin-left: 0;
    border-top: 1px solid #e5e7eb;
    padding-top: 28px;
  }

  .ck-sticky {
    position: static;
  }
}

@media (max-width: 640px) {
  .ck-header-inner {
    flex-direction: column;
    gap: 16px;
    padding: 14px 16px;
  }

  .ck-stepper {
    width: 100%;
    justify-content: center;
  }

  .ck-step-line {
    width: 28px;
    margin: 0 6px;
  }

  .ck-main {
    padding: 24px 16px 48px;
  }

  .ck-title {
    font-size: 24px;
    margin-bottom: 20px;
  }
}
</style>
