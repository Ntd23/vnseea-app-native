<template>
  <WatchPresentationWatchPage />
</template>

<script setup lang="ts">
import WatchPresentationWatchPage from "../../src/watch/presentation/pages/WatchPage.vue"
definePageMeta({
  layout: "default",
})

const { t: translate } = useI18n()

useHead({
  title: () => translate("pages.watchPage.seoTitle"),
})
</script>
