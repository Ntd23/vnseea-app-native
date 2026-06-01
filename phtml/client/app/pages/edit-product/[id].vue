<template>
  <ProductPresentationEditProductPage :product-id="productId" />
</template>

<script setup lang="ts">
import ProductPresentationEditProductPage from "../../../src/product/presentation/pages/EditProductPage.vue"

definePageMeta({
  layout: "default",
})

const route = useRoute()
const productId = computed(() => String(route.params.id || ""))
const { t } = useI18n()

useHead({
  title: () => t("pages.editProductPage.seoTitle", { id: productId.value }),
})
</script>
