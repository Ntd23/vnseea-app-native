<!-- Description: Thin Nuxt route wrapper for the backend-backed community page creation screen. -->
<template>
  <CommunityPresentationCreatePagePage />
</template>

<script setup lang="ts">
import CommunityPresentationCreatePagePage from "../../src/community/presentation/pages/CreatePagePage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(appRoutes.createPage, requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("community.creation.page.seoTitle")} | VNSEEA`,
  description: () => t("community.creation.page.seoDesc"),
  ogTitle: () => `${t("community.creation.page.seoTitle")} | VNSEEA`,
  ogDescription: () => t("community.creation.page.seoDesc"),
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
