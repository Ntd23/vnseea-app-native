<!-- English description: Backend payment history list for withdrawal requests. -->
<template>
  <section class="withdrawal-history">
    <div class="withdrawal-history__header">
      <div>
        <p class="withdrawal-history__eyebrow">{{ t("pages.withdrawalPage.historyEyebrow") }}</p>
        <h2 class="withdrawal-history__title">{{ t("pages.withdrawalPage.paymentHistory") }}</h2>
      </div>
    </div>

    <div v-if="items.length" class="withdrawal-history__filters">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="withdrawal-history__filter"
        :class="{ 'withdrawal-history__filter--active': activeFilter === filter.value }"
        @click="setFilter(filter.value)"
      >
        <Icon :name="filter.icon" class="h-4 w-4" />
        <span>{{ filter.label }}</span>
        <strong>{{ filter.count }}</strong>
      </button>
    </div>

    <template v-if="filteredItems.length">
      <div class="withdrawal-history__list">
        <div
          v-for="item in paginatedItems"
          :key="item.id"
          class="withdrawal-history__item"
        >
          <div class="withdrawal-history__icon" :class="statusIconClass(item.status)">
            <Icon :name="statusIcon(item.status)" class="h-5 w-5" />
          </div>

          <div class="withdrawal-history__content">
            <div class="withdrawal-history__row">
              <div class="min-w-0">
                <p class="withdrawal-history__name">{{ itemTitle(item) }}</p>
                <p class="withdrawal-history__meta">
                  <span v-if="formattedRequestedAt(item)">{{ formattedRequestedAt(item) }}</span>
                </p>
              </div>
              <div class="withdrawal-history__side">
                <p class="withdrawal-history__amount">-{{ formatHistoryAmount(item.amount) }}</p>
                <span class="withdrawal-history__status" :class="statusBadgeClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="pageCount > 1" class="withdrawal-history__pagination">
        <button
          type="button"
          class="withdrawal-history__page-btn"
          :disabled="currentPage === 1"
          @click="currentPage -= 1"
        >
          <Icon name="i-ph-caret-left-bold" class="h-4 w-4" />
        </button>
        <button
          v-for="page in pageCount"
          :key="page"
          type="button"
          class="withdrawal-history__page"
          :class="{ 'withdrawal-history__page--active': currentPage === page }"
          @click="currentPage = page"
        >
          {{ page }}
        </button>
        <button
          type="button"
          class="withdrawal-history__page-btn"
          :disabled="currentPage === pageCount"
          @click="currentPage += 1"
        >
          <Icon name="i-ph-caret-right-bold" class="h-4 w-4" />
        </button>
      </div>
    </template>

    <div v-else class="withdrawal-history__empty">
      <Icon name="i-ph-clock-counter-clockwise-duotone" class="mx-auto h-10 w-10 text-[var(--icon-secondary)]" />
      <p class="mt-3 text-body-secondary">{{ t("pages.withdrawalPage.noHistory") }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type {
  WithdrawalCurrencyRule,
  WithdrawalHistoryItem,
  WithdrawalStatus,
} from "../../domain/types/withdrawal.types"

const props = defineProps<{
  items: WithdrawalHistoryItem[]
  currency: string
  currencySymbol: string
  currencyRule: WithdrawalCurrencyRule
}>()

const { t, locale } = useI18n()
const pageSize = 10
const currentPage = ref(1)
const activeFilter = ref("all")

const formatHistoryAmount = (amount: number) =>
  formatCurrency(Math.abs(amount), {
    currency: props.currency,
    currencySymbol: props.currencySymbol,
    currencyRule: props.currencyRule,
    locale: locale.value,
  })

const statusLabel = (status: WithdrawalStatus) => {
  if (status === "approved") return t("pages.withdrawalPage.statusApproved")
  if (status === "declined") return t("pages.withdrawalPage.statusDeclined")
  return t("pages.withdrawalPage.statusPending")
}

const relativeFormatter = computed(() =>
  new Intl.RelativeTimeFormat(locale.value, { numeric: "auto" }),
)

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
)

const formattedRequestedAt = (item: WithdrawalHistoryItem) => {
  if (!item.requestedAt) return item.requested || ""

  const requestedDate = new Date(item.requestedAt * 1000)
  const diffSeconds = Math.max(0, Math.floor((Date.now() - requestedDate.getTime()) / 1000))

  if (diffSeconds >= 86400) {
    return dateFormatter.value.format(requestedDate)
  }

  if (diffSeconds < 60) {
    return relativeFormatter.value.format(-Math.max(1, diffSeconds), "second")
  }

  if (diffSeconds < 3600) {
    return relativeFormatter.value.format(-Math.floor(diffSeconds / 60), "minute")
  }

  return relativeFormatter.value.format(-Math.floor(diffSeconds / 3600), "hour")
}

const countByFilter = (value: string) =>
  value === "all"
    ? props.items.length
    : props.items.filter(item => item.status === value).length

