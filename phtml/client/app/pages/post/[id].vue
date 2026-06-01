<!-- English description: Thin Nuxt route wrapper for a single feed post detail page used by notification deep links. -->
<template>
  <FeedPresentationPostDetailPage :post-id="postId" />
</template>

<script setup lang="ts">
import FeedPresentationPostDetailPage from "../../../src/feed/presentation/pages/PostDetailPage.vue"
import { usePublicSeoMeta } from "../../../src/seo/application/composables/usePublicSeoMeta"
import { createApiPublicSeoRepository } from "../../../src/seo/infrastructure/repositories/ApiPublicSeoRepository"

definePageMeta({
  layout: "default",
})

const route = useRoute()
const postId = computed(() => Number(route.params.id ?? 0) || 0)
const seoRepository = createApiPublicSeoRepository()
const { data: seoMeta, error: seoError } = await useAsyncData(
  () => `seo:post:${postId.value}`,
  () => postId.value > 0
    ? seoRepository.getPublicSeo({ routeType: "post", identifier: String(postId.value) })
    : Promise.resolve(null),
  {
    watch: [postId],
    default: () => null,
  },
)

if (seoError.value) {
  throw createError({
    statusCode: seoError.value.statusCode || 404,
    statusMessage: seoError.value.statusMessage || "Post not found.",
  })
}

usePublicSeoMeta(seoMeta)
</script>
