<!-- English description: Thin Nuxt route wrapper for the funding bounded-context page. -->
<template>
  <FundingPresentationFundingPage />
</template>

<script setup lang="ts">
import FundingPresentationFundingPage from "../../src/funding/presentation/pages/FundingPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.fundingPage.seoTitle"),
  description: () => t("pages.fundingPage.seoDescription"),
})
</script>
