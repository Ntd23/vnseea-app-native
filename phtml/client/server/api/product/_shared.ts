// English description: Product API bridge helpers that normalize PHP product responses.

import { createError, getCookie, type H3Event } from "h3"
import { getBackendBaseCandidates } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import type {
  ProductCategoryOption,
  ProductListing,
  ProductListingCategory,
  ProductMarketplaceResponse,
  ProductSubCategoryOption,
} from "../../../src/product/domain/types/product-marketplace.types"
import type { ProductRecord, ProductCategory, ProductCondition, ProductCurrency } from "../../../src/product/domain/types/product-editor.types"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendProduct = {
  id?: number | string
  post_id?: number | string
  seo_id?: string
  url?: string
  name?: string
  description?: string
  price?: number | string
  price_format?: string
  currency?: string | number
  currency_code?: string
  currency_symbol?: string
  currency_rule?: {
    decimals?: number | string
    decimal_sep?: string
    thousand_sep?: string
  }
  location?: string
  category?: string | number
  category_name?: string
  sub_category?: string | number
  product_sub_category?: string
  type?: number | string
  time?: number | string
  time_text?: string
  distance?: number | string
  rating?: number | string
  units?: number | string
  added_to_cart?: number | string
  is_owner?: number | string
  can_contact_seller?: number | string
  can_add_to_cart?: number | string
  images?: Array<string | { id?: number | string; image?: string; image_org?: string }>
  seller?: {
    id?: number | string
    user_id?: number | string
    name?: string
    username?: string
  }
  user_data?: {
    id?: number | string
    user_id?: number | string
    name?: string
    username?: string
  }
}

type BackendProductsResponse = {
  api_status?: number | string
  products?: BackendProduct[]
  products_categories?: Record<string, string> | string[]
  products_sub_categories?: Record<string, Array<{ id?: number | string; lang?: string }>>
  distance_filter_available?: number | string
  message?: string
  errors?: { error_text?: string }
}

type BackendCurrentUserResponse = {
  api_status?: number | string
  user_data?: {
    user_id?: number | string
  }
}

const categoryVisuals: Record<ProductListingCategory, { icon: string; background: string }> = {
  vehicles: { icon: "i-ph-car-profile", background: "linear-gradient(135deg,#172554 0%,#1d4ed8 48%,#7dd3fc 100%)" },
  home: { icon: "i-ph-armchair", background: "linear-gradient(135deg,#78350f 0%,#b45309 38%,#f59e0b 100%)" },
  beauty: { icon: "i-ph-drop", background: "linear-gradient(135deg,#0369a1 0%,#38bdf8 45%,#bae6fd 100%)" },
  books: { icon: "i-ph-book-open-text", background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 38%,#bfdbfe 100%)" },
  tech: { icon: "i-ph-device-mobile-camera", background: "linear-gradient(135deg,#111827 0%,#4f46e5 42%,#c4b5fd 100%)" },
  food: { icon: "i-ph-bowl-food", background: "linear-gradient(135deg,#7c2d12 0%,#ea580c 40%,#fdba74 100%)" },
}

const defaultVisual = {
  icon: "i-ph-storefront",
  background: "linear-gradient(135deg,#334155 0%,#64748b 48%,#e2e8f0 100%)",
}

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return fallback
}

const isNumericString = (value: string) => /^\d+$/.test(value.trim())

