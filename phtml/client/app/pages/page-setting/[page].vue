<!-- Description: Thin Nuxt route wrapper for the community page settings screen. -->
<template>
  <CommunityPresentationPageSettingPage />
</template>

<script setup lang="ts">
import CommunityPresentationPageSettingPage from "../../../src/community/presentation/pages/PageSettingPage.vue"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => {
  const slug = String(route.params.page || "")
  return new URL(appRoutes.pageSetting(slug), requestURL.origin).toString()
})

useSeoMeta({
  title: () => t("community.pageSettings.seoTitleFallback"),
  description: () => t("community.pageSettings.seoDescFallback"),
  ogTitle: () => t("community.pageSettings.seoTitleFallback"),
  ogDescription: () => t("community.pageSettings.seoDescFallback"),
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
