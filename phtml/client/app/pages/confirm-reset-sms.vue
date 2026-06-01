<template>
  <AuthConfirmResetSmsPage />
</template>

<script setup lang="ts">
import AuthConfirmResetSmsPage from "../../src/auth/presentation/pages/ConfirmResetSmsPage.vue"

definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const route = useRoute()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL(route.fullPath || "/confirm-reset-sms", requestURL.origin).toString())

useSeoMeta({
  title: "Confirm phone reset",
  description: "Confirm the phone reset code for your VNSEEA account.",
  ogTitle: "Confirm phone reset",
  ogDescription: "Confirm the phone reset code for your VNSEEA account.",
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [{ rel: "canonical", href: canonicalUrl }],
})
</script>
