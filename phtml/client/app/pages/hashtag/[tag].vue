<template>
  <ExplorePresentationHashtagPage />
</template>

<script setup lang="ts">
import ExplorePresentationHashtagPage from "../../../src/explore/presentation/pages/HashtagPage.vue"
import { useHashtagPageVM } from "../../../src/explore/application/view-models/useHashtagPageVM"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const requestURL = useRequestURL()
const { hashtagLabel, rawTag } = useHashtagPageVM()

const canonicalUrl = computed(() =>
  new URL(`/hashtag/${rawTag.value}`, requestURL.origin).toString(),
)

useSeoMeta({
  title: () => t("pages.hashtagPage.seoTitle", { tag: hashtagLabel.value }),
  description: () => t("pages.hashtagPage.seoDescriptionMatch", { tag: hashtagLabel.value }),
  ogTitle: () => t("pages.hashtagPage.seoTitle", { tag: hashtagLabel.value }),
  ogDescription: () => t("pages.hashtagPage.seoDescriptionMatch", { tag: hashtagLabel.value }),
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
