<template>
  <AuthConfirmLoginPage />
</template>

<script setup lang="ts">
import AuthConfirmLoginPage from "../../src/auth/presentation/pages/ConfirmLoginPage.vue"

definePageMeta({
  layout: "guest",
  middleware: "guest",
})

const route = useRoute()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL(route.fullPath || "/confirm-login", requestURL.origin).toString())

useSeoMeta({
  title: "Confirm sign in",
  description: "Confirm the sign-in code for your VNSEEA account.",
  ogTitle: "Confirm sign in",
  ogDescription: "Confirm the sign-in code for your VNSEEA account.",
  ogUrl: () => canonicalUrl.value,
  robots: "noindex, nofollow",
})

useHead({
  link: [{ rel: "canonical", href: canonicalUrl }],
})
</script>