const stripHtml = (value: unknown) =>
  asString(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

const normalizeCurrency = (value: unknown) => {
  const currency = asString(value, "VND").toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : "VND"
}

const getCategoryVisuals = (category: ProductListingCategory) =>
  categoryVisuals[category] || defaultVisual

const inferCategory = (product: BackendProduct): ProductListingCategory => {
  const source = `${asString(product.category_name)} ${asString(product.category)}`.toLowerCase()

  if (/car|vehicle|auto|bike|moto|xe/.test(source)) return "vehicles"
  if (/beauty|health|fashion|làm đẹp|thời trang/.test(source)) return "beauty"
  if (/book|sách/.test(source)) return "books"
  if (/tech|phone|computer|laptop|điện tử/.test(source)) return "tech"
  if (/food|drink|ăn|uống/.test(source)) return "food"
  return "home"
}

const getProductImage = (event: H3Event, product: BackendProduct) => {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const firstImage = Array.isArray(product.images) ? product.images[0] : undefined
  const image = typeof firstImage === "string" ? firstImage : firstImage?.image_org || firstImage?.image

  return resolveMediaUrl(image) || undefined
}

const getProductHref = (event: H3Event, product: BackendProduct) => {
  const rawUrl = asString(product.url).trim()
  const fallbackId = asString(product.seo_id) || asString(product.post_id) || asString(product.id)

  const extractPrettyPostId = (href: string) => {
    try {
      const parsedUrl = new URL(href, "http://localhost/")
      const match = parsedUrl.pathname.match(/^\/post\/([^/]+)\/?$/i)

      return match?.[1] ? decodeURIComponent(match[1]) : ""
    }
    catch {
      const match = href.match(/^\/?post\/([^/]+)\/?$/i)

      return match?.[1] ? decodeURIComponent(match[1]) : ""
    }
  }

  const prettyPostId = rawUrl ? extractPrettyPostId(rawUrl) : ""

  if (prettyPostId) {
    return `/post/${encodeURIComponent(prettyPostId)}`
  }

  if (fallbackId) {
    return `/post/${encodeURIComponent(fallbackId)}`
  }

  return "/products"
}

export const normalizeProductsResponse = (
  event: H3Event,
  response: BackendProductsResponse,
  limit: number,
): ProductMarketplaceResponse => {
  const status = Number(response.api_status ?? 0)

  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: response.errors?.error_text || response.message || "Unable to load products.",
    })
  }

  const products = Array.isArray(response.products) ? response.products : []
  const categoryMap = new Map<string, ProductCategoryOption>()
  const subCategoryMap = new Map<string, ProductSubCategoryOption>()

  Object.entries(response.products_categories ?? {}).forEach(([value, label]) => {
    const categoryId = asString(value)
    const categoryLabel = asString(label)

    if (categoryId && categoryLabel && !isNumericString(categoryLabel)) {
      categoryMap.set(categoryId, {
        value: categoryId,
        label: categoryLabel,
      })
    }
  })

  Object.entries(response.products_sub_categories ?? {}).forEach(([parentId, subCategories]) => {
    if (!Array.isArray(subCategories)) return

    subCategories.forEach((subCategory) => {
      const subCategoryId = asString(subCategory.id)
      const subCategoryLabel = asString(subCategory.lang)

      if (parentId && subCategoryId && subCategoryLabel) {
        subCategoryMap.set(subCategoryId, {
          value: subCategoryId,
          label: subCategoryLabel,
          parentId,
        })
      }
    })
  })

  const items: ProductListing[] = products.map((product) => {
    const category = inferCategory(product)
    const visuals = getCategoryVisuals(category)
    const seller = product.seller || product.user_data
    const time = asNumber(product.time)
    const postedHoursAgo = time > 0 ? Math.max(0, Math.round((Date.now() / 1000 - time) / 3600)) : 0
    const categoryId = asString(product.category, category)
    const categoryLabel = asString(product.category_name) || categoryId
    const subCategoryId = asString(product.sub_category)
    const subCategoryLabel = asString(product.product_sub_category)
    const sellerId = asNumber(seller?.id || seller?.user_id)
    const stock = asNumber(product.units)
    const mine = asNumber(product.is_owner) === 1

    if (categoryId && categoryLabel && !isNumericString(categoryLabel)) {
      const existingCategory = categoryMap.get(categoryId)

      categoryMap.set(categoryId, {
        value: categoryId,
        label: existingCategory?.label || categoryLabel,
      })
    }

    if (subCategoryId && subCategoryLabel) {
      subCategoryMap.set(subCategoryId, {
        value: subCategoryId,
        label: subCategoryLabel,
        parentId: categoryId,
      })
    }

    return {
      id: asNumber(product.id),
      postId: asNumber(product.post_id),
      seoId: asString(product.seo_id),
      href: getProductHref(event, product),
      title: asString(product.name),
      seller: asString(seller?.name) || asString(seller?.username),
      sellerId,
      price: asNumber(product.price),
      currency: normalizeCurrency(product.currency_code || product.currency),
      currencySymbol: asString(product.currency_symbol),
      currencyRule: product.currency_rule,
      priceFormat: asString(product.price_format),
      imageUrl: getProductImage(event, product),
      location: asString(product.location),
      distanceKm: asNumber(product.distance),
      category,
      categoryId,
      categoryLabel,
      subCategoryId,
      subCategoryLabel,
      condition: asNumber(product.type) === 1 ? "Used" : "New",
      description: stripHtml(product.description),
      background: visuals.background,
      icon: visuals.icon,
      postedHoursAgo,
      postedLabel: asString(product.time_text),
      rating: asNumber(product.rating),
      stock,
      addedToCart: asNumber(product.added_to_cart) > 0,
      canContactSeller: asNumber(product.can_contact_seller) === 1,
      canAddToCart: asNumber(product.can_add_to_cart) === 1,
      mine,
    }
  }).filter(product => product.id > 0 && product.title)

  const lastItem = items.at(-1)

  return {
    items,
    hasMore: items.length >= limit,
    nextOffset: lastItem?.id ?? null,
    categories: [...categoryMap.values()],
    subCategories: [...subCategoryMap.values()],
    distanceFilterAvailable: asNumber(response.distance_filter_available) === 1,
  }
}

