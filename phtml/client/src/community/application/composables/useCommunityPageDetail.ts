// Description: Loads a community page from the backend-backed repository and derives display labels for the detail page.

import { computed, toValue, type MaybeRefOrGetter } from "vue"
import { formatCommunityCount } from "../../domain/services/community-metrics.service"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

export function useCommunityPageDetail(
  slugSource: MaybeRefOrGetter<string>,
  repository = createApiCommunityRepository(),
) {
  const { t, locale } = useI18n()
  const slug = computed(() => String(toValue(slugSource) || "").trim())

  const { data: page, status, error, refresh } = useAsyncData(
    () => `community:page:${slug.value}`,
    () => slug.value ? repository.getPageBySlug(slug.value) : Promise.resolve(null),
    {
      watch: [slug],
      default: () => null,
    },
  )

  const { data: pagePostsResponse, status: pagePostsStatus, refresh: refreshPagePosts } = useAsyncData(
    () => `community:page:${slug.value}:posts`,
    () => slug.value
      ? repository.getPagePosts(slug.value, { limit: 10 })
      : Promise.resolve({ posts: [], hasMore: false, nextOffset: null }),
    {
      watch: [slug],
      default: () => ({ posts: [], hasMore: false, nextOffset: null }),
    },
  )

  const { data: pageFollowers, status: pageFollowersStatus, refresh: refreshPageFollowers } = useAsyncData(
    () => `community:page:${slug.value}:followers`,
    () => slug.value ? repository.getPageFollowers(slug.value) : Promise.resolve([]),
    {
      watch: [slug],
      default: () => [],
    },
  )

  const categoryLabel = computed(() =>
    t(`pages.pageDetailPage.categories.${page.value?.category || "local-business"}`),
  )

  const followerCountLabel = computed(() =>
    t("pages.pageDetailPage.followerCount", {
      count: formatCommunityCount(page.value?.followers ?? 0, locale.value),
    }),
  )

  const likeCountLabel = computed(() =>
    t("pages.pageDetailPage.likeCount", {
      count: formatCommunityCount(page.value?.likes ?? 0, locale.value),
    }),
  )

  const pagePosts = computed(() => pagePostsResponse.value?.posts ?? [])
  const pagePostsHasMore = computed(() => pagePostsResponse.value?.hasMore === true)
  const pagePostsNextOffset = computed(() => pagePostsResponse.value?.nextOffset ?? null)

  async function followPage() {
    if (!slug.value) {
      return null
    }

    const updatedPage = await repository.followPage(slug.value)
    page.value = updatedPage
    return updatedPage
  }

  async function likePage() {
    if (!slug.value) {
      return null
    }

    const updatedPage = await repository.likePage(slug.value)
    page.value = updatedPage
    return updatedPage
  }

  return {
    slug,
    page,
    categoryLabel,
    followerCountLabel,
    likeCountLabel,
    pagePosts,
    pageFollowers,
    pageFollowersStatus,
    refreshPageFollowers,
    pagePostsHasMore,
    pagePostsNextOffset,
    pagePostsStatus,
    refreshPagePosts,
    status,
    error,
    followPage,
    likePage,
    refresh,
  }
}
