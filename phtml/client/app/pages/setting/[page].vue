<!-- Description: Thin Nuxt route wrapper for individual backend-backed account settings pages. -->
<template>
  <SettingsPresentationSettingsPage :page-slug="pageSlug" />
</template>

<script setup lang="ts">
import SettingsPresentationSettingsPage from "../../../src/settings/presentation/pages/SettingsPage.vue"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()
const pageSlug = computed(() => {
  const value = route.params.page
  return Array.isArray(value) ? value[0] : String(value ?? "")
})
const canonicalUrl = computed(() => new URL(appRoutes.settingsPage(pageSlug.value), requestURL.origin).toString())

useSeoMeta({
  title: () => `${t("settings.hero.title")} | VNSEEA`,
  description: () => t("settings.hero.description"),
  ogTitle: () => `${t("settings.hero.title")} | VNSEEA`,
  ogDescription: () => t("settings.hero.description"),
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
