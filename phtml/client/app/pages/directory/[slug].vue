<!-- English description: Catch-all subpage Nuxt route wrapper for directory categories. -->
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
