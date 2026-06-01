<template>
  <PagesPokePage />
</template>

<script setup lang="ts">
import PagesPokePage from "../../src/poke/presentation/pages/PokePage.vue"
definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useHead({
  title: () => t("pages.pokePage.seoTitle"),
})
</script>
