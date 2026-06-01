<!-- English description: Thin Nuxt route wrapper for editing a backend-backed funding campaign. -->
<template>
  <FundingPresentationCreateFundingPage mode="edit" :campaign-id="campaignId" />
</template>

<script setup lang="ts">
import FundingPresentationCreateFundingPage from "../../../src/funding/presentation/pages/CreateFundingPage.vue"

definePageMeta({
  layout: "default",
})

const route = useRoute()
const { t } = useI18n()
const campaignId = computed(() => String(route.params.id || ""))

useSeoMeta({
  title: () => t("pages.createFundingPage.editSeoTitle"),
  description: () => t("pages.createFundingPage.editSeoDescription"),
})
</script>
