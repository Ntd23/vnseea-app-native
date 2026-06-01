<template>
  <PagesWelcomePage />
</template>

<script setup lang="ts">
import PagesWelcomePage from "../../src/pages/presentation/pages/WelcomePage.vue"
definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(route.fullPath || '/welcome', requestURL.origin).toString())

useSeoMeta({
  title: () => t('pages.welcomePage.seoTitle'),
  description: () => t('pages.welcomePage.seoDescription'),
  ogTitle: () => t('pages.welcomePage.seoTitle'),
  ogDescription: () => t('pages.welcomePage.seoDescription'),
  ogUrl: () => canonicalUrl.value,
  robots: 'noindex, nofollow',
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl,
    },
  ],
})
</script>
