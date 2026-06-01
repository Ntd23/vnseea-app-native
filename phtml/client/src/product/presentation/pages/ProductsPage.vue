<!-- English description: Wowonder-parity marketplace product listing page backed by PHP product APIs. -->

<template>
  <div class="mx-auto max-w-[1180px] px-3 pb-16 sm:px-4">
    <section
      class="relative overflow-hidden rounded-b-[10px] text-white"
      style="background: linear-gradient(180deg, #2437ff 0%, #0700f5 100%);"
    >
      <div class="absolute inset-x-0 bottom-0 h-16 bg-white/10" />
      <div class="relative mx-auto flex min-h-[190px] flex-col items-center justify-center px-4 py-8 text-center">
        <Icon name="i-ph-storefront-fill" class="h-9 w-9" />
        <h1 class="mt-3 text-[30px] font-semibold leading-tight sm:text-[36px]">
          {{ $t("pages.productsPage.marketTitle") }}
        </h1>
        <p class="mt-2 max-w-xl text-[15px] font-medium text-white/85">
          {{ $t("pages.productsPage.marketDescription") }}
        </p>

        <NuxtLink
          to="/my-products"
          class="mt-5 inline-flex h-10 items-center justify-center rounded-[4px] bg-white px-4 text-[13px] font-semibold shadow-sm transition hover:bg-slate-50"
          style="color: #0700f5;"
        >
          <Icon name="i-ph-shopping-bag-open-fill" class="mr-2 h-5 w-5" />
          {{ $t("pages.productsPage.myProducts") }}
        </NuxtLink>
      </div>
    </section>

    <section class="-mt-5 rounded-[6px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_180px_180px_210px_auto] lg:items-center">
        <UInput
          v-model="search"
          icon="i-ph-magnifying-glass"
          size="lg"
          :placeholder="$t('pages.productsPage.searchPlaceholder')"
          :ui="{ base: 'h-11 rounded-[4px] bg-white text-[14px]' }"
        />

        <USelect
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          label-key="label"
          size="lg"
          :ui="{ base: 'h-11 rounded-[4px] text-[13px]' }"
        />

        <USelect
          v-model="selectedCategory"
          :items="categoryOptions"
          value-key="value"
          label-key="label"
          size="lg"
          :ui="{ base: 'h-11 rounded-[4px] text-[13px]' }"
        />

        <USelect
          v-if="hasSubCategories"
          v-model="selectedSubCategory"
          :items="subCategoryOptions"
          value-key="value"
          label-key="label"
          size="lg"
          :ui="{ base: 'h-11 rounded-[4px] text-[13px]' }"
        />
        <div
          v-else
          class="hidden lg:block"
        />

        <div class="rounded-[4px] border border-slate-200 bg-slate-50 px-3 py-2">
          <div class="flex items-center justify-between gap-3 text-[12px] font-semibold text-slate-600">
            <span>{{ $t("pages.productsPage.locationDistance") }}</span>
            <span>{{ distanceRange }} km</span>
          </div>
          <input
            v-model.number="distanceRange"
            type="range"
            min="0"
            max="300"
            class="mt-2 w-full accent-[#1f7aec]"
            @change="applyDistance"
          >
        </div>

        <UButton
          color="neutral"
          variant="soft"
          size="lg"
          class="h-11 justify-center rounded-[4px] text-[13px] font-semibold"
          icon="i-ph-arrow-counter-clockwise"
          @click="resetFilters"
        >
          {{ $t("pages.productsPage.resetFilters") }}
        </UButton>
      </div>
    </section>

    <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-[18px] font-semibold text-slate-900">
        {{ resultHeading }}
      </h2>
      <p class="text-[13px] font-medium text-slate-500">
        {{ $t("pages.productsPage.matchingProducts", { count: visibleProducts.length }) }} · {{ currentSortLabel }}
      </p>
    </div>

    <div
      v-if="status === 'pending'"
      class="mt-4 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="index in 8"
        :key="index"
        class="rounded-[5px] border border-slate-200 bg-white p-3"
      >
        <USkeleton class="aspect-square rounded-[4px]" />
        <USkeleton class="mt-3 h-4 w-4/5 rounded-full" />
        <USkeleton class="mt-2 h-5 w-1/2 rounded-full" />
      </div>
    </div>

    <UAlert
      v-else-if="error"
      class="mt-4"
      color="error"
      variant="soft"
      icon="i-ph-warning-circle"
      :title="$t('pages.productsPage.loadErrorTitle')"
      :description="String(error)"
    />

    <div
      v-else-if="visibleProducts.length > 0"
      class="mt-4 grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    >
      <article
        v-for="product in visibleProducts"
        :key="product.id"
        class="market-product-card group overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm"
      >
        <div class="market-product-image relative aspect-square overflow-visible bg-slate-100">
          <NuxtLink :to="product.href" class="block h-full overflow-hidden rounded-t-[10px]">
            <NuxtImg
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.title"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-white"
              :style="{ background: product.background }"
            >
              <Icon :name="product.icon" class="h-16 w-16 opacity-80" />
            </div>
          </NuxtLink>

          <div class="absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-[3px] bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
            <a :href="`/products?c_id=${product.categoryId}`">{{ product.categoryLabel }}</a>
            <span v-if="product.subCategoryLabel"> / {{ product.subCategoryLabel }}</span>
          </div>

          <div
            v-if="!product.mine"
            class="market-product-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-t-[10px] px-10"
          >
            <NuxtLink
              class="market-product-more pointer-events-auto inline-flex h-10 items-center justify-center rounded-[4px] px-5 text-[15px] font-semibold"
              :to="product.href"
            >
              {{ $t("pages.productsPage.moreInfo") }}
            </NuxtLink>
          </div>

          <div class="market-product-actions absolute bottom-0 right-4 z-20 flex translate-y-1/2 items-center justify-end gap-2">
            <NuxtLink
              v-if="product.mine"
              class="market-product-action-btn market-product-action-muted inline-flex items-center justify-center text-slate-900 transition"
              :to="product.href"
              :title="$t('pages.productsPage.moreInfo')"
            >
              <Icon name="i-ph-info-fill" class="h-[29px] w-[29px]" />
            </NuxtLink>
            <button
              v-if="!product.mine"
              type="button"
              class="market-product-action-btn market-product-action-muted inline-flex items-center justify-center text-slate-900 transition disabled:opacity-60"
              :title="$t('pages.productsPage.messageSeller')"
              :disabled="!product.canContactSeller"
              @click="openSellerChat(product)"
            >
              <Icon name="i-ph-chat-text-fill" class="h-[29px] w-[29px]" />
            </button>
            <button
              v-if="!product.mine"
              type="button"
              class="market-product-action-btn inline-flex items-center justify-center text-white transition disabled:opacity-60"
              style="background: linear-gradient(180deg, #2437ff 0%, #0700f5 100%);"
              :title="$t('pages.productsPage.addToCart')"
              :disabled="!product.canAddToCart || cartLoadingProductId === product.id"
              @click="addToCart(product.id)"
            >
              <Icon name="i-ph-shopping-cart-simple-fill" class="h-[29px] w-[29px]" />
            </button>
          </div>
        </div>

        <div class="px-3 pb-3 pt-7">
          <NuxtLink
            :to="product.href"
            class="line-clamp-2 min-h-[40px] text-[14px] font-semibold leading-5 text-slate-900 hover:text-primary-600"
            :title="product.title"
          >
            {{ product.title }}
          </NuxtLink>
          <div
            class="mt-2 text-[18px] font-bold"
            style="color: #0700f5;"
          >
            {{ formatProductCurrency(product) }}
          </div>
          <div class="mt-2 flex items-center justify-between gap-2 text-[12px] font-medium text-slate-500">
            <span class="truncate">{{ product.seller }}</span>
            <span>{{ product.condition }}</span>
          </div>
          <div
            v-if="product.location || formatDistance(product.distanceKm)"
            class="mt-2 flex items-center gap-1 text-[12px] text-slate-500"
          >
            <Icon name="i-ph-map-pin" class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ product.location }}</span>
            <span v-if="formatDistance(product.distanceKm)" class="shrink-0">· {{ formatDistance(product.distanceKm) }}</span>
          </div>
        </div>
      </article>
    </div>

    <div
      v-else
      class="mt-4 rounded-[5px] border border-slate-200 bg-white px-6 py-14 text-center text-slate-500"
    >
      <Icon name="i-ph-shopping-bag-open" class="mx-auto h-10 w-10" />
      <p class="mt-3 text-[15px] font-semibold">
        {{ $t("pages.productsPage.emptyTitle") }}
      </p>
    </div>

    <div
      v-if="hasMore && status !== 'pending'"
      class="mt-6 flex justify-center"
    >
      <UButton
        color="neutral"
        variant="outline"
        size="lg"
        class="rounded-[4px] px-6 text-[13px] font-semibold"
        icon="i-ph-arrow-down"
        :loading="isLoadingMore"
        @click="loadMore"
      >
        {{ $t("pages.productsPage.loadMore") }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProductMarketplace } from "../../application/composables/useProductMarketplace"

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.productsPage.seoTitle"),
  description: () => t("pages.productsPage.seoDescription"),
})

