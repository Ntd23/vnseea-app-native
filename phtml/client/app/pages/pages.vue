<!-- Description: Thin Nuxt route wrapper for the backend-backed community pages directory screen. -->
<template>
  <CommunityPresentationPagesDirectoryPage />
</template>

<script setup lang="ts">
import CommunityPresentationPagesDirectoryPage from "../../src/community/presentation/pages/PagesDirectoryPage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(appRoutes.pages, requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("community.pagesDirectory.seoMineTitle")} | VNSEEA`,
  description: () => t("community.pagesDirectory.seoMineDesc"),
  ogTitle: () => `${t("community.pagesDirectory.seoMineTitle")} | VNSEEA`,
  ogDescription: () => t("community.pagesDirectory.seoMineDesc"),
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
