// English description: Product editor option metadata and shared price preview formatting.

import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type {
  CategoryValue,
  ConditionValue,
  CurrencyValue,
  ProductCategoryMeta,
  ProductCurrencyMeta,
  ProductOption,
} from "../../domain/types/product-editor.types"

const currencyOptions = [
  { label: "USD ($)", value: "USD" },
  { label: "VND (₫)", value: "VND" },
  { label: "EUR (€)", value: "EUR" },
] satisfies ProductOption<CurrencyValue>[]

const currencyMeta: Record<CurrencyValue, ProductCurrencyMeta> = {
  USD: { label: "USD ($)", locale: "en-US" },
  VND: { label: "VND (₫)", locale: "vi-VN" },
  EUR: { label: "EUR (€)", locale: "de-DE" },
}

export const useProductEditorMeta = () => {
  const { t } = useI18n()

  const categoryOptions = computed(() => [
    { label: t("pages.productEditor.categoryHome"), value: "home" },
    { label: t("pages.productEditor.categoryTech"), value: "tech" },
    { label: t("pages.productEditor.categoryBeauty"), value: "beauty" },
    { label: t("pages.productEditor.categoryBooks"), value: "books" },
    { label: t("pages.productEditor.categoryVehicles"), value: "vehicles" },
    { label: t("pages.productEditor.categoryFood"), value: "food" },
  ] satisfies ProductOption<CategoryValue>[])

  const conditionOptions = computed(() => [
    { label: t("pages.productEditor.conditionNew"), value: "new" },
    { label: t("pages.productEditor.conditionLikeNew"), value: "like-new" },
    { label: t("pages.productEditor.conditionUsed"), value: "used" },
  ] satisfies ProductOption<ConditionValue>[])

  const categoryMeta = computed<Record<CategoryValue, ProductCategoryMeta>>(() => ({
    home: {
      label: t("pages.productEditor.categoryHome"),
      icon: "i-ph-armchair-fill",
      background: "linear-gradient(135deg,#78350f 0%,#b45309 38%,#f59e0b 100%)",
    },
    tech: {
      label: t("pages.productEditor.categoryTech"),
      icon: "i-ph-device-mobile-camera-fill",
      background: "linear-gradient(135deg,#111827 0%,#4f46e5 42%,#c4b5fd 100%)",
    },
    beauty: {
      label: t("pages.productEditor.categoryBeauty"),
      icon: "i-ph-drop-fill",
      background: "linear-gradient(135deg,#0369a1 0%,#38bdf8 45%,#bae6fd 100%)",
    },
    books: {
      label: t("pages.productEditor.categoryBooks"),
      icon: "i-ph-book-open-text-fill",
      background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 38%,#bfdbfe 100%)",
    },
    vehicles: {
      label: t("pages.productEditor.categoryVehicles"),
      icon: "i-ph-car-profile-fill",
      background: "linear-gradient(135deg,#172554 0%,#1d4ed8 48%,#7dd3fc 100%)",
    },
    food: {
      label: t("pages.productEditor.categoryFood"),
      icon: "i-ph-bowl-food-fill",
      background: "linear-gradient(135deg,#7c2d12 0%,#ea580c 40%,#fdba74 100%)",
    },
  }))

  const conditionMap = computed<Record<ConditionValue, string>>(() => ({
    new: t("pages.productEditor.conditionNew"),
    "like-new": t("pages.productEditor.conditionLikeNew"),
    used: t("pages.productEditor.conditionUsed"),
  }))

  const formatProductPrice = (price: string, currency: CurrencyValue) => {
    const parsed = Number(price)
    if (!Number.isFinite(parsed) || parsed <= 0) return t("pages.productEditor.priceUnset")

    return formatCurrency(parsed, {
      currency,
      locale: currencyMeta[currency].locale,
    })
  }

  const formatProductStockLabel = (stock: string) => {
    const parsed = Number(stock)
    if (!Number.isFinite(parsed) || parsed <= 0) return t("pages.productEditor.stockUnset")
    return t("pages.productEditor.stockUnits", { count: parsed })
  }

  return {
    categoryOptions,
    conditionOptions,
    currencyOptions,
    categoryMeta,
    conditionMap,
    currencyMeta,
    formatProductPrice,
    formatProductStockLabel,
  }
}
