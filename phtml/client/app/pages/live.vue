<template>
  <PagesLivePage />
</template>

<script setup lang="ts">
import PagesLivePage from "../../src/live/presentation/pages/LivePage.vue"
definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const userId = useCookie<string | null>("user_id")

if (!userId.value) {
  await navigateTo("/welcome")
}

useHead({
  title: () => t("pages.livePage.seoTitle"),
})
</script>
