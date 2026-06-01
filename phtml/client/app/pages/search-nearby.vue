<!-- English description: Thin Nuxt route wrapper for the nearby map search surface. -->
<template>
  <SearchNearbyPresentationSearchNearbyPage />
</template>

<script setup lang="ts">
import SearchNearbyPresentationSearchNearbyPage from "../../src/search-nearby/presentation/pages/SearchNearbyPage.vue"

definePageMeta({
  layout: "search-nearby",
})

useHead({
  title: "Tìm kiếm gần đây",
})
</script>
