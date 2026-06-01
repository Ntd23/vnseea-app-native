<template>
  <AuthResetPasswordPage />
</template>

<script setup lang="ts">
import AuthResetPasswordPage from "../../src/auth/presentation/pages/ResetPasswordPage.vue"

definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const route = useRoute()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL(route.fullPath || "/reset-password", requestURL.origin).toString())

useSeoMeta({
  title: "Reset password",
  description: "Set a new password for your VNSEEA account.",
  ogTitle: "Reset password",
  ogDescription: "Set a new password for your VNSEEA account.",
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [{ rel: "canonical", href: canonicalUrl }],
})
</script>
