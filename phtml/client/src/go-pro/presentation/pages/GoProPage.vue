<!-- English description: Backend-backed Go Pro comparison page styled after the WoWonder pro package table. -->
<template>
  <main class="go-pro-page mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
    <section class="go-pro-hero">
      <div class="go-pro-hero__copy">
        <h1>
          VNSEEA
          <span>PRO</span>
        </h1>
        <p>{{ heroDescription }}</p>
      </div>
      <img class="go-pro-hero__rocket" :src="'/themes/wowonder/img/go-pro/rocket.svg'" alt="" aria-hidden="true">
    </section>

    <section v-if="pending" class="go-pro-panel">
      <USkeleton class="h-[520px] rounded-[18px]" />
    </section>

    <UAlert v-else-if="error" color="error" variant="soft" :title="String(error.message || error)" />

    <section v-else-if="packages.length" class="go-pro-panel">
      <p v-if="membershipSystem" class="go-pro-warning">
        {{ membershipNotice }}
      </p>

      <h2 class="go-pro-pick">{{ pickPlanLabel }}</h2>

      <UPricingTable
        :tiers="tiers"
        :sections="sections"
        class="mt-6 border border-slate-200 rounded-[18px] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]"
      >
        <template #tier-title="{ tier }">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 p-1.5" :style="{ color: tier.color }">
              <Icon :name="planIcon(tier.id)" class="h-5 w-5" />
            </span>
            <span class="font-extrabold text-[17px] text-slate-800">{{ tier.title }}</span>
          </div>
        </template>

        <template #tier-button="{ tier }">
          <div class="w-full flex flex-col items-center gap-2 justify-center py-2">
            <div v-if="tier.isCurrent" class="flex flex-col items-center gap-2 justify-center w-full">
              <UBadge
                color="success"
                variant="solid"
                class="rounded-full px-4 py-1.5 font-bold text-[12px] inline-flex items-center gap-1 shadow-sm justify-center w-36"
              >
                <Icon name="i-ph-check-bold" class="h-3.5 w-3.5" />
                {{ currentLabel }}
              </UBadge>
              <UButton
                size="sm"
                class="!bg-red-600 hover:!bg-red-700 !text-white rounded-full px-4 py-1.5 font-bold text-[12px] inline-flex items-center gap-1 shadow-sm transition hover:scale-[1.03] justify-center w-36 cursor-pointer"
                :loading="cancelingType === tier.id"
                @click="confirmCancel(tier.id)"
              >
                <Icon name="i-ph-x-circle-bold" class="h-4 w-4" />
                Hủy gói
              </UButton>
            </div>
            <UButton
              v-else
              block
              size="lg"
              class="rounded-full font-bold transition hover:scale-[1.02] text-white hover:opacity-90 justify-center cursor-pointer"
              :style="{ backgroundColor: tier.color }"
              :loading="upgradingType === tier.id"
              @click="upgrade(tier.id)"
            >
              {{ upgradeLabel }}
            </UButton>
          </div>
        </template>
      </UPricingTable>

      <section class="go-pro-features">
        <h2>{{ whyChooseLabel }}</h2>
        <div class="go-pro-feature-grid">
          <article v-for="feature in featuredBenefits" :key="feature.label" class="go-pro-feature-card">
            <img :src="feature.image" :alt="feature.label">
            <p>{{ feature.label }}</p>
          </article>
        </div>
      </section>
    </section>

    <UCard v-else class="surface-card text-center" :ui="{ body: 'p-8' }">
      <Icon name="i-ph-rocket-launch-duotone" class="mx-auto h-10 w-10 text-[var(--text-tertiary)]" />
      <h2 class="text-heading mt-3">{{ t("pages.goProPage.emptyPaymentsTitle") }}</h2>
      <p class="text-body-secondary mt-2">{{ t("pages.goProPage.emptyPaymentsDescription") }}</p>
    </UCard>

    <!-- Modal xác nhận hủy gói PRO -->
    <FoundationModalShell
      :open="isCancelModalOpen"
      title="Xác nhận hủy gói PRO"
      description="Hành động này sẽ hủy đăng ký gói thành viên PRO của bạn."
      cancel-label="Quay lại"
      confirm-label="Đồng ý hủy"
      confirm-color="error"
      :confirm-loading="cancelingType !== ''"
      @close="isCancelModalOpen = false"
      @cancel="isCancelModalOpen = false"
      @confirm="handleCancelConfirm"
    >
      <div class="space-y-3 py-2">
        <p class="text-body-primary font-semibold text-center text-red-600 flex items-center justify-center gap-2">
          <Icon name="i-ph-warning-circle-fill" class="h-5 w-5 shrink-0" />
          Cảnh báo mất đặc quyền PRO
        </p>
        <p class="text-body-secondary text-sm text-center leading-relaxed">
          Sau khi hủy gói PRO, các tính năng đặc quyền của bạn (như bài viết nổi bật, xem khách truy cập hồ sơ, huy hiệu xác minh và quảng bá bài viết/trang) sẽ bị dừng hoạt động ngay lập tức.
        </p>
      </div>
    </FoundationModalShell>
  </main>
