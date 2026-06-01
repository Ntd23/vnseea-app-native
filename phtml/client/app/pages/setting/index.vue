<!-- Description: Thin Nuxt route wrapper for the backend-backed account settings screen. -->
<template>
  <SettingsPresentationSettingsPage />
</template>

<script setup lang="ts">
import SettingsPresentationSettingsPage from "../../../src/settings/presentation/pages/SettingsPage.vue"
import { appRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

definePageMeta({ layout: "default" })

const { t } = useI18n()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL(appRoutes.settings, requestURL.origin).toString())

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
