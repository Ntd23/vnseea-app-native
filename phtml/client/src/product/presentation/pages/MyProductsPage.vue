<!-- English description: Wowonder-aligned my-products page backed by the product API bridge. -->

<template>
  <div class="my-products-page mx-auto w-full max-w-[1520px] px-3 pb-12 pt-4 sm:px-4">
    <section class="my-products-heading">
      <div class="my-products-heading__inner">
        <span class="my-products-heading__icon">
          <Icon name="i-ph-storefront-fill" class="h-5 w-5" />
        </span>
        <div>
          <p class="my-products-heading__eyebrow">
            {{ $t("pages.myProductsPage.eyebrow") }}
          </p>
          <h1 class="my-products-heading__title">
            {{ $t("pages.myProductsPage.title") }}
          </h1>
        </div>
      </div>
    </section>

    <section class="my-products-nav">
      <nav class="my-products-tabs" aria-label="Product sections">
        <NuxtLink
          v-for="item in storeTabs"
          :key="item.to"
          :to="item.to"
          class="my-products-tab"
          :class="{ 'my-products-tab--active': item.active }"
        >
          <Icon :name="item.icon" class="my-products-tab__icon" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <NuxtLink to="/new-product" class="my-products-create">
        <Icon name="i-ph-plus-bold" class="h-4 w-4" />
        {{ $t("pages.myProductsPage.create") }}
      </NuxtLink>
    </section>

    <section class="my-products-filters">
      <label class="my-products-search">
        <Icon name="i-ph-magnifying-glass" class="h-5 w-5 text-[#8b9bb2]" />
        <input
          v-model="search"
          type="search"
          :placeholder="$t('pages.myProductsPage.searchPlaceholder')"
        >
      </label>

      <USelect
        v-model="sortBy"
        :items="sortOptions"
        value-key="value"
        label-key="label"
        :placeholder="$t('pages.myProductsPage.sortBy')"
        class="my-products-select"
      />
      <USelect
        v-model="selectedCategory"
        :items="categoryOptions"
        value-key="value"
        label-key="label"
        :placeholder="$t('pages.myProductsPage.allCategories')"
        class="my-products-select"
      />
    </section>

    <section v-if="status === 'pending'" class="my-products-grid">
      <div v-for="index in 8" :key="index" class="my-product-card">
        <USkeleton class="my-product-card__image" />
        <div class="my-product-card__info">
          <USkeleton class="h-5 w-4/5 rounded" />
          <USkeleton class="mt-2 h-5 w-24 rounded" />
        </div>
      </div>
    </section>

    <UAlert
      v-else-if="error"
      class="mt-5"
      color="error"
      variant="soft"
      icon="i-ph-warning-circle-duotone"
      :title="$t('pages.myProductsPage.loadErrorTitle')"
      :description="String(error)"
    />

    <section v-else-if="visibleProducts.length" class="my-products-grid">
      <article
        v-for="product in visibleProducts"
        :id="`product_${product.id}`"
        :key="product.id"
        class="my-product-card"
      >
        <NuxtLink :to="product.href || '/products'" class="my-product-card__link">
          <div class="my-product-card__image">
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.title"
              loading="lazy"
            >
            <div v-else class="my-product-card__fallback" :style="{ background: product.background }">
              <Icon :name="product.icon" class="h-9 w-9 text-white" />
            </div>
          </div>

          <div class="my-product-card__info">
            <span :title="product.title" class="my-product-card__title">
              {{ product.title }}
            </span>
            <strong class="my-product-card__price">
              {{ formatProductCurrency(product) }}
            </strong>
          </div>
        </NuxtLink>

        <button
          type="button"
          class="my-product-card__delete"
          :disabled="deletingProductId === product.id"
          :aria-label="$t('pages.myProductsPage.delete')"
          @click="confirmDeleteProduct(product.id)"
        >
          <Icon
            :name="deletingProductId === product.id ? 'i-ph-spinner-gap' : 'i-ph-trash-fill'"
            class="h-5 w-5"
            :class="{ 'animate-spin': deletingProductId === product.id }"
          />
        </button>
      </article>
    </section>

    <section v-else class="my-products-empty">
      <Icon name="i-ph-shopping-cart-simple" class="h-7 w-7" />
      <span>{{ $t("pages.myProductsPage.emptyTitle") }}</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useMyProductsOverview } from "../../application/composables/useMyProductsOverview"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.myProductsPage.seoTitle"),
  description: () => t("pages.myProductsPage.seoDescription"),
})

const {
  visibleProducts,
  status,
  error,
  search,
  sortBy,
  selectedCategory,
  categoryOptions,
  sortOptions,
  deletingProductId,
  formatProductCurrency,
  deleteProduct,
} = useMyProductsOverview()