</template>

<script setup lang="ts">
import { formatCurrency } from "../../../shared-kernel/application/utils/formatCurrency"
import { useGoProPageVM } from "../../application/view-models/useGoProPageVM"
import FoundationModalShell from "../../../foundation/presentation/components/ModalShell.vue"

const { t, locale } = useI18n()
const {
  packages,
  pending,
  error,
  membershipSystem,
  upgradingType,
  upgrade,
  cancelingType,
  cancelPro,
} = useGoProPageVM()

const isCancelModalOpen = ref(false)
const cancelPlanId = ref("")

const confirmCancel = (planId: string) => {
  cancelPlanId.value = planId
  isCancelModalOpen.value = true
}

const handleCancelConfirm = async () => {
  isCancelModalOpen.value = false
  if (cancelPlanId.value) {
    await cancelPro(cancelPlanId.value)
    cancelPlanId.value = ""
  }
}

const heroDescription = "Kiểm soát hồ sơ, mở khóa nhiều quyền lợi hơn và nâng cấp tài khoản của bạn."
const membershipNotice = "Bạn cần nâng cấp thành viên để tiếp tục sử dụng đầy đủ các tính năng trên hệ thống."
const pickPlanLabel = "Chọn gói của bạn"
const priceLabel = "Giá"
const moreInfoLabel = "Thêm thông tin"
const whyChooseLabel = "Tại sao chọn Pro?"
const currentLabel = t("pages.goProPage.currentPlanLabel")
const upgradeLabel = "Nâng cấp ngay"

const baseFeatureRows = [
  { key: "featured_member", label: "Thành viên nổi bật" },
  { key: "profile_visitors", label: "Xem khách truy cập hồ sơ" },
  { key: "last_seen", label: "Ẩn/hiện lần online cuối" },
  { key: "verified_badge", label: "Huy hiệu xác minh" },
  { key: "posts_promotion", label: "Quảng bá bài viết" },
  { key: "pages_promotion", label: "Quảng bá trang" },
  { key: "discount", label: "Giảm giá" },
  { key: "max_upload", label: "Dung lượng tải lên tối đa" },
]

const featuredBenefits = [
  {
    label: "Thành viên nổi bật",
    image: "/themes/wowonder/img/go-pro/superhero.svg",
  },
  {
    label: "Ẩn/hiện lần online cuối",
    image: "/themes/wowonder/img/go-pro/lastseen.svg",
  },
  {
    label: "Quảng bá bài viết",
    image: "/themes/wowonder/img/go-pro/post.svg",
  },
  {
    label: "Huy hiệu xác minh",
    image: "/themes/wowonder/img/go-pro/verify.svg",
  },
]

const featureRows = computed(() => {
  const knownKeys = new Set(baseFeatureRows.map(row => row.key))
  const extraRows = packages.value
    .flatMap(plan => Object.keys(plan.features))
    .filter(key => !knownKeys.has(key))
    .filter((key, index, keys) => keys.indexOf(key) === index)
    .map(key => ({ key, label: normalizeFeature(key) }))

  return [...baseFeatureRows, ...extraRows]
})

const tiers = computed(() => {
  return packages.value.map(plan => {
    return {
      id: plan.id,
      title: plan.name,
      price: formatMoney(plan.price, plan.currency, plan.currencySymbol),
      description: plan.name === "Star" ? "Gói cơ bản" : plan.name === "Hot" ? "Gói phổ biến" : plan.name === "Ultimatum" ? "Gói nâng cao" : "Gói đặc biệt",
      highlight: plan.isCurrent,
      isCurrent: plan.isCurrent,
      color: plan.color || fallbackPlanColor(plan.id),
    }
  })
})

const sections = computed(() => {
  return [
    {
      title: "Tính năng chi tiết",
      features: featureRows.value.map(row => {
        const featureTiers: Record<string, boolean | string> = {}
        
        packages.value.forEach(plan => {
          const val = plan.features[row.key]
          if (isBooleanFeature(val)) {
            featureTiers[plan.id] = Boolean(val)
          } else {
            featureTiers[plan.id] = formatFeature(row.key, val)
          }
        })
        
        return {
          title: row.label,
          tiers: featureTiers
        }
      })
    }
  ]
})

