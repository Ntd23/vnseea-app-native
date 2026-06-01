<!-- English description: Thin Nuxt route wrapper for the directory bounded-context page. -->
<template>
  <DirectoryPresentationDirectoryIndexPage />
</template>

<script setup lang="ts">
import DirectoryPresentationDirectoryIndexPage from "../../../src/directory/presentation/pages/DirectoryIndexPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.directoryPage.seoTitle"),
  description: () => t("pages.directoryPage.seoDescription"),
})
</script>
