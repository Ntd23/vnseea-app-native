<!-- Description: Thin Nuxt route wrapper for the backend-backed community group settings screen. -->
<template>
  <CommunityPresentationGroupSettingPage />
</template>

<script setup lang="ts">
import CommunityPresentationGroupSettingPage from "../../../src/community/presentation/pages/GroupSettingPage.vue"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()
const slug = computed(() => String(route.params.group || ""))

const canonicalUrl = computed(() =>
  new URL(appRoutes.groupSetting(slug.value), requestURL.origin).toString(),
)

useSeoMeta({
  title: () => `${t("community.settings.eyebrow")} | VNSEEA`,
  description: () => t("community.settings.desc"),
  ogTitle: () => `${t("community.settings.eyebrow")} | VNSEEA`,
  ogDescription: () => t("community.settings.desc"),
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
