// English description: My-products overview view model backed by the product API bridge.

import { formatCurrency as formatSharedCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { ProductCategory, ProductListing, ProductOverviewCard, ProductSelectOption, ProductSortValue } from "../../domain/types/product-marketplace.types"
import {
  filterProductListings,
  sortProductListings,
} from "../../domain/services/product-marketplace.service"
import { createApiProductRepository } from "../../infrastructure/repositories/ApiProductRepository"

export const useMyProductsOverview = (
  repository = createApiProductRepository(),
) => {
  const { t, locale } = useI18n()
  const toast = useToast()
  const search = ref("")
  const sortBy = ref<ProductSortValue>("latest")
  const selectedCategory = ref<ProductCategory>("all")
  const deletingProductId = ref<number | null>(null)
  const { data, status, error, refresh } = useAsyncData(
    "product:mine:overview",
    () => repository.list({ mine: true, limit: 50 }),
    {
      default: () => ({
        items: [],
        hasMore: false,
        nextOffset: null,
        categories: [],
        subCategories: [],
        distanceFilterAvailable: false,
      }),
    },
  )

  const products = computed(() => data.value?.items ?? [])
  const categoryOptions = computed<ProductSelectOption<ProductCategory>[]>(() => [
    { label: t("pages.myProductsPage.allCategories"), value: "all" },
    ...(data.value?.categories ?? []),
  ])
  const sortOptions = computed<ProductSelectOption<ProductSortValue>[]>(() => [
    { label: t("pages.myProductsPage.sortLatest"), value: "latest" },
    { label: t("pages.myProductsPage.sortPriceAsc"), value: "price_low" },
    { label: t("pages.myProductsPage.sortPriceDesc"), value: "price_high" },
  ])
  const visibleProducts = computed(() => sortProductListings(filterProductListings(products.value, {
    keyword: search.value,
    category: selectedCategory.value,
    subCategory: "",
    distance: "0",
  }), sortBy.value))

  const overviewCards = computed<ProductOverviewCard[]>(() => [
    {
      label: t("pages.myProductsPage.activeListings"),
      value: String(products.value.length),
      icon: "i-ph-tag-duotone",
      description: t("pages.myProductsPage.activeListingsDescription"),
    },
    {
      label: t("pages.myProductsPage.drafts"),
      value: "0",
      icon: "i-ph-note-blank-duotone",
      description: t("pages.myProductsPage.draftsDescription"),
    },
    {
      label: t("pages.myProductsPage.sold"),
      value: "0",
      icon: "i-ph-check-circle-duotone",
      description: t("pages.myProductsPage.soldDescription"),
    },
  ])

  const formatProductCurrency = (product: ProductListing) => {
    if (product.priceFormat) {
      const symbol = product.currencySymbol?.trim()

      return symbol ? `${symbol}${product.priceFormat}` : product.priceFormat
    }

    return formatSharedCurrency(product.price, {
      currency: product.currency || "VND",
      currencySymbol: product.currencySymbol,
      currencyRule: product.currencyRule,
      locale: locale.value,
    })
  }

  const deleteProduct = async (productId: number) => {
    if (deletingProductId.value) return

    deletingProductId.value = productId

    try {
      await repository.delete(productId)

      if (data.value) {
        data.value = {
          ...data.value,
          items: data.value.items.filter(product => product.id !== productId),
        }
      }

      toast.add({
        title: t("pages.myProductsPage.deleteSuccessTitle"),
        color: "success",
        icon: "i-ph-check-circle",
      })
    }
    catch (deleteError) {
      toast.add({
        title: t("pages.myProductsPage.deleteErrorTitle"),
        description: deleteError instanceof Error ? deleteError.message : String(deleteError),
        color: "error",
        icon: "i-ph-warning-circle",
      })
    }
    finally {
      deletingProductId.value = null
    }
  }

  return {
    overviewCards,
    products,
    visibleProducts,
    status,
    error,
    refresh,
    search,
    sortBy,
    selectedCategory,
    categoryOptions,
    sortOptions,
    deletingProductId,
    formatProductCurrency,
    deleteProduct,
  }
}
