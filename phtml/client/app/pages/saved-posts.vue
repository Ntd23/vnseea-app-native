<!-- Description: Thin Nuxt route wrapper for the backend-backed saved posts screen. -->
<template>
  <SavedPresentationSavedPostsPage />
</template>

<script setup lang="ts">
import SavedPresentationSavedPostsPage from "../../src/saved/presentation/pages/SavedPostsPage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"

const { t } = useI18n()
const requestURL = useRequestURL()

definePageMeta({
  layout: "default",
})

const canonicalUrl = computed(() =>
  new URL(appRoutes.savedPosts, requestURL.origin).toString(),
)

useSeoMeta({
  title: () => t("pages.savedPostsPage.seoTitle"),
  description: () => t("pages.savedPostsPage.seoDescription"),
  ogTitle: () => t("pages.savedPostsPage.seoTitle"),
  ogDescription: () => t("pages.savedPostsPage.seoDescription"),
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [
    {
      rel: "canonical",
      href: canonicalUrl,
    },
  ],
})
</script>
