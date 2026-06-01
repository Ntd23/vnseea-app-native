// English description: Domain types for backend-backed Pro packages and legacy migration shapes.

export type BillingCycle = "monthly" | "yearly"
export type ProPlanKey = "starter" | "creator" | "business"
export type PaymentMethodKey = "wallet" | "card" | "bank"

export type ProPlan = {
  id: ProPlanKey
  name: string
  badge: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  highlight: boolean
  features: string[]
  limits: { label: string; value: string }[]
}

export type ProComparisonRow = {
  label: string
} & Record<ProPlanKey, boolean>

export type ProPaymentMethod = {
  label: string
  value: PaymentMethodKey
  icon: string
}

export type ProSubscriptionSummary = {
  plan: string
  status: string
  renewsAt: string
}

export type ProCheckoutPayload = {
  planId: ProPlanKey
  billingCycle: BillingCycle
  paymentMethod: PaymentMethodKey
  amount: number
}

export type GoProFeatureValue = boolean | string | number

export type GoProPackage = {
  id: string
  name: string
  price: number
  currency: string
  currencySymbol: string
  color: string
  image: string
  nightImage: string
  features: Record<string, GoProFeatureValue>
  isCurrent: boolean
}

export type GoProCatalog = {
  packages: GoProPackage[]
  membershipSystem: boolean
  currentIsPro: boolean
}

export type GoProUpgradeDraft = {
  type: string
}
