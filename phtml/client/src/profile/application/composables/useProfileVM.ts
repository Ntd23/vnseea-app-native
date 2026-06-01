// Description: Loads backend-backed profile data and exposes tab state for the Nuxt profile page.

import type { ProfileApiResponse, ProfileTabKey } from "../../domain/types/profile.types"
import { createApiProfileRepository } from "../../infrastructure/repositories/ApiProfileRepository"

type ProfileInfoItem = {
  icon: string
  label: string
  value: string
}

type ProfileAboutSection = {
  title: string
  items: ProfileInfoItem[]
}

export function useProfileVM(
  username: Ref<string> | ComputedRef<string>,
  repository = createApiProfileRepository(),
) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const toast = useToast()
  const activeTab = ref<ProfileTabKey>("timeline")
  const actionPending = ref(false)
  const postSearchQuery = ref("")
  const initialSkeletonVisible = ref(true)
  const timelineLoadingMore = ref(false)
  const productsExpanded = ref(false)
  const timelinePostList = ref<ProfileApiResponse["timelinePosts"]>([])
  const timelineHasMoreState = ref(false)
  const timelineNextOffsetState = ref<number | null>(null)
  const resolvedUsername = computed(() => username.value.trim().replace(/^@+/, ""))

  const { data, status, error, refresh } = useAsyncData(
    () => `profile:${resolvedUsername.value}`,
    () => resolvedUsername.value
      ? repository.getProfileByUsername(resolvedUsername.value)
      : Promise.resolve(null),
    {
      watch: [resolvedUsername],
      default: () => null,
      lazy: true,
      server: false,
    },
  )

  onMounted(() => {
    window.setTimeout(() => {
      initialSkeletonVisible.value = false
    }, 450)
  })

  const formatCount = (value: number) =>
    new Intl.NumberFormat(locale.value === "vi" ? "vi-VN" : "en-US").format(value)

  const copy = computed(() => ({
    tabs: {
      timeline: t("pages.profilePage.tabs.timeline"),
      about: t("pages.profilePage.tabs.about"),
      friends: t("pages.profilePage.tabs.friends"),
      photos: t("pages.profilePage.tabs.photos"),
      videos: t("pages.profilePage.tabs.videos"),
      albums: t("pages.profilePage.tabs.albums"),
    },
    introTitle: t("settings.data.fields.about"),
    introAction: t("navigation.mobileMenu.settingsNav.editProfile"),
    aboutTitle: t("settings.data.fields.about"),
    friendsTitle: t("pages.profilePage.tabs.friends"),
    friendsAction: t("navigation.mobileMenu.mainNav.findFriends"),
    photosTitle: t("pages.profilePage.tabs.photos"),
    photosAction: t("navigation.leftSidebar.showMore"),
    videosTitle: t("pages.profilePage.tabs.videos"),
    albumsTitle: t("pages.profilePage.tabs.albums"),
  }))

  const tabs = computed(() => [
    { key: "timeline" as const, label: copy.value.tabs.timeline },
    { key: "about" as const, label: copy.value.tabs.about },
    { key: "friends" as const, label: copy.value.tabs.friends },
    { key: "photos" as const, label: copy.value.tabs.photos },
    { key: "videos" as const, label: copy.value.tabs.videos },
    { key: "albums" as const, label: copy.value.tabs.albums },
  ])

  const heroActions = computed(() => {
    const profile = data.value

    if (!profile) {
      return []
    }

    if (profile.isOwner) {
      return [
        {
          id: "edit-profile",
          label: t("navigation.mobileMenu.settingsNav.editProfile"),
          icon: "i-ph-pencil-simple-duotone",
          variant: "solid" as const,
        },
      ]
    }

    return [
      {
        id: "follow-profile",
        label: profile.isFollowRequested
          ? t("pages.pageDetailPage.followers.requestedButton")
          : profile.isFollowing
            ? t("pages.pageDetailPage.followingButton")
            : t("pages.pageDetailPage.followFallback"),
        icon: profile.isFollowRequested
          ? "i-ph-clock-countdown-duotone"
          : profile.isFollowing
            ? "i-ph-user-check-duotone"
            : "i-ph-user-plus-duotone",
        variant: profile.isFollowing || profile.isFollowRequested ? "soft" as const : "solid" as const,
      },
      {
        id: "message-profile",
        label: t("pages.pageDetailPage.messageButton"),
        icon: "i-ph-chat-circle-dots-duotone",
        variant: "soft" as const,
      },
    ]
  })

  const buildIntroItems = (profile: ProfileApiResponse) => {
    const items: ProfileInfoItem[] = []

    if (profile.working) {
      items.push({
        icon: "i-ph-briefcase-duotone",
        label: t("settings.data.fields.working"),
        value: profile.working,
      })
    }

    if (profile.school) {
      items.push({
        icon: "i-ph-graduation-cap-duotone",
        label: t("settings.data.fields.school"),
        value: profile.school,
      })
    }

    if (profile.address) {
      items.push({
        icon: "i-ph-map-pin-duotone",
        label: t("settings.data.fields.address"),
        value: profile.address,
      })
    }

    if (profile.website) {
      items.push({
        icon: "i-ph-globe-simple-duotone",
        label: t("settings.data.fields.website"),
        value: profile.website,
      })
    }

    return items
  }

  const buildAboutSections = (profile: ProfileApiResponse) => {
    const sections: ProfileAboutSection[] = []

    const workAndEducation: ProfileInfoItem[] = []
    const contact: ProfileInfoItem[] = []
    const basics: ProfileInfoItem[] = []

    if (profile.working) {
      workAndEducation.push({
        icon: "i-ph-briefcase-duotone",
        label: t("settings.data.fields.working"),
        value: profile.working,
      })
    }

    if (profile.school) {
      workAndEducation.push({
        icon: "i-ph-graduation-cap-duotone",
        label: t("settings.data.fields.school"),
        value: profile.school,
      })
    }

    if (profile.email) {
      contact.push({
        icon: "i-ph-envelope-simple-duotone",
        label: t("settings.data.fields.email"),
        value: profile.email,
      })
    }

    if (profile.phone) {
      contact.push({
        icon: "i-ph-phone-duotone",
        label: t("settings.data.fields.phone"),
        value: profile.phone,
      })
    }

    if (profile.website) {
      contact.push({
        icon: "i-ph-globe-simple-duotone",
        label: t("settings.data.fields.website"),
        value: profile.website,
      })
    }

    if (profile.gender) {
      basics.push({
        icon: "i-ph-gender-intersex-duotone",
        label: t("settings.data.fields.gender"),
        value: profile.gender,
      })
    }

    if (profile.birthday) {
      basics.push({
        icon: "i-ph-calendar-blank-duotone",
        label: t("settings.data.fields.birthday"),
        value: profile.birthday,
      })
    }

    if (profile.relationship) {
      basics.push({
        icon: "i-ph-heart-duotone",
        label: t("settings.data.fields.relationship"),
        value: profile.relationship,
      })
    }

    if (workAndEducation.length > 0) {
      sections.push({
        title: t("pages.profilePage.aboutSections.workEducation"),
        items: workAndEducation,
      })
    }

    if (contact.length > 0) {
      sections.push({
        title: t("pages.profilePage.aboutSections.contact"),
        items: contact,
      })
    }

    if (basics.length > 0) {
      sections.push({
        title: t("pages.profilePage.aboutSections.basic"),
        items: basics,
      })
    }

    return sections
  }

  const profile = computed(() => {
    const apiProfile = data.value

    if (!apiProfile) {
      return null
    }

    return {
      id: apiProfile.id,
      username: apiProfile.username,
      displayName: apiProfile.displayName,
      headline: apiProfile.headline,
      bio: apiProfile.bio,
      coverImage: apiProfile.coverImage,
      avatarUrl: apiProfile.avatarUrl,
      avatarText: apiProfile.avatarText,
      verified: apiProfile.verified,
      isOwner: apiProfile.isOwner,
      isFollowing: apiProfile.isFollowing,
      isFollowRequested: apiProfile.isFollowRequested,
      roleBadge: apiProfile.headline || t("navigation.headerBar.profile"),
      statusBadge: apiProfile.statusText,
      counts: {
        followers: apiProfile.followersCount,
        following: apiProfile.followingCount,
        posts: apiProfile.postCount,
        albums: apiProfile.albumCount,
        likes: apiProfile.likedPagesCount,
        groups: apiProfile.joinedGroupsCount,
        products: apiProfile.productsCount,
      },
      stats: [
        { label: t("pages.pageDetailPage.followStat"), value: formatCount(apiProfile.followersCount) },
        { label: t("pages.profilePage.stats.following"), value: formatCount(apiProfile.followingCount) },
        { label: t("pages.profilePage.tabs.timeline"), value: formatCount(apiProfile.postCount) },
        { label: t("pages.profilePage.tabs.albums"), value: formatCount(apiProfile.albumCount) },
        { label: t("pages.profilePage.stats.pages"), value: formatCount(apiProfile.likedPagesCount) },
        { label: t("pages.profilePage.stats.groups"), value: formatCount(apiProfile.joinedGroupsCount) },
      ],
      intro: buildIntroItems(apiProfile),
      aboutSections: buildAboutSections(apiProfile),
    }
  })

  const timelinePosts = computed(() => timelinePostList.value)
  const pending = computed(() =>
    status.value === "pending" || status.value === "idle" || initialSkeletonVisible.value,
  )
  const displayedTimelinePosts = computed(() => {
    const query = postSearchQuery.value.trim().toLowerCase()

    if (!query) {
      return timelinePostList.value
    }

    return timelinePostList.value.filter(post =>
      [
        post.text,
        post.author,
        post.role,
        ...post.tags,
      ].join(" ").toLowerCase().includes(query),
    )
  })
  const timelineHasMore = computed(() => timelineHasMoreState.value)
  const timelineNextOffset = computed(() => timelineNextOffsetState.value)

  const friends = computed(() => data.value?.followers ?? [])

  const photos = computed(() => data.value?.photos ?? [])
  const videos = computed(() => data.value?.videos ?? [])
  const albums = computed(() => data.value?.albums ?? [])
  const likedPages = computed(() => data.value?.likedPages ?? [])
  const joinedGroups = computed(() => data.value?.joinedGroups ?? [])
  const followers = computed(() => data.value?.followers ?? [])
  const following = computed(() => data.value?.following ?? [])
  const products = computed(() => data.value?.products ?? [])
  const visibleProducts = computed(() => productsExpanded.value ? products.value : products.value.slice(0, 4))
  const hasHiddenProducts = computed(() => products.value.length > visibleProducts.value.length)

  watch(resolvedUsername, () => {
    activeTab.value = "timeline"
    productsExpanded.value = false
  })

  watch(
    data,
    (profileData) => {
      timelinePostList.value = profileData?.timelinePosts ?? []
      timelineHasMoreState.value = profileData?.timelineHasMore ?? false
      timelineNextOffsetState.value = profileData?.timelineNextOffset ?? null
    },
    { immediate: true },
  )

  if (import.meta.client) {
    const loadingIndicator = useLoadingIndicator()

    watch(
      pending,
      (isPending) => {
        if (isPending) {
          loadingIndicator.start()
          return
        }

        loadingIndicator.finish()
      },
      { immediate: true },
    )
  }

  const loadMoreTimelinePosts = async () => {
    if (timelineLoadingMore.value || !resolvedUsername.value || !timelineNextOffsetState.value) {
      return
    }

    timelineLoadingMore.value = true

    try {
      const response = await repository.getProfilePosts({
        username: resolvedUsername.value,
        afterPostId: timelineNextOffsetState.value,
      })

      timelinePostList.value = [...timelinePostList.value, ...response.posts]
      timelineHasMoreState.value = response.hasMore
      timelineNextOffsetState.value = response.nextOffset
    }
    finally {
      timelineLoadingMore.value = false
    }
  }

  const runHeroAction = async (actionId: string) => {
    const currentProfile = data.value

    if (!currentProfile) {
      return
    }

    if (actionId === "edit-profile" || actionId === "settings") {
      await router.push("/setting")
      return
    }

    if (actionId === "message-profile") {
      await router.push({
        path: "/messages",
        query: {
          userId: String(currentProfile.id),
          name: currentProfile.displayName || currentProfile.username,
        },
      })
      return
    }

    if (actionId !== "follow-profile" || actionPending.value) {
      return
    }

    actionPending.value = true

    try {
      const wasFollowing = currentProfile.isFollowing
      const wasActive = wasFollowing || currentProfile.isFollowRequested
      const result = await repository.runProfileAction({
        action: "follow",
        userId: currentProfile.id,
      })
      const normalizedStatus = result.status.toLowerCase()
      const statusSaysRequested = normalizedStatus.includes("request")
      const statusSaysUnfollowed = /unfollow|remove|delete|not_follow|none|0/.test(normalizedStatus)
      const statusSaysFollowing = !statusSaysUnfollowed && /follow|following|1/.test(normalizedStatus)
      const nextIsRequested = statusSaysRequested || (!wasActive && normalizedStatus === "requested")
      const nextIsFollowing = statusSaysFollowing || (!wasActive && !nextIsRequested && !statusSaysUnfollowed)
      const followerDelta = wasFollowing && !nextIsFollowing
        ? -1
        : !wasFollowing && nextIsFollowing
          ? 1
          : 0

      data.value = {
        ...currentProfile,
        isFollowing: nextIsFollowing,
        isFollowRequested: nextIsRequested,
        followersCount: Math.max(0, currentProfile.followersCount + followerDelta),
      }

      const title = nextIsRequested
        ? "Đã gửi yêu cầu theo dõi"
        : nextIsFollowing
          ? "Đã theo dõi"
          : "Đã hủy theo dõi"

      toast.add({
        title,
        color: "success",
        icon: nextIsFollowing || nextIsRequested ? "i-ph-user-check-fill" : "i-ph-user-minus-duotone",
      })
    }
    catch (error) {
      toast.add({
        title: "Không thể cập nhật theo dõi",
        description: t("feed.publisherBox.statusErrorDescription"),
        color: "error",
        icon: "i-ph-warning-circle-fill",
      })
    }
    finally {
      actionPending.value = false
    }
  }

  return {
    activeTab,
    actionPending,
    albums,
    copy,
    displayedTimelinePosts,
    error,
    followers,
    following,
    friends,
    heroActions,
    hasHiddenProducts,
    joinedGroups,
    likedPages,
    loadMoreTimelinePosts,
    pending,
    postSearchQuery,
    photos,
    profile,
    products,
    productsExpanded,
    refresh,
    status,
    tabs,
    timelineHasMore,
    timelineLoadingMore,
    timelineNextOffset,
    timelinePosts,
    runHeroAction,
    visibleProducts,
    videos,
  }
}