const filters = computed(() => [
  { value: "all", label: t("pages.walletPage.filterAll"), icon: "i-ph-list-bullets-duotone", count: countByFilter("all") },
  { value: "pending", label: t("pages.withdrawalPage.statusPending"), icon: "i-ph-clock-countdown-duotone", count: countByFilter("pending") },
  { value: "approved", label: t("pages.withdrawalPage.statusApproved"), icon: "i-ph-check-circle-duotone", count: countByFilter("approved") },
  { value: "declined", label: t("pages.withdrawalPage.statusDeclined"), icon: "i-ph-x-circle-duotone", count: countByFilter("declined") },
])

const filteredItems = computed(() =>
  activeFilter.value === "all"
    ? props.items
    : props.items.filter(item => item.status === activeFilter.value),
)

const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / pageSize)),
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})

watch([filteredItems, () => props.items.length], () => {
  if (currentPage.value > pageCount.value) {
    currentPage.value = pageCount.value
  }
})

function setFilter(value: string) {
  activeFilter.value = value
  currentPage.value = 1
}

const itemTarget = (item: WithdrawalHistoryItem) =>
  item.transferInfo || "-"

const itemTitle = (item: WithdrawalHistoryItem) => {
  const method = item.method.toLowerCase()

  if (method === "sepay") {
    return t("pages.withdrawalPage.historySepayTitle", { account: itemTarget(item) })
  }

  if (method === "paypal" || method === "p_paypal") {
    return t("pages.withdrawalPage.historyPaypalTitle", { email: itemTarget(item) })
  }

  return t("pages.withdrawalPage.historyGenericTitle", { target: itemTarget(item) })
}

const statusIcon = (status: WithdrawalStatus) => {
  if (status === "approved") return "i-ph-check-circle-duotone"
  if (status === "declined") return "i-ph-x-circle-duotone"
  return "i-ph-clock-countdown-duotone"
}

const statusIconClass = (status: WithdrawalStatus) => {
  if (status === "approved") return "withdrawal-history__icon--approved"
  if (status === "declined") return "withdrawal-history__icon--declined"
  return "withdrawal-history__icon--pending"
}

const statusBadgeClass = (status: WithdrawalStatus) => {
  if (status === "approved") return "withdrawal-history__status--approved"
  if (status === "declined") return "withdrawal-history__status--declined"
  return "withdrawal-history__status--pending"
}
</script>

<style scoped>
.withdrawal-history {
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.withdrawal-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.withdrawal-history__eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.withdrawal-history__title {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.withdrawal-history__filters {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.withdrawal-history__filter {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-height: 38px;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 8px 10px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.withdrawal-history__filter > *,
.withdrawal-history__page > *,
.withdrawal-history__page-btn > * {
  pointer-events: none;
}

.withdrawal-history__filter strong {
  min-width: 22px;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 2px 6px;
  color: #0f172a;
  font-size: 11px;
  text-align: center;
}

.withdrawal-history__filter--active {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.withdrawal-history__filter--active strong {
  background: rgba(0, 0, 255, 0.1);
  color: #0000ff;
}

.withdrawal-history__list {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.withdrawal-history__item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  border-radius: 14px;
  padding: 12px;
  transition: all 0.15s ease;
}

.withdrawal-history__item:hover {
  background: rgba(0, 0, 255, 0.03);
}

.withdrawal-history__icon {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
}

.withdrawal-history__icon--approved {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.withdrawal-history__icon--pending {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.withdrawal-history__icon--declined {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.withdrawal-history__content {
  min-width: 0;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}

.withdrawal-history__item:last-child .withdrawal-history__content {
  border-bottom: 0;
  padding-bottom: 0;
}

.withdrawal-history__row {
  display: grid;
  gap: 8px;
}

.withdrawal-history__name {
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.withdrawal-history__meta {
  margin-top: 3px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.withdrawal-history__side {
  display: grid;
  justify-items: start;
  gap: 6px;
}

.withdrawal-history__amount {
  font-size: 14px;
  font-weight: 800;
  color: #dc2626;
  font-variant-numeric: tabular-nums;
}

.withdrawal-history__status {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 800;
}

.withdrawal-history__status--approved {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.withdrawal-history__status--pending {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.withdrawal-history__status--declined {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.withdrawal-history__empty {
  margin-top: 14px;
  border-radius: 14px;
  background: #fafbfe;
  padding: 32px;
  text-align: center;
}

.withdrawal-history__pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 14px;
}

.withdrawal-history__page,
.withdrawal-history__page-btn {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.withdrawal-history__page--active {
  border-color: #0000ff;
  background: #0000ff;
  color: #ffffff;
}

.withdrawal-history__page-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (min-width: 640px) {
  .withdrawal-history {
    padding: 20px;
  }

  .withdrawal-history__row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .withdrawal-history__side {
    justify-items: end;
  }
}
</style>
