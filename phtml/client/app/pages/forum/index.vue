<!-- English description: Thin Nuxt route wrapper for the forum bounded-context page. -->
<template>
  <ForumPresentationForumPage />
</template>

<script setup lang="ts">
import ForumPresentationForumPage from "../../../src/forum/presentation/pages/ForumPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.forumPage.seoTitle"),
  description: () => t("pages.forumPage.seoDescription"),
})
</script>
