<template>
  <MemoriesPresentationMemoriesPage />
</template>

<script setup lang="ts">
import MemoriesPresentationMemoriesPage from "../../src/memories/presentation/pages/MemoriesPage.vue"
definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useHead({
  title: () => t("pages.memoriesPage.seoTitle"),
})
</script>
