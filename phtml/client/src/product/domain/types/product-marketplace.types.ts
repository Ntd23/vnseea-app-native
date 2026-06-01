// English description: Product marketplace domain types shared by view models and repositories.

export type ProductCategory = "all" | string

export type ProductListingCategory = string

export type ProductSortValue = "latest" | "price_low" | "price_high"

export type ProductDistanceValue = "0" | string

export type ProductListing = {
  id: number
  postId?: number
  seoId?: string
  href: string
  title: string
  seller: string
  sellerId?: number
  price: number
  currency?: string
  currencySymbol?: string
  currencyRule?: {
    decimals?: number | string
    decimal_sep?: string
    thousand_sep?: string
  }
  priceFormat?: string
  imageUrl?: string
  location: string
  distanceKm: number
  category: ProductListingCategory
  categoryId: string
  categoryLabel: string
  subCategoryId?: string
  subCategoryLabel?: string
  condition: string
  description: string
  background: string
  icon: string
  postedHoursAgo: number
  postedLabel: string
  rating: number
  stock: number
  addedToCart: boolean
  canContactSeller: boolean
  canAddToCart: boolean
  mine?: boolean
}

export type ProductMarketplaceQuery = {
  keyword?: string
  category?: ProductCategory
  subCategory?: string
  distance?: ProductDistanceValue
  sort?: ProductSortValue
  limit?: number
  offset?: number | string
  mine?: boolean
}

export type ProductCategoryOption = {
  label: string
  value: string
}

export type ProductSubCategoryOption = ProductCategoryOption & {
  parentId: string
}

export type ProductMarketplaceResponse = {
  items: ProductListing[]
  hasMore: boolean
  nextOffset: number | null
  categories: ProductCategoryOption[]
  subCategories: ProductSubCategoryOption[]
  distanceFilterAvailable?: boolean
}

export type ProductSelectOption<T extends string> = {
  label: string
  value: T
}

export type ProductCategoryChip = {
  label: string
  value: ProductCategory
  icon: string
}

export type ProductOverviewCard = {
  label: string
  value: string
  icon: string
  description: string
}
