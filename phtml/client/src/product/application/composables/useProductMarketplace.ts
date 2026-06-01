// English description: Product marketplace view helpers aligned with the PHP Wowonder marketplace API.

import { formatCurrency as formatSharedCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { watchDebounced } from "@vueuse/core"
import type {
  ProductCategory,
  ProductDistanceValue,
  ProductListing,
  ProductOverviewCard,
  ProductSelectOption,
  ProductSortValue,
} from "../../domain/types/product-marketplace.types"
import {
  filterProductListings,
  mergeProductMarketplaceResponses,
  sortProductListings,
} from "../../domain/services/product-marketplace.service"
import { createApiProductRepository } from "../../infrastructure/repositories/ApiProductRepository"

export const useProductMarketplace = (
  repository = createApiProductRepository(),
) => {
  const { t, locale } = useI18n()
  const route = useRoute()
  const toast = useToast()

  const search = ref("")
  const sortBy = ref<ProductSortValue>("latest")
  const selectedCategory = ref<ProductCategory>(String(route.query.c_id || "all"))
  const selectedSubCategory = ref(String(route.query.sub_id || ""))
  const selectedDistance = ref<ProductDistanceValue>("0")
  const distanceRange = ref(0)
  const cartLoadingProductId = ref<number | null>(null)
  const isLoadingMore = ref(false)
  const hasShownDistanceUnavailableToast = ref(false)

  const { data: productData, status, error, refresh } = useAsyncData(
    "product:marketplace",
    () => repository.list({
      keyword: search.value,
      category: selectedCategory.value,
      subCategory: selectedSubCategory.value,
      distance: selectedDistance.value,
      sort: sortBy.value,
      limit: 35,
    }),
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

  const sortOptions = computed<ProductSelectOption<ProductSortValue>[]>(() => [
    { label: t("pages.productsPage.sortBy"), value: "latest" },
    { label: t("pages.productsPage.sortPriceAsc"), value: "price_low" },
    { label: t("pages.productsPage.sortPriceDesc"), value: "price_high" },
  ])

  const categoryOptions = computed<ProductSelectOption<ProductCategory>[]>(() => [
    { label: t("pages.productsPage.categoryType"), value: "all" },
    ...(productData.value?.categories ?? []),
  ])

  const subCategoryOptions = computed<ProductSelectOption<string>[]>(() =>
    (productData.value?.subCategories ?? [])
      .filter(option => selectedCategory.value !== "all" && option.parentId === selectedCategory.value)
      .map(option => ({ label: option.label, value: option.value })),
  )

  const hasSubCategories = computed(() => subCategoryOptions.value.length > 0)
  const products = computed(() => productData.value?.items ?? [])

  const heroStats = computed<ProductOverviewCard[]>(() => [
    {
      label: t("pages.productsPage.statActiveStores"),
      value: String(products.value.length),
      icon: "i-ph-storefront-fill",
      description: t("pages.productsPage.statActiveStoresDescription"),
    },
    {
      label: t("pages.productsPage.statFeatured"),
      value: String(products.value.filter(item => item.stock > 0).length),
      icon: "i-ph-seal-check-fill",
      description: t("pages.productsPage.statFeaturedDescription"),
    },
    {
      label: t("pages.productsPage.statMine"),
      value: String(products.value.filter(item => item.mine).length),
      icon: "i-ph-package-fill",
      description: t("pages.productsPage.statMineDescription"),
    },
  ])

  const heroMainStat = computed(() => heroStats.value[0])
  const heroSecondaryStats = computed(() => heroStats.value.slice(1))
  const nearbyCount = computed(() => products.value.filter(item => item.distanceKm > 0 && item.distanceKm <= 5).length)

  const currentSortLabel = computed(
    () => sortBy.value === "latest"
      ? t("pages.productsPage.sortLatest")
      : sortOptions.value.find(option => option.value === sortBy.value)?.label ?? t("pages.productsPage.sortLatest"),
  )

  const resultHeading = computed(() => t("pages.productsPage.resultHeading"))

  const visibleProducts = computed(() => sortProductListings(filterProductListings(products.value, {
    keyword: search.value,
    category: selectedCategory.value,
    subCategory: selectedSubCategory.value,
    distance: selectedDistance.value,
  }), sortBy.value))

  const hasMore = computed(() => Boolean(productData.value?.hasMore && productData.value.nextOffset))
  const distanceFilterUnavailable = computed(() =>
    selectedDistance.value !== "0" && productData.value?.distanceFilterAvailable === false,
  )

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

  const formatDistance = (value: number) =>
    value > 0
      ? t("pages.productsPage.distanceKm", {
        value: value.toLocaleString(locale.value === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 1 }),
      })
      : ""

  const getErrorMessage = (error: unknown) => {
    const fetchError = error as {
      data?: { statusMessage?: string; message?: string }
      statusMessage?: string
      message?: string
    }

    return fetchError.data?.statusMessage
      || fetchError.data?.message
      || fetchError.statusMessage
      || fetchError.message
      || ""
  }

  const resetFilters = () => {
    search.value = ""
    sortBy.value = "latest"
    selectedCategory.value = "all"
    selectedSubCategory.value = ""
    selectedDistance.value = "0"
    distanceRange.value = 0
  }

  const applyDistance = () => {
    selectedDistance.value = String(distanceRange.value)

    if (
      distanceRange.value > 0
      && productData.value?.distanceFilterAvailable === false
      && !hasShownDistanceUnavailableToast.value
    ) {
      hasShownDistanceUnavailableToast.value = true
      toast.add({
        title: t("pages.productsPage.distanceUnavailableTitle"),
        description: t("pages.productsPage.distanceUnavailableDescription"),
        color: "warning",
        icon: "i-ph-map-pin-line",
      })
    }
  }

  const addToCart = async (productId: number) => {
    cartLoadingProductId.value = productId

    try {
      await repository.addToCart(productId)
      toast.add({
        title: t("pages.productsPage.addToCart"),
        color: "success",
      })
      await navigateTo(appRoutes.checkout)
    }
    catch (error) {
      const message = getErrorMessage(error)

      if (/already\s+in\s+cart/i.test(message)) {
        await navigateTo(appRoutes.checkout)
        return
      }

      toast.add({
        title: t("pages.productsPage.addToCart"),
        description: message || t("pages.productsPage.loadErrorTitle"),
        color: "error",
        icon: "i-ph-warning-circle",
      })
    }
    finally {
      cartLoadingProductId.value = null
    }
  }

  const loadMore = async () => {
    if (!productData.value?.nextOffset || isLoadingMore.value) return

    isLoadingMore.value = true

    try {
      const nextPage = await repository.list({
        keyword: search.value,
        category: selectedCategory.value,
        subCategory: selectedSubCategory.value,
        distance: selectedDistance.value,
        sort: sortBy.value,
        limit: 35,
        offset: productData.value.nextOffset,
      })
      const merged = mergeProductMarketplaceResponses(productData.value, nextPage)

      productData.value = {
        ...nextPage,
        items: merged.items,
        categories: merged.categories,
        subCategories: merged.subCategories,
      }
    }
    finally {
      isLoadingMore.value = false
    }
  }

  const openSellerChat = (product: ProductListing) => {
    if (!product.sellerId) return

    void navigateTo({
      path: appRoutes.messages,
      query: {
        userId: String(product.sellerId),
        name: product.seller,
        productId: String(product.id),
      },
    })
  }

  watch(selectedCategory, () => {
    selectedSubCategory.value = ""
  })

  watchDebounced(
    [search, selectedCategory, selectedSubCategory, selectedDistance, sortBy],
    () => {
      refresh()
    },
    { debounce: 350, maxWait: 1000 },
  )

  return {
    search,
    sortBy,
    selectedCategory,
    selectedSubCategory,
    selectedDistance,
    distanceRange,
    sortOptions,
    categoryOptions,
    subCategoryOptions,
    hasSubCategories,
    heroMainStat,
    heroSecondaryStats,
    nearbyCount,
    currentSortLabel,
    resultHeading,
    visibleProducts,
    status,
    error,
    hasMore,
    distanceFilterUnavailable,
    cartLoadingProductId,
    isLoadingMore,
    formatProductCurrency,
    formatDistance,
    resetFilters,
    applyDistance,
    addToCart,
    loadMore,
    openSellerChat,
  }
}