const storeTabs = computed(() => [
  {
    label: t("pages.myProductsPage.myProducts"),
    to: appRoutes.myProducts,
    icon: "i-ph-shopping-bag",
    active: true,
  },
  {
    label: t("pages.myProductsPage.purchased"),
    to: appRoutes.purchased,
    icon: "i-ph-receipt",
    active: false,
  },
  {
    label: t("pages.myProductsPage.orders"),
    to: appRoutes.orders,
    icon: "i-ph-list-checks",
    active: false,
  },
  {
    label: t("pages.myProductsPage.marketplace"),
    to: appRoutes.products,
    icon: "i-ph-planet",
    active: false,
  },
])

const confirmDeleteProduct = (productId: number) => {
  if (import.meta.client && !window.confirm(t("pages.myProductsPage.deleteConfirm"))) {
    return
  }

  deleteProduct(productId)
}
</script>

<style scoped>
.my-products-page {
  --wowonder-blue: #0000ff;
  --wowonder-card: #ffffff;
  --wowonder-border: #dbe3f2;
  --wowonder-text: #111827;
  --wowonder-muted: #66758b;
}

.my-products-heading,
.my-products-nav,
.my-products-filters,
.my-products-empty {
  border: 1px solid var(--wowonder-border);
  border-radius: 12px;
  background: var(--wowonder-card);
  box-shadow: 0 2px 6px rgba(13, 38, 76, 0.08);
}

.my-products-heading {
  min-height: 80px;
}

.my-products-heading__inner {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 80px;
  padding: 18px 24px;
}

.my-products-heading__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: #ffffff;
  background: var(--wowonder-blue);
}

.my-products-heading__eyebrow {
  margin: 0;
  color: var(--wowonder-text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.my-products-heading__title {
  margin: 7px 0 0;
  color: var(--wowonder-text);
  font-size: 28px;
  font-weight: 900;
  line-height: 1.1;
}

.my-products-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 74px;
  margin-top: 22px;
  padding: 0 12px;
}

.my-products-tabs {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
}

.my-products-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 74px;
  flex: 0 0 auto;
  gap: 8px;
  padding: 0 13px;
  color: #555555;
  font-size: 18px;
  font-weight: 500;
  border-radius: 8px 8px 0 0;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.16s ease, background 0.16s ease;
}

.my-products-tab:hover {
  color: var(--wowonder-blue);
  background: rgba(0, 0, 255, 0.04);
}

.my-products-tab__icon {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
}

.my-products-tab--active {
  color: #555555;
  font-weight: 800;
}

.my-products-tab--active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 4px;
  background: var(--wowonder-blue);
  content: "";
}

.my-products-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 128px;
  height: 42px;
  padding: 0 18px;
  border-radius: 8px;
  color: #ffffff;
  background: var(--wowonder-blue);
  box-shadow: 0 3px 8px rgba(0, 0, 255, 0.28);
  font-size: 17px;
  font-weight: 700;
  text-decoration: none;
}

.my-products-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 220px 240px;
  gap: 12px;
  margin-top: 18px;
  padding: 14px;
}

.my-products-search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  border: 1px solid var(--wowonder-border);
  border-radius: 8px;
  padding: 0 12px;
}

.my-products-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--wowonder-text);
  background: transparent;
  font-size: 15px;
}

.my-products-select {
  min-width: 0;
}

.my-products-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-top: 26px;
}

.my-product-card {
  position: relative;
  min-width: 0;
}

.my-product-card__link {
  display: block;
  overflow: hidden;
  border: 1px solid var(--wowonder-border);
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
  text-decoration: none;
}

.my-product-card__link:hover {
  text-decoration: none;
}

.my-product-card__image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #eef3fb;
}

.my-product-card__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.my-product-card__fallback {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.my-product-card__info {
  padding: 7px 10px 10px;
}

.my-product-card__title {
  display: block;
  overflow: hidden;
  color: #555555;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-product-card__price {
  display: block;
  overflow: hidden;
  margin-top: 7px;
  color: #4caf50;
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-product-card__delete {
  position: absolute;
  top: 7px;
  right: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: background 0.2s ease;
}

.my-product-card__delete:hover {
  background: rgba(255, 255, 255, 0.42);
}

.my-product-card__delete:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.my-products-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
  color: var(--wowonder-muted);
  font-size: 18px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .my-products-filters {
    grid-template-columns: 1fr;
  }

  .my-products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .my-products-heading__title {
    font-size: 24px;
  }

  .my-products-nav {
    align-items: stretch;
    flex-direction: column;
    padding: 0 12px 12px;
  }

  .my-products-tabs {
    width: 100%;
  }

  .my-products-create {
    width: 100%;
  }

  .my-products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
}
</style>
