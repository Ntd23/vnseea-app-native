<!-- English description: Thin Nuxt wrapper for normalized public profile routes. -->
<template>
  <PagesProfilePage />
</template>

<script setup lang="ts">
import PagesProfilePage from "../../src/profile/presentation/pages/ProfilePage.vue"
import { usePublicSeoMeta } from "../../src/seo/application/composables/usePublicSeoMeta"
import { createApiPublicSeoRepository } from "../../src/seo/infrastructure/repositories/ApiPublicSeoRepository"

definePageMeta({
  layout: "default",
})

const route = useRoute()

const normalizeProfileUsername = (value: unknown) => {
  const raw = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "")

  try {
    return decodeURIComponent(raw).trim().replace(/^@+/, "")
  } catch {
    return raw.trim().replace(/^@+/, "")
  }
}

const username = computed(() => {
  return normalizeProfileUsername(route.params.username)
})

const seoRepository = createApiPublicSeoRepository()
const { data: seoMeta, error: seoError } = await useAsyncData(
  () => `seo:profile:${username.value}`,
  () => username.value
    ? seoRepository.getPublicSeo({ routeType: "profile", identifier: username.value })
    : Promise.resolve(null),
  {
    watch: [username],
    default: () => null,
  },
)

if (seoError.value) {
  throw createError({
    statusCode: seoError.value.statusCode || 404,
    statusMessage: seoError.value.statusMessage || "Profile not found.",
  })
}

usePublicSeoMeta(seoMeta)
</script>
