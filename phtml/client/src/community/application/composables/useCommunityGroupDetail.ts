// Description: Loads a community group from the backend-backed repository and derives display labels for the detail page.

import { computed, toValue, type MaybeRefOrGetter } from "vue"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"
import { formatCommunityCount } from "../../domain/services/community-metrics.service"

export function useCommunityGroupDetail(
  slugSource: MaybeRefOrGetter<string>,
  repository = createApiCommunityRepository(),
) {
  const { t, locale } = useI18n()
  const slug = computed(() => String(toValue(slugSource) || "").trim())

  const { data: group, status, error, refresh } = useAsyncData(
    () => `community:group:${slug.value}`,
    () => slug.value ? repository.getGroupBySlug(slug.value) : Promise.resolve(null),
    {
      watch: [slug],
      default: () => null,
    },
  )

  const members = computed(() => [])

  const privacyLabel = computed(() =>
    t(`pages.groupDetailPage.privacy.${group.value?.privacy || "public"}`),
  )

  const privacyDescription = computed(() =>
    t(`pages.groupDetailPage.privacyDescription.${group.value?.privacy || "public"}`),
  )

  const categoryLabel = computed(() =>
    t(`pages.groupDetailPage.categories.${group.value?.category || "auto"}`),
  )

  const memberCountLabel = computed(() =>
    t("pages.groupDetailPage.memberCount", {
      count: formatCommunityCount(group.value?.members ?? 0, locale.value),
    }),
  )

  const onlineCountLabel = computed(() =>
    t("pages.groupDetailPage.onlineCount", {
      count: formatCommunityCount(0, locale.value),
    }),
  )

  const { data: groupPostsResponse, status: groupPostsStatus, refresh: refreshGroupPosts } = useAsyncData(
    () => `community:group:${slug.value}:posts`,
    () => slug.value
      ? repository.getGroupPosts(slug.value, { limit: 10 })
      : Promise.resolve({ posts: [], hasMore: false, nextOffset: null }),
    {
      watch: [slug],
      default: () => ({ posts: [], hasMore: false, nextOffset: null }),
    },
  )

  const groupPosts = computed(() => groupPostsResponse.value?.posts ?? [])
  const groupPostsHasMore = computed(() => groupPostsResponse.value?.hasMore === true)
  const groupPostsNextOffset = computed(() => groupPostsResponse.value?.nextOffset ?? null)

  return {
    slug,
    group,
    members,
    privacyLabel,
    privacyDescription,
    categoryLabel,
    memberCountLabel,
    onlineCountLabel,
    groupPosts,
    groupPostsHasMore,
    groupPostsNextOffset,
    groupPostsStatus,
    refreshGroupPosts,
    status,
    error,
    refresh,
  }
}
