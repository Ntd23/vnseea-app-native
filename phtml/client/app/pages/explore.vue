<!-- Description: Declares the public explore route wrapper and route-level SEO metadata for the API-backed explore page. -->
<template>
  <ExplorePresentationExplorePage />
</template>

<script setup lang="ts">
import ExplorePresentationExplorePage from "../../src/explore/presentation/pages/ExplorePage.vue"
import type { ExploreView } from "../../src/explore/application/composables/useExploreData"

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

const { t } = useI18n()
const route = useRoute()
const requestURL = useRequestURL()

definePageMeta({
  layout: "default",
})

const normalizeView = (value: string): ExploreView =>
  value === "posts" || value === "users" || value === "pages" ? value : "all"

const activeView = computed<ExploreView>(() =>
  normalizeView(readQueryValue(route.query.view)),
)

const activeViewLabel = computed(() => {
  if (activeView.value === "posts") return t("pages.explorePage.viewPostsLabel")
  if (activeView.value === "users") return t("pages.explorePage.viewUsersLabel")
  if (activeView.value === "pages") return t("pages.explorePage.viewPagesLabel")
  return t("pages.explorePage.viewAllLabel")
})

const canonicalUrl = computed(() => {
  const url = new URL(route.path || "/explore", requestURL.origin)

  if (activeView.value !== "all") {
    url.searchParams.set("view", activeView.value)
  }

  return url.toString()
})

useSeoMeta({
  title: () =>
    activeView.value === "all"
      ? t("pages.explorePage.seoTitle")
      : t("pages.explorePage.filteredSeoTitle", { label: activeViewLabel.value }),
  description: () =>
    activeView.value === "all"
      ? t("pages.explorePage.seoDescription")
      : t("pages.explorePage.filteredSeoDescription", { label: activeViewLabel.value }),
  ogTitle: () =>
    activeView.value === "all"
      ? t("pages.explorePage.seoTitle")
      : t("pages.explorePage.filteredSeoTitle", { label: activeViewLabel.value }),
  ogDescription: () =>
    activeView.value === "all"
      ? t("pages.explorePage.seoDescription")
      : t("pages.explorePage.filteredSeoDescription", { label: activeViewLabel.value }),
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