const formatMoney = (amount: number, currency: string, currencySymbol: string) =>
  formatCurrency(amount, {
    currency,
    currencySymbol,
    locale: locale.value,
  })

const normalizeFeature = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase())

const isBooleanFeature = (value: unknown) =>
  typeof value === "boolean"

const formatFeature = (key: string, value: boolean | string | number | undefined) => {
  if (value === true) return t("pages.goProPage.featureIncluded")
  if (value === false || value === undefined || value === "") return t("pages.goProPage.featureNotIncluded")

  const numericValue = Number(value)
  if (key === "posts_promotion" && Number.isFinite(numericValue) && numericValue > 0) {
    return `${numericValue} bài viết`
  }
  if (key === "pages_promotion" && Number.isFinite(numericValue) && numericValue > 0) {
    return `${numericValue} trang`
  }
  if (key === "discount" && Number.isFinite(numericValue) && numericValue > 0) {
    return `${numericValue}%`
  }
  if (key === "max_upload" && Number.isFinite(numericValue) && numericValue > 0) {
    return formatUploadLimit(numericValue)
  }

  return String(value)
}

const formatUploadLimit = (bytes: number) => {
  if (bytes >= 1_000_000_000_000) return "Không giới hạn"
  if (bytes >= 1_000_000_000) return `${Math.round(bytes / 1_000_000_000)} GB`
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`
  return `${bytes} B`
}

const fallbackPlanColor = (id: string) => {
  const colors: Record<string, string> = {
    "1": "#4c7737",
    "2": "#ff9800",
    "3": "#e13c4c",
    "4": "#3f4bb8",
  }

  return colors[id] || "#0000ff"
}

const planIcon = (id: string) => {
  const icons: Record<string, string> = {
    "1": "i-ph-star-fill",
    "2": "i-ph-fire-fill",
    "3": "i-ph-lightning-fill",
    "4": "i-ph-rocket-launch-fill",
  }

  return icons[id] || "i-ph-crown-simple-fill"
}
</script>

<style scoped>
.go-pro-page {
  color: var(--text-primary);
}

.go-pro-hero {
  position: relative;
  min-height: 250px;
  overflow: hidden;
  border-radius: 0 0 18px 18px;
  background: linear-gradient(-45deg, #cf861b 0%, #eaa530 100%);
  color: #fff;
  box-shadow: var(--shadow-card);
}

.go-pro-hero__copy {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
  padding: 58px 22px 72px;
  text-align: center;
}

.go-pro-hero h1 {
  margin: 0 0 12px;
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 900;
  line-height: 1;
}

.go-pro-hero h1 span {
  display: inline-block;
  margin-left: 8px;
  transform: translateY(-14px);
  border-radius: 4px;
  background: #fff;
  padding: 2px 6px;
  color: #ea4c89;
  font-size: 15px;
  line-height: 1;
  vertical-align: super;
}

.go-pro-hero p {
  margin: 0;
  font-size: clamp(18px, 2vw, 23px);
  font-weight: 700;
}

.go-pro-hero__rocket {
  position: absolute;
  right: 26px;
  bottom: 14px;
  width: 200px;
  height: 200px;
  object-fit: contain;
  opacity: .8;
}

.go-pro-panel {
  position: relative;
  z-index: 2;
  margin-top: -46px;
  border-radius: 18px;
  background: var(--bg-surface);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.go-pro-warning {
  margin: 0 0 20px;
  border-radius: 10px;
  background: #fff3cd;
  padding: 14px 16px;
  color: #856404;
  font-weight: 700;
}

.go-pro-pick,
.go-pro-features h2 {
  margin: 0 0 24px;
  text-align: center;
  font-size: 25px;
  font-weight: 900;
}

.go-pro-features {
  padding-top: 30px;
}

.go-pro-feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.go-pro-feature-card {
  min-height: 170px;
  border-radius: 16px;
  background: #f7f7f7;
  padding: 22px 16px;
  text-align: center;
}

.go-pro-feature-card img {
  width: 92px;
  height: 92px;
  margin: 0 auto 16px;
  object-fit: contain;
}

.go-pro-feature-card p {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 900;
}

@media (max-width: 768px) {
  .go-pro-page {
    padding-inline: 0;
  }

  .go-pro-hero {
    border-radius: 0;
  }

  .go-pro-hero__rocket {
    right: -36px;
    width: 150px;
    height: 150px;
  }

  .go-pro-panel {
    border-radius: 14px;
    padding: 16px;
  }

  .go-pro-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
