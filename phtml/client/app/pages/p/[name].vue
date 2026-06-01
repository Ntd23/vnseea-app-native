<!-- Description: Thin Nuxt route wrapper for the backend-backed community page detail screen. -->
<template>
  <CommunityPresentationPageDetailPage />
</template>

<script setup lang="ts">
import CommunityPresentationPageDetailPage from "../../../src/community/presentation/pages/PageDetailPage.vue"
import { usePublicSeoMeta } from "../../../src/seo/application/composables/usePublicSeoMeta"
import { createApiPublicSeoRepository } from "../../../src/seo/infrastructure/repositories/ApiPublicSeoRepository"

definePageMeta({ layout: "default" })

const route = useRoute()
const pageSlug = computed(() => String(route.params.name || ""))
const hasPreviewQuery = computed(() =>
  ["name", "description", "category"].some((key) => {
    const value = route.query[key]
    if (Array.isArray(value)) return String(value[0] || "").trim().length > 0
    return typeof value === "string" && value.trim().length > 0
  }),
)
const seoRepository = createApiPublicSeoRepository()
const { data: seoMeta, error: seoError } = await useAsyncData(
  () => `seo:page:${pageSlug.value}`,
  () => pageSlug.value
    ? seoRepository.getPublicSeo({ routeType: "page", identifier: pageSlug.value })
    : Promise.resolve(null),
  {
    watch: [pageSlug],
    default: () => null,
  },
)

if (seoError.value) {
  throw createError({
    statusCode: seoError.value.statusCode || 404,
    statusMessage: seoError.value.statusMessage || "Page not found.",
  })
}

const effectiveSeoMeta = computed(() =>
  seoMeta.value && hasPreviewQuery.value
    ? { ...seoMeta.value, robots: "noindex, nofollow" as const }
    : seoMeta.value,
)

usePublicSeoMeta(effectiveSeoMeta)
</script>
