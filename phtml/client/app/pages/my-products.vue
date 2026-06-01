<template>
  <ProductPresentationMyProductsPage />
</template>

<script setup lang="ts">
import ProductPresentationMyProductsPage from "../../src/product/presentation/pages/MyProductsPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
useHead({
  title: () => t("pages.myProductsPage.seoTitle"),
})
</script>
