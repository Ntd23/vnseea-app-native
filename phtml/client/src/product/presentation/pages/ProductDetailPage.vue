<!-- English description: Wowonder-aligned Nuxt product detail page backed by the PHP product API bridge. -->

<template>
  <div class="product-detail-page mx-auto w-full max-w-[1180px] px-3 pb-12 pt-4 sm:px-4">
    <button type="button" class="product-detail-back" @click="goBack">
      <Icon name="i-ph-arrow-left" class="h-5 w-5" />
      Quay lại
    </button>

    <div v-if="status === 'pending'" class="product-detail-card">
      <USkeleton class="product-detail-main-image" />
      <div class="product-detail-summary">
        <USkeleton class="h-8 w-3/4 rounded" />
        <USkeleton class="mt-3 h-7 w-40 rounded" />
        <USkeleton class="mt-8 h-24 w-full rounded" />
      </div>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-ph-warning-circle"
      title="Không tải được sản phẩm"
      :description="String(error)"
    />

    <UAlert
      v-else-if="!product"
      color="neutral"
      variant="soft"
      icon="i-ph-shopping-bag-open"
      title="Không tìm thấy sản phẩm"
      description="Sản phẩm này không tồn tại hoặc đã bị xóa."
    />

    <template v-else>
      <article class="product-detail-card">
        <section class="product-detail-gallery">
          <button
            type="button"
            class="product-detail-main-button"
            @click="openImage"
          >
            <img
              v-if="mainImage && !mainImageFailed"
              :src="mainImage.src"
              :alt="mainImage.alt || product.title"
              class="product-detail-main-image"
              @error="mainImageFailed = true"
            >
            <div v-else class="product-detail-main-image product-detail-main-image--empty">
              <Icon name="i-ph-image-square" class="h-12 w-12" />
              <span>{{ product.title }}</span>
            </div>
          </button>

          <div v-if="product.images?.length" class="product-detail-thumbs">
            <button
              v-for="image in product.images"
              :key="image.id"
              type="button"
              class="product-detail-thumb"
              :class="{ 'product-detail-thumb--active': image.id === mainImage?.id }"
              @click="selectImage(image.id)"
            >
              <img :src="image.src" :alt="image.alt || product.title">
            </button>
          </div>
        </section>

        <section class="product-detail-summary">
          <h1 class="product-detail-title">{{ product.title }}</h1>
          <div class="product-detail-price">{{ formattedPrice }}</div>

          <div class="product-detail-rating">
            <span class="product-detail-stars" :aria-label="`${ratingValue} sao`">
              <Icon
                v-for="star in 5"
                :key="star"
                name="i-ph-star-fill"
                class="h-4 w-4"
                :class="star <= ratingValue ? 'text-[#f6b600]' : 'text-[#d6deea]'"
              />
            </span>
            <button type="button">0 đánh giá</button>
          </div>

          <div v-if="product.seller" class="product-detail-seller">
            <span class="product-detail-seller-avatar">
              {{ product.seller.slice(0, 1).toUpperCase() }}
            </span>
            <div>
              <p>Đăng bởi</p>
              <strong>{{ product.seller }}</strong>
            </div>
          </div>

          <div class="product-detail-actions">
            <UButton
              v-if="product.canContactSeller"
              color="neutral"
              variant="soft"
              icon="i-ph-chat-text-fill"
              class="product-detail-action"
              @click="openSellerChat"
            >
              Liên hệ người bán
            </UButton>
            <UButton
              v-if="product.canAddToCart"
              color="primary"
              icon="i-ph-shopping-cart-simple-fill"
              class="product-detail-action"
              :loading="cartLoading"
              @click="addProductToCart"
            >
              Mua ngay
            </UButton>
            <NuxtLink
              v-if="product.mine"
              :to="`/edit-product/${product.id}`"
              class="product-detail-edit"
            >
              <Icon name="i-ph-pencil-simple-fill" class="h-5 w-5" />
              Sửa sản phẩm
            </NuxtLink>
          </div>

          <ul class="product-detail-info">
            <li v-if="product.location">
              <span><Icon name="i-ph-map-pin-fill" class="text-[#8bc34a]" /> Vị trí</span>
              <strong>{{ product.location }}</strong>
            </li>
            <li>
              <span><Icon name="i-ph-package-fill" class="text-[#9c27b0]" /> Trạng thái</span>
              <strong>{{ stockLabel }}</strong>
            </li>
            <li>
              <span><Icon name="i-ph-tag-fill" class="text-[#2196f3]" /> Loại</span>
              <strong>{{ conditionLabel }}</strong>
            </li>
            <li v-if="product.categoryLabel">
              <span><Icon name="i-ph-storefront-fill" class="text-[#ff9800]" /> Danh mục</span>
              <strong>{{ categoryLabel }}</strong>
            </li>
          </ul>
        </section>

        <section class="product-detail-section">
          <h2>
            <Icon name="i-ph-info-fill" class="h-5 w-5" />
            Chi tiết
          </h2>
          <p v-if="product.description">{{ product.description }}</p>
          <p v-else class="product-detail-muted">Sản phẩm chưa có mô tả.</p>
        </section>

        <section v-if="mapUrl" class="product-detail-section">
          <h2>
            <Icon name="i-ph-map-trifold-fill" class="h-5 w-5" />
            Bản đồ
          </h2>
          <a :href="mapUrl" target="_blank" rel="noopener noreferrer" class="product-detail-map">
            <Icon name="i-ph-map-pin-fill" class="h-7 w-7" />
            <span>{{ product.location }}</span>
          </a>
        </section>
      </article>

      <section v-if="relatedProducts.length" class="product-detail-related">
        <h2>
          <Icon name="i-ph-storefront-fill" class="h-5 w-5" />
          Sản phẩm liên quan
        </h2>
        <div class="product-detail-related-grid">
          <NuxtLink
            v-for="relatedProduct in relatedProducts"
            :key="relatedProduct.id"
            :to="relatedProduct.href"
            class="product-detail-related-card"
          >
            <img
              v-if="relatedProduct.imageUrl"
              :src="relatedProduct.imageUrl"
              :alt="relatedProduct.title"
            >
            <div v-else class="product-detail-related-empty">
              <Icon :name="relatedProduct.icon" class="h-8 w-8" />
            </div>
            <strong>{{ relatedProduct.title }}</strong>
            <span>{{ formatRelatedPrice(relatedProduct) }}</span>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type { ProductListing } from "../../domain/types/product-marketplace.types"
