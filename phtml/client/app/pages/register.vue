<template>
  <PagesRegisterPage />
</template>

<script setup lang="ts">
import PagesRegisterPage from "../../src/auth/presentation/pages/RegisterPage.vue"
definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(route.fullPath || '/register', requestURL.origin).toString())

useSeoMeta({
  title: () => t('pages.registerPage.seoTitle'),
  description: () => t('pages.registerPage.seoDescription'),
  ogTitle: () => t('pages.registerPage.seoTitle'),
  ogDescription: () => t('pages.registerPage.seoDescription'),
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
