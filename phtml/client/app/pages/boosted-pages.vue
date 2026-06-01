<!-- English description: Thin route wrapper for the current user's boosted pages page. -->
<template>
  <BoostedPagesPage />
</template>

<script setup lang="ts">
import BoostedPagesPage from "../../src/boosted/presentation/pages/BoostedPagesPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("navigation.mobileMenu.settingsNav.boostedPages"),
})
</script>
