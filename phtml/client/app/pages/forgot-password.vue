<template>
  <PagesForgotPasswordPage />
</template>

<script setup lang="ts">
import PagesForgotPasswordPage from "../../src/auth/presentation/pages/ForgotPasswordPage.vue"
definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(route.fullPath || '/forgot-password', requestURL.origin).toString())

useSeoMeta({
  title: () => t('pages.forgotPasswordPage.seoTitle'),
  description: () => t('pages.forgotPasswordPage.seoDescription'),
  ogTitle: () => t('pages.forgotPasswordPage.seoTitle'),
  ogDescription: () => t('pages.forgotPasswordPage.seoDescription'),
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
