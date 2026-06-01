<!-- English description: Thin Nuxt route wrapper for the funding detail bounded-context page. -->
<template>
  <FundingPresentationShowFundPage />
</template>

<script setup lang="ts">
import FundingPresentationShowFundPage from "../../../src/funding/presentation/pages/ShowFundPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.showFundPage.seoTitle"),
  description: () => t("pages.showFundPage.seoDescription"),
})
</script>
