<template>
  <AuthConfirmAccountPage />
</template>

<script setup lang="ts">
import AuthConfirmAccountPage from "../../src/auth/presentation/pages/ConfirmAccountPage.vue"

definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const route = useRoute()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL(route.fullPath || "/confirm-account", requestURL.origin).toString())

useSeoMeta({
  title: "Verify account",
  description: "Verify your VNSEEA account with the confirmation code sent by the backend.",
  ogTitle: "Verify account",
  ogDescription: "Verify your VNSEEA account with the confirmation code sent by the backend.",
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [{ rel: "canonical", href: canonicalUrl }],
})
</script>
