<!-- English description: Thin Nuxt route wrapper for the funding creation bounded-context page. -->
<template>
  <FundingPresentationCreateFundingPage />
</template>

<script setup lang="ts">
import FundingPresentationCreateFundingPage from "../../src/funding/presentation/pages/CreateFundingPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const requestURL = useRequestURL()

const seoTitle = computed(() => t("pages.createFundingPage.seoTitle"))
const seoDescription = computed(() => t("pages.createFundingPage.seoDescription"))
const canonicalUrl = computed(() =>
  new URL("/create_funding", requestURL.origin).toString(),
)

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogUrl: () => canonicalUrl.value,
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
