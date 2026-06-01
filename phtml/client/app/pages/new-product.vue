<template>
  <ProductPresentationNewProductPage />
</template>

<script setup lang="ts">
import ProductPresentationNewProductPage from "../../src/product/presentation/pages/NewProductPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
useHead({
  title: () => t("pages.newProductPage.seoTitle"),
})
</script>
