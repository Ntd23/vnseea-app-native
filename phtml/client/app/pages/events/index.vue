<!-- Description: Thin Nuxt route wrapper for the backend-backed events directory route. -->
<template>
  <EventsPresentationEventsPage />
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import EventsPresentationEventsPage from "../../../src/events/presentation/pages/EventsPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() =>
  new URL(route.fullPath || appRoutes.events, requestURL.origin).toString(),
)

useSeoMeta({
  title: () => t("pages.eventsPage.seoTitle"),
  description: () => t("pages.eventsPage.seoDescription"),
  ogTitle: () => t("pages.eventsPage.seoTitle"),
  ogDescription: () => t("pages.eventsPage.seoDescription"),
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
