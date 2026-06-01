import type {
  ProductDistanceValue,
  ProductListing,
  ProductListingCategory,
  ProductSortValue,
} from "../types/product-marketplace.types"

export type ProductMarketplaceFilters = {
  keyword: string
  category: "all" | ProductListingCategory
  subCategory: string
  distance: ProductDistanceValue
}

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const similarityPercent = (left: string, right: string) => {
  if (!left || !right) return 0
  if (left === right) return 100
  if (right.includes(left)) return 92
  if (left.includes(right)) return 84

  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => row === 0 ? col : col === 0 ? row : 0))

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
    }
  }

  const distance = matrix[left.length][right.length]
  const maxLength = Math.max(left.length, right.length)

  return Math.round((1 - distance / maxLength) * 100)
}

const matchesFuzzyKeyword = (keyword: string, fields: string[]) => {
  const normalizedKeyword = normalizeSearchText(keyword)

  if (!normalizedKeyword) return true

  return fields.some((field) => {
    const normalizedField = normalizeSearchText(field)

    return similarityPercent(normalizedKeyword, normalizedField) >= 35
  })
}

export const filterProductListings = (
  products: ProductListing[],
  filters: ProductMarketplaceFilters,
) => {
  const keyword = filters.keyword.trim()

  return products.filter((product) => {
    const matchesKeyword = matchesFuzzyKeyword(keyword, [
      product.title,
      product.description,
      product.seller,
      product.location,
      product.categoryLabel,
      product.subCategoryLabel ?? "",
    ])

    const matchesCategory =
      filters.category === "all" || product.categoryId === filters.category

    const matchesSubCategory =
      !filters.subCategory || product.subCategoryId === filters.subCategory

    const matchesDistance =
      !filters.distance
      || filters.distance === "0"
      || (product.distanceKm > 0 && product.distanceKm <= Number(filters.distance))

    return matchesKeyword && matchesCategory && matchesSubCategory && matchesDistance
  })
}

export const sortProductListings = (
  products: ProductListing[],
  sortBy: ProductSortValue,
) => {
  return products.slice().sort((left, right) => {
    switch (sortBy) {
      case "price_low":
        return left.price - right.price
      case "price_high":
        return right.price - left.price
      case "latest":
      default:
        return left.postedHoursAgo - right.postedHoursAgo || right.id - left.id
    }
  })
}

export const mergeProductMarketplaceResponses = (
  left: { items: ProductListing[]; categories?: { value: string; label: string }[]; subCategories?: { value: string; label: string; parentId: string }[] },
  right: { items: ProductListing[]; categories?: { value: string; label: string }[]; subCategories?: { value: string; label: string; parentId: string }[] },
) => {
  const productMap = new Map<number, ProductListing>()
  const categoryMap = new Map<string, { value: string; label: string }>()
  const subCategoryMap = new Map<string, { value: string; label: string; parentId: string }>()

  for (const product of [...left.items, ...right.items]) {
    productMap.set(product.id, product)
  }

  for (const category of [...(left.categories ?? []), ...(right.categories ?? [])]) {
    categoryMap.set(category.value, category)
  }

  for (const category of [...(left.subCategories ?? []), ...(right.subCategories ?? [])]) {
    subCategoryMap.set(category.value, category)
  }

  return {
    items: [...productMap.values()],
    categories: [...categoryMap.values()],
    subCategories: [...subCategoryMap.values()],
  }
}
