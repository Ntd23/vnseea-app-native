<!-- Description: Thin Nuxt route wrapper for the backend-backed joined-groups directory screen. -->
<template>
  <CommunityPresentationGroupsPage mode="joined" />
</template>

<script setup lang="ts">
import CommunityPresentationGroupsPage from "../../src/community/presentation/pages/GroupsPage.vue"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

const canonicalUrl = computed(() => new URL(route.fullPath || "/joined_groups", requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("community.groups.titleJoined")} | VNSEEA`,
  description: () => t("community.groups.descJoined"),
  ogTitle: () => `${t("community.groups.titleJoined")} | VNSEEA`,
  ogDescription: () => t("community.groups.descJoined"),
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
