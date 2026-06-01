<!-- English description: Thin Nuxt route wrapper for the go-pro bounded-context page. -->
<template>
  <GoProRuntimePage />
</template>

<script setup lang="ts">
import GoProRuntimePage from "../../src/go-pro/presentation/pages/GoProPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.goProPage.seoTitle"),
  description: () => t("pages.goProPage.seoDescription"),
})
</script>
