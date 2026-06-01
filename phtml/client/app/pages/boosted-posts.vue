<!-- English description: Thin route wrapper for the current user's boosted posts page. -->
<template>
  <BoostedPostsPage />
</template>

<script setup lang="ts">
import BoostedPostsPage from "../../src/boosted/presentation/pages/BoostedPostsPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("navigation.mobileMenu.settingsNav.boostedPosts"),
})
</script>
