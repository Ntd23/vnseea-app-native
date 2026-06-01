<!-- Description: Thin Nuxt route wrapper for the backend-backed event creation route. -->
<template>
  <EventsPresentationCreateEventPage />
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import EventsPresentationCreateEventPage from "../../../src/events/presentation/pages/CreateEventPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() =>
  new URL(route.fullPath || appRoutes.createEvent, requestURL.origin).toString(),
)

useSeoMeta({
  title: () => t("pages.createEventPage.seoTitle"),
  description: () => t("pages.createEventPage.seoDescription"),
  ogTitle: () => t("pages.createEventPage.seoTitle"),
  ogDescription: () => t("pages.createEventPage.seoDescription"),
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
