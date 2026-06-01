<!-- Description: Thin Nuxt route wrapper for the backend-backed suggested-pages directory screen. -->
<template>
  <CommunityPresentationPagesDirectoryPage mode="suggested" />
</template>

<script setup lang="ts">
import CommunityPresentationPagesDirectoryPage from "../../src/community/presentation/pages/PagesDirectoryPage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(appRoutes.suggestedPages, requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("community.pagesDirectory.seoSuggestedTitle")} | VNSEEA`,
  description: () => t("community.pagesDirectory.seoSuggestedDesc"),
  ogTitle: () => `${t("community.pagesDirectory.seoSuggestedTitle")} | VNSEEA`,
  ogDescription: () => t("community.pagesDirectory.seoSuggestedDesc"),
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
