<!-- Description: Thin Nuxt route wrapper for the backend-backed community group detail screen. -->
<template>
  <CommunityPresentationGroupDetailPage />
</template>

<script setup lang="ts">
import CommunityPresentationGroupDetailPage from "../../../src/community/presentation/pages/GroupDetailPage.vue"
import { usePublicSeoMeta } from "../../../src/seo/application/composables/usePublicSeoMeta"
import { createApiPublicSeoRepository } from "../../../src/seo/infrastructure/repositories/ApiPublicSeoRepository"

definePageMeta({ layout: "default" })

const route = useRoute()
const slug = computed(() => String(route.params.name || ""))
const seoRepository = createApiPublicSeoRepository()
const { data: seoMeta, error: seoError } = await useAsyncData(
  () => `seo:group:${slug.value}`,
  () => slug.value
    ? seoRepository.getPublicSeo({ routeType: "group", identifier: slug.value })
    : Promise.resolve(null),
  {
    watch: [slug],
    default: () => null,
  },
)

if (seoError.value) {
  throw createError({
    statusCode: seoError.value.statusCode || 404,
    statusMessage: seoError.value.statusMessage || "Group not found.",
  })
}

usePublicSeoMeta(seoMeta)
</script>