const {
  search,
  sortBy,
  selectedCategory,
  selectedSubCategory,
  distanceRange,
  sortOptions,
  categoryOptions,
  subCategoryOptions,
  hasSubCategories,
  currentSortLabel,
  resultHeading,
  visibleProducts,
  status,
  error,
  hasMore,
  cartLoadingProductId,
  isLoadingMore,
  formatProductCurrency,
  formatDistance,
  resetFilters,
  applyDistance,
  addToCart,
  loadMore,
  openSellerChat,
} = useProductMarketplace()
</script>

<style scoped>
.market-product-card {
  transition: box-shadow 0.2s linear;
}

.market-product-card:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

.market-product-overlay {
  background-color: rgba(0, 0, 0, 0.41);
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.33, 0.66, 0.66, 1);
}

.market-product-card:hover .market-product-overlay {
  opacity: 1;
}

.market-product-more {
  min-width: 132px;
  height: 44px;
  background-color: rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(4px);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.market-product-more:hover {
  background-color: #fff;
  color: #000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.market-product-actions :deep(a),
.market-product-actions :deep(button) {
  margin: 0 2px;
}

.market-product-action-btn {
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 9999px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  line-height: 1;
}

.market-product-action-muted {
  background-color: #dfe5ee;
}

.market-product-action-muted:hover {
  background-color: #d3dbe7;
}
</style>
