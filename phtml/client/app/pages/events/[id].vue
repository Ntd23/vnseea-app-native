<!-- Description: Thin Nuxt route wrapper for the backend-backed event detail route. -->
<template>
  <EventsPresentationEventDetailPage />
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import EventsPresentationEventDetailPage from "../../../src/events/presentation/pages/EventDetailPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() =>
  new URL(route.fullPath || appRoutes.eventDetail(String(route.params.id || "")), requestURL.origin).toString(),
)

useSeoMeta({
  title: () => `${t("pages.eventDetailPage.seoTitle")} | VNSEEA`,
  description: () => t("pages.eventDetailPage.seoDescription"),
  ogTitle: () => `${t("pages.eventDetailPage.seoTitle")} | VNSEEA`,
  ogDescription: () => t("pages.eventDetailPage.seoDescription"),
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [
    {
      rel: "canonical",
      href: canonicalUrl.value,
    },
  ],
})
</script>
