<template>
  <ReelsPresentationReelsPage />
</template>

<script setup lang="ts">
import ReelsPresentationReelsPage from "../../src/reels/presentation/pages/ReelsPage.vue"
definePageMeta({
  layout: false,
})

const { t } = useI18n()
useHead({
  title: () => t('pages.reelsPage.seoTitle'),
})
</script>