export const normalizeProductRecord = (event: H3Event, product: BackendProduct): ProductRecord => {
  const categoryVisual = inferCategory(product)
  const condition: ProductCondition = asNumber(product.type) === 1 ? "used" : "new"
  const currency = normalizeCurrency(product.currency_code || product.currency) as ProductCurrency
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const seller = product.seller || product.user_data
  const images = (Array.isArray(product.images) ? product.images : []).map((image, index) => {
    const imageId = typeof image === "string" ? `${asString(product.id)}-${index}` : asString(image.id, `${asString(product.id)}-${index}`)
    const imagePath = typeof image === "string" ? image : image.image_org || image.image

    return {
      id: imageId,
      src: resolveMediaUrl(imagePath),
      alt: asString(product.name),
    }
  }).filter(image => image.src)

  return {
    id: asString(product.id),
    postId: asString(product.post_id),
    seoId: asString(product.seo_id),
    title: asString(product.name),
    description: stripHtml(product.description),
    category: asString(product.category, categoryVisual) as ProductCategory,
    categoryLabel: asString(product.category_name) || asString(product.category),
    subCategoryLabel: asString(product.product_sub_category),
    condition,
    location: asString(product.location),
    currency,
    currencySymbol: asString(product.currency_symbol),
    currencyRule: product.currency_rule,
    priceFormat: asString(product.price_format),
    price: asNumber(product.price),
    stock: asNumber((product as { units?: unknown }).units),
    seller: asString(seller?.name) || asString(seller?.username),
    sellerId: asNumber(seller?.id || seller?.user_id),
    rating: asNumber(product.rating),
    canContactSeller: asNumber(product.can_contact_seller) === 1,
    canAddToCart: asNumber(product.can_add_to_cart) === 1,
    mine: asNumber(product.is_owner) === 1,
    images,
    updatedAt: asString(product.time_text) || asString(product.time),
  }
}

export const assertBackendOk = (response: { api_status?: number | string; count?: number | string; message?: string; errors?: { error_text?: string } }) => {
  const status = Number(response.api_status ?? 0)

  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: response.errors?.error_text || response.message || "Unable to update product.",
    })
  }
}

export const getBackendCurrentUserId = async (event: H3Event) => {
  const backendUserSession = getCookie(event, "user_id")

  if (!backendUserSession) {
    return ""
  }

  const runtimeConfig = useRuntimeConfig(event)
  const baseCandidates = getBackendBaseCandidates(
    String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase),
  )

  for (const baseURL of baseCandidates) {
    try {
      const response = await $fetch<BackendCurrentUserResponse>(backendRoutes.session.currentUser(backendUserSession), {
        baseURL,
      })
      const userId = asString(response.user_data?.user_id)

      if (userId) {
        return userId
      }
    }
    catch {
      // Try the next configured backend base.
    }
  }

  return ""
}
