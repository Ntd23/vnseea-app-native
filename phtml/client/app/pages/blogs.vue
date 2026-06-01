<template>
  <BlogsPresentationBlogsPage />
</template>

<script setup lang="ts">
import BlogsPresentationBlogsPage from "../../src/blogs/presentation/pages/BlogsPage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"
definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(appRoutes.blogs, requestURL.origin).toString())

useSeoMeta({
  title: () => t("pages.blogsPage.seoTitle"),
  description: () => t("pages.blogsPage.seoDescription"),
  ogTitle: () => t("pages.blogsPage.seoTitle"),
  ogDescription: () => t("pages.blogsPage.seoDescription"),
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
