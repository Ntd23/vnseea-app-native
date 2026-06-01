// English description: Applies public entity SEO metadata to a Nuxt route without generic fallback content.

import { computed, toValue, type MaybeRefOrGetter } from "vue"
import type { PublicSeoMeta } from "../../domain/types/public-seo.types"

export function usePublicSeoMeta(metaSource: MaybeRefOrGetter<PublicSeoMeta | null>) {
  const resolvedMeta = computed(() => toValue(metaSource))

  useSeoMeta(() => {
    const meta = resolvedMeta.value

    if (!meta) {
      return {
        robots: "noindex, nofollow",
      }
    }

    const seoMeta: Record<string, string> = {
      ogUrl: meta.canonicalUrl,
      ogType: meta.type,
      robots: meta.robots,
    }

    if (meta.title) {
      seoMeta.title = meta.title
      seoMeta.ogTitle = meta.title
      seoMeta.twitterTitle = meta.title
    }

    if (meta.description) {
      seoMeta.description = meta.description
      seoMeta.ogDescription = meta.description
      seoMeta.twitterDescription = meta.description
    }

    if (meta.imageUrl) {
      seoMeta.ogImage = meta.imageUrl
      seoMeta.twitterCard = "summary_large_image"
      seoMeta.twitterImage = meta.imageUrl
    }

    if (meta.authorName) {
      seoMeta.author = meta.authorName
    }

    if (meta.publishedTime) {
      seoMeta.articlePublishedTime = meta.publishedTime
    }

    if (meta.modifiedTime) {
      seoMeta.articleModifiedTime = meta.modifiedTime
    }

    return seoMeta
  })

  useHead(() => {
    const meta = resolvedMeta.value

    if (!meta) {
      return {}
    }

    return {
      link: [
        {
          rel: "canonical",
          href: meta.canonicalUrl,
        },
      ],
      meta: meta.keywords?.length
        ? [
            {
              name: "keywords",
              content: meta.keywords.join(", "),
            },
          ]
        : [],
    }
  })
}
