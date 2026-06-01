<template>
  <PagesCheckoutPage />
</template>

<script setup lang="ts">
import PagesCheckoutPage from "../../src/checkout/presentation/pages/CheckoutPage.vue"
definePageMeta({
  layout: 'checkout',
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(route.fullPath || "/checkout", requestURL.origin).toString())

useSeoMeta({
  title: () => t("checkout.page.title"),
  description: () => t("checkout.page.description"),
  ogTitle: () => t("checkout.page.title"),
  ogDescription: () => t("checkout.page.description"),
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [
    {
      rel: "canonical",
      href: canonicalUrl,
    },
  ],
})
</script>
