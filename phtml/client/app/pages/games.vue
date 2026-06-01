<!-- English description: Thin Nuxt route wrapper for the games bounded-context page. -->
<template>
  <GamesRuntimePage />
</template>

<script setup lang="ts">
import GamesRuntimePage from "../../src/games/presentation/pages/GamesPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.gamesPage.seoTitle"),
  description: () => t("pages.gamesPage.seoDescription"),
})
</script>
