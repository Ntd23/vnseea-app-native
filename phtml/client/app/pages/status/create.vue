<template>
  <FeedPresentationStatusCreatePage />
</template>

<script setup lang="ts">
import FeedPresentationStatusCreatePage from "../../../src/feed/presentation/pages/StatusCreatePage.vue"

definePageMeta({
  layout: "default",
})

useHead({
  title: "Tạo story | VNSEEA",
})
</script>
