<!-- English description: Thin Nuxt route wrapper for the backend-backed read blog page with entity SEO. -->
<template>
  <BlogsPresentationReadBlogPage />
</template>

<script setup lang="ts">
import BlogsPresentationReadBlogPage from "../../../src/blogs/presentation/pages/ReadBlogPage.vue"
import { usePublicSeoMeta } from "../../../src/seo/application/composables/usePublicSeoMeta"
import { createApiPublicSeoRepository } from "../../../src/seo/infrastructure/repositories/ApiPublicSeoRepository"

definePageMeta({
  layout: "default",
})

const route = useRoute()
const currentSlug = computed(() => String(route.params.slug ?? ""))
const seoRepository = createApiPublicSeoRepository()
const { data: seoMeta, error: seoError } = await useAsyncData(
  () => `seo:blog:${currentSlug.value}`,
  () => currentSlug.value
    ? seoRepository.getPublicSeo({ routeType: "blog", identifier: currentSlug.value })
    : Promise.resolve(null),
  {
    watch: [currentSlug],
    default: () => null,
  },
)

if (seoError.value) {
  throw createError({
    statusCode: seoError.value.statusCode || 404,
    statusMessage: seoError.value.statusMessage || "Blog not found.",
  })
}

usePublicSeoMeta(seoMeta)
</script>
