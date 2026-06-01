<!-- English description: Thin Nuxt route wrapper for the backend-backed jobs directory. -->
<template>
  <JobsPresentationJobsPage />
</template>

<script setup lang="ts">
import JobsPresentationJobsPage from "../../src/jobs/presentation/pages/JobsPage.vue"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL("/jobs", requestURL.origin).toString())

useSeoMeta({
  title: () => t("pages.jobsPage.seoTitle"),
  description: () => t("pages.jobsPage.seoDescription"),
  ogTitle: () => t("pages.jobsPage.seoTitle"),
  ogDescription: () => t("pages.jobsPage.seoDescription"),
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
