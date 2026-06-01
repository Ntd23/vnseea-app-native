<!-- Description: Thin Nuxt route wrapper for the backend-backed liked-pages directory screen. -->
<template>
  <CommunityPresentationPagesDirectoryPage mode="favorite" />
</template>

<script setup lang="ts">
import CommunityPresentationPagesDirectoryPage from "../../src/community/presentation/pages/PagesDirectoryPage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(appRoutes.likedPages, requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("community.pagesDirectory.seoFavoriteTitle")} | VNSEEA`,
  description: () => t("community.pagesDirectory.seoFavoriteDesc"),
  ogTitle: () => `${t("community.pagesDirectory.seoFavoriteTitle")} | VNSEEA`,
  ogDescription: () => t("community.pagesDirectory.seoFavoriteDesc"),
  ogUrl: () => canonicalUrl.value,
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
