import { computed } from "vue"
import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"
import type {
  BillingCycle,
  PaymentMethodKey,
  ProComparisonRow,
  ProPaymentMethod,
  ProPlan,
  ProPlanKey,
  ProSubscriptionSummary,
} from "../../domain/types/go-pro.types"

export const defaultBillingCycle: BillingCycle = "yearly"

export const billingCycleKeys = [
  "monthly",
  "yearly",
] as const satisfies BillingCycle[]

export const proPlanKeys = [
  "starter",
  "creator",
  "business",
] as const satisfies ProPlanKey[]

export const paymentMethodKeys = [
  "wallet",
  "card",
  "bank",
] as const satisfies PaymentMethodKey[]

export const readGoProQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

export const normalizeBillingCycle = (value: string): BillingCycle => {
  if (billingCycleKeys.includes(value as BillingCycle)) {
    return value as BillingCycle
  }

  return defaultBillingCycle
}

export const normalizeProPlanKey = (value: string): ProPlanKey | "" => {
  if (proPlanKeys.includes(value as ProPlanKey)) {
    return value as ProPlanKey
  }

  return ""
}

export const getProPlanPrice = (plan: ProPlan, billingCycle: BillingCycle) =>
  billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice

export const getProSavingsPercent = (plan: ProPlan) => {
  const fullYearMonthly = plan.monthlyPrice * 12

  if (fullYearMonthly <= 0 || plan.yearlyPrice <= 0) return 0

  return Math.max(
    0,
    Math.round(((fullYearMonthly - plan.yearlyPrice) / fullYearMonthly) * 100),
  )
}

export const useMockGoProData = () => {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  const plans = computed(() => localized<ProPlan[]>("pages.goProPage.plans"))

  const comparisonRows = computed(() =>
    localized<ProComparisonRow[]>("pages.goProPage.comparisonRows"),
  )

  const paymentMethods = computed(() =>
    localized<ProPaymentMethod[]>("pages.goProPage.paymentMethods"),
  )

  const currentSubscription = computed(() =>
    localized<ProSubscriptionSummary>("pages.goProPage.currentSubscription"),
  )

  return {
    plans,
    comparisonRows,
    paymentMethods,
    currentSubscription,
  }
}

export const formatProCurrency = (value: number, locale = "vi") =>
  new Intl.NumberFormat(locale.toLowerCase().startsWith("en") ? "en-US" : "vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)