import { createApiProductRepository } from "../../infrastructure/repositories/ApiProductRepository"

const props = defineProps<{
  productId: string
}>()

const { t, locale } = useI18n()
const router = useRouter()
const toast = useToast()
const repository = createApiProductRepository()
const mainImageId = ref("")
const mainImageFailed = ref(false)
const cartLoading = ref(false)

const { data: product, status, error } = await useAsyncData(
  () => `product:detail:${props.productId}`,
  () => repository.getById(props.productId),
)

const { data: relatedData } = await useAsyncData(
  () => `product:detail:${props.productId}:related`,
  () => repository.list({ limit: 10 }),
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

const mainImage = computed(() => {
  const images = product.value?.images ?? []

  return images.find(image => image.id === mainImageId.value) || images[0]
})

const ratingValue = computed(() => Math.max(0, Math.min(5, Math.round(product.value?.rating ?? 0))))

const formattedPrice = computed(() => {
  if (!product.value) return ""

  if (product.value.priceFormat) {
    const symbol = product.value.currencySymbol?.trim()

    return symbol ? `${symbol}${product.value.priceFormat}` : product.value.priceFormat
  }

  return formatCurrency(product.value.price, {
    currency: product.value.currency || "VND",
    currencySymbol: product.value.currencySymbol,
    currencyRule: product.value.currencyRule,
    locale: locale.value,
  })
})

const conditionLabel = computed(() => {
  switch (product.value?.condition) {
    case "used":
      return "Đã sử dụng"
    case "like-new":
      return "Như mới"
    default:
      return "Mới"
  }
})

const stockLabel = computed(() => {
  if (!product.value?.stock) {
    return "Hiện không có sẵn"
  }

  return "Còn hàng"
})

const categoryLabel = computed(() => {
  if (!product.value) return ""

  return [product.value.categoryLabel, product.value.subCategoryLabel].filter(Boolean).join(" / ")
})

const mapUrl = computed(() => {
  if (!product.value?.location) return ""

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.value.location)}`
})

const relatedProducts = computed(() =>
  (relatedData.value?.items ?? [])
    .filter(relatedProduct => String(relatedProduct.id) !== product.value?.id)
    .slice(0, 10),
)

const selectImage = (imageId: string) => {
  mainImageId.value = imageId
  mainImageFailed.value = false
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push("/products")
}

const openImage = () => {
  if (!mainImage.value?.src || !import.meta.client) return

  window.open(mainImage.value.src, "_blank", "noopener,noreferrer")
}

const openSellerChat = () => {
  if (!product.value?.sellerId) return

  void navigateTo({
    path: appRoutes.messages,
    query: {
      userId: String(product.value.sellerId),
      name: product.value.seller || "",
      productId: product.value.id,
    },
  })
}

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

const addProductToCart = async () => {
  if (!product.value || cartLoading.value) return

  cartLoading.value = true

  try {
    await repository.addToCart(Number(product.value.id))
    toast.add({
      title: "Đã thêm vào giỏ hàng",
      color: "success",
      icon: "i-ph-check-circle",
    })
    await navigateTo(appRoutes.checkout)
  }
  catch (cartError) {
    const message = getErrorMessage(cartError)

    if (/already\s+in\s+cart/i.test(message)) {
      await navigateTo(appRoutes.checkout)
      return
    }

    toast.add({
      title: "Không thêm được vào giỏ hàng",
      description: message || String(cartError),
      color: "error",
      icon: "i-ph-warning-circle",
    })
  }
  finally {
    cartLoading.value = false
  }
}

const formatRelatedPrice = (relatedProduct: ProductListing) => {
  if (relatedProduct.priceFormat) {
    const symbol = relatedProduct.currencySymbol?.trim()

    return symbol ? `${symbol}${relatedProduct.priceFormat}` : relatedProduct.priceFormat
  }

  return formatCurrency(relatedProduct.price, {
    currency: relatedProduct.currency || "VND",
    currencySymbol: relatedProduct.currencySymbol,
    currencyRule: relatedProduct.currencyRule,
    locale: locale.value,
  })
}

watch(product, (nextProduct) => {
  mainImageId.value = nextProduct?.images?.[0]?.id ?? ""
  mainImageFailed.value = false
}, { immediate: true })

useSeoMeta({
  title: () => product.value?.title || t("pages.productsPage.seoTitle"),
  description: () => product.value?.description || t("pages.productsPage.seoDescription"),
})
</script>

<style scoped>
.product-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  border: 0;
  background: transparent;
  color: #344258;
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
}

.product-detail-card,
.product-detail-related {
  border: 1px solid #dbe3f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(13, 38, 76, 0.08);
}

.product-detail-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 430px);
  gap: 28px;
  padding: 22px;
}

.product-detail-gallery {
  min-width: 0;
}

.product-detail-main-button {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.product-detail-main-image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: #eef3fb;
  object-fit: cover;
}

.product-detail-main-image--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8b9bb2;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
}

.product-detail-thumbs {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.product-detail-thumb {
  overflow: hidden;
  width: 74px;
  height: 74px;
  flex: 0 0 auto;
  border: 2px solid transparent;
  border-radius: 5px;
  background: #eef3fb;
  cursor: pointer;
  padding: 0;
}

.product-detail-thumb--active {
  border-color: #0000ff;
}

.product-detail-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-detail-summary {
  min-width: 0;
}

.product-detail-title {
  margin: 0;
  color: #111827;
  font-size: 31px;
  font-weight: 900;
  line-height: 1.16;
}

.product-detail-price {
  margin-top: 12px;
  color: #0000ff;
  font-size: 24px;
  font-weight: 900;
}

.product-detail-rating {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.product-detail-stars {
  display: inline-flex;
  gap: 2px;
}

.product-detail-rating button {
  border: 0;
  background: transparent;
  color: #66758b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 0;
}

.product-detail-seller {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}

.product-detail-seller-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  color: #ffffff;
  background: #0000ff;
  font-weight: 900;
}

.product-detail-seller p {
  margin: 0 0 2px;
  color: #66758b;
  font-size: 12px;
  font-weight: 800;
}

.product-detail-seller strong {
  color: #111827;
  font-size: 14px;
}

.product-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.product-detail-action,
.product-detail-edit {
  min-height: 40px;
  border-radius: 5px;
  font-weight: 800;
}

.product-detail-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  color: #344258;
  background: #eef3fb;
  text-decoration: none;
}

.product-detail-info {
  display: grid;
  gap: 0;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.product-detail-info li {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  align-items: flex-start;
  column-gap: 12px;
  border-bottom: 1px solid #eef2f8;
  padding: 12px 0;
}

.product-detail-info span {
  display: inline-flex;
  align-items: flex-start;
  justify-content: flex-start;
  min-width: 0;
  gap: 6px;
  color: #66758b;
  font-weight: 800;
  line-height: 1.25;
  text-align: left;
}

.product-detail-info span :deep(.iconify) {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  margin-top: 2px;
}

.product-detail-info strong {
  min-width: 0;
  color: #111827;
  font-weight: 900;
  justify-self: end;
  text-align: right;
  overflow-wrap: anywhere;
}

.product-detail-section {
  grid-column: 1 / -1;
  border-top: 1px solid #eef2f8;
  padding-top: 22px;
}

.product-detail-section h2,
.product-detail-related h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: #111827;
  font-size: 19px;
  font-weight: 900;
}

.product-detail-section p {
  margin: 0;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
}

.product-detail-muted {
  color: #8b9bb2 !important;
}

.product-detail-map {
  display: flex;
  min-height: 170px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #e5eaf1;
  border-radius: 12px;
  color: #5f6368;
  background: linear-gradient(135deg, #f7f4ed 0%, #f2f0ea 100%);
  text-align: center;
  text-decoration: none;
}

.product-detail-related {
  margin-top: 18px;
  padding: 18px;
}

.product-detail-related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 16px;
}

.product-detail-related-card {
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.product-detail-related-card img,
.product-detail-related-empty {
  display: flex;
  width: 100%;
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: #eef3fb;
  object-fit: cover;
  color: #8b9bb2;
}

.product-detail-related-card strong {
  display: block;
  overflow: hidden;
  margin-top: 8px;
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-detail-related-card span {
  display: block;
  margin-top: 4px;
  color: #0000ff;
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 900px) {
  .product-detail-card {
    grid-template-columns: 1fr;
  }

  .product-detail-related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .product-detail-card {
    padding: 14px;
  }

  .product-detail-title {
    font-size: 25px;
  }

  .product-detail-info li {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .product-detail-info span,
  .product-detail-info strong {
    min-width: 0;
    justify-self: start;
    text-align: left;
  }
}
</style>
