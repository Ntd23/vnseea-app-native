<template>
  <SearchPresentationSearchPage />
</template>

<script setup lang="ts">
import SearchPresentationSearchPage from "../../src/search/presentation/pages/SearchPage.vue"
definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useHead({
  title: computed(() => t('community.search.seoTitle')),
})
</script>
