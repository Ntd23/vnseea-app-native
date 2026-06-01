<!-- Description: Thin Nuxt route wrapper for the backend-backed community groups directory screen. -->
<template>
  <CommunityPresentationGroupsPage mode="mine" />
</template>

<script setup lang="ts">
import CommunityPresentationGroupsPage from "../../src/community/presentation/pages/GroupsPage.vue"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(route.fullPath || "/groups", requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("community.groups.title")} | VNSEEA`,
  description: () => t("community.groups.descDefault"),
  ogTitle: () => `${t("community.groups.title")} | VNSEEA`,
  ogDescription: () => t("community.groups.descDefault"),
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
