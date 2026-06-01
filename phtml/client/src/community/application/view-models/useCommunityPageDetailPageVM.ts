// English description: Coordinates page detail state, follow action, and sharing logic for the community page detail route.

import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"
import { useCommunityPageDetail } from "../composables/useCommunityPageDetail"

type PageActionState = "idle" | "loading" | "success" | "error"
type PageDetailTabKey = "posts" | "reels" | "photos" | "followers" | "about"

export function useCommunityPageDetailPageVM(
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const toast = useToast()
  const translateText = useMaybeTranslatedText()

  const activeTab = ref<PageDetailTabKey>("posts")
  const followPending = ref(false)
  const likePending = ref(false)
  const sharePending = ref(false)
  const followerActionPending = ref<number | null>(null)
  const followerSearchQuery = ref("")
  const actionState = ref<PageActionState>("idle")
  const actionMessage = ref("")

  // pageSlug is the raw route param used to look up the page
  const pageSlug = computed(() => String(route.params.name || ""))

  const {
    page,
    status,
    error,
    refresh,
    followPage,
    likePage,
    pagePosts,
    pageFollowers,
    pageFollowersStatus,
    refreshPageFollowers,
    categoryLabel,
    followerCountLabel,
    likeCountLabel,
    slug,
    refreshPagePosts,
  } = useCommunityPageDetail(pageSlug, repository)

  const pageName = computed(() => translateText(page.value?.name || ""))
  const pageSummary = computed(() => translateText(page.value?.summary || ""))
  const isFollowing = computed(() => page.value?.following === true)
  const isLiked = computed(() => page.value?.liked === true)
  const avatarLabel = computed(() => pageName.value.slice(0, 2).toUpperCase())
  const pageVideoPosts = computed(() =>
    pagePosts.value.filter(post => post.mediaItems.some(item => item.type === "video")),
  )
  const pagePhotoPosts = computed(() =>
    pagePosts.value.filter(post => post.mediaItems.some(item => item.type === "image")),
  )
  const visiblePageFollowers = computed(() => {
    const query = followerSearchQuery.value.trim().toLowerCase()

    if (!query) {
      return pageFollowers.value
    }

    return pageFollowers.value.filter((user) =>
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query),
    )
  })

  const responseLabel = computed(() => translateText(page.value?.responseLabel || ""))
  const foundedLabel = computed(() => translateText(page.value?.foundedLabel || ""))
  const locationLabel = computed(() => translateText(page.value?.locationLabel || ""))

  const tabs = computed(() => [
    { key: "posts", label: t("pages.pageDetailPage.tabs.posts") },
    { key: "reels", label: t("pages.pageDetailPage.tabs.reels") },
    { key: "photos", label: t("pages.pageDetailPage.tabs.photos") },
    { key: "followers", label: t("pages.pageDetailPage.tabs.followers") },
    { key: "about", label: t("pages.pageDetailPage.tabs.about") },
  ])

  async function handleFollowPage() {
    if (followPending.value || !page.value) return

    followPending.value = true
    actionState.value = "idle"
    actionMessage.value = ""

    try {
      const updatedPage = await followPage()
      actionState.value = "success"
      actionMessage.value = t("pages.pageDetailPage.followSuccessDescription", {
        page: translateText(updatedPage?.name || page.value?.name || ""),
      })
    }
    catch (err) {
      actionState.value = "error"
      actionMessage.value = err instanceof Error
        ? err.message
        : t("pages.pageDetailPage.followErrorDescription")
    }
    finally {
      followPending.value = false
    }
  }

  async function handleLikePage() {
    if (likePending.value || !page.value) return

    likePending.value = true
    actionState.value = "idle"
    actionMessage.value = ""

    try {
      const updatedPage = await likePage()
      actionState.value = "success"
      actionMessage.value = t("pages.pageDetailPage.likeSuccessDescription", {
        page: translateText(updatedPage?.name || page.value?.name || ""),
      })
    }
    catch (err) {
      actionState.value = "error"
      actionMessage.value = err instanceof Error
        ? err.message
        : t("pages.pageDetailPage.likeErrorDescription")
    }
    finally {
      likePending.value = false
    }
  }

  async function handleSharePage() {
    if (!import.meta.client || sharePending.value) return

    sharePending.value = true
    actionState.value = "idle"
    actionMessage.value = ""

    try {
      const url = window.location.href
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard_unavailable")
      }

      await navigator.clipboard.writeText(url)
      actionState.value = "success"
      actionMessage.value = t("pages.pageDetailPage.shareSuccessDescription", { url })

      toast.add({
        color: "success",
        icon: "i-ph-check-circle-fill",
        title: t("pages.pageDetailPage.sharedButton"),
        description: url,
      })
    }
    catch {
      actionState.value = "error"
      actionMessage.value = t("pages.pageDetailPage.shareErrorDescription")
    }
    finally {
      sharePending.value = false
    }
  }

  async function handleFollowerAction(userId: number, isFriend: boolean, username: string) {
    if (followerActionPending.value || userId <= 0) {
      return
    }

    if (isFriend) {
      await navigateTo(`/messages?user=${encodeURIComponent(username)}`)
      return
    }

    followerActionPending.value = userId

    try {
      await $fetch("/_api/profile/action", {
        method: "POST",
        body: { action: "follow", userId },
      })
      await refreshPageFollowers()
    }
    catch (error) {
      toast.add({
        color: "error",
        icon: "i-ph-warning-circle-fill",
        title: t("pages.pageDetailPage.followers.actionErrorTitle"),
        description: error instanceof Error ? error.message : t("pages.pageDetailPage.followers.actionErrorDescription"),
      })
    }
    finally {
      followerActionPending.value = null
    }
  }

  return {
    activeTab,
    followPending,
    likePending,
    sharePending,
    followerActionPending,
    followerSearchQuery,
    actionState,
    actionMessage,
    page,
    status,
    error,
    pageName,
    pageSummary,
    isFollowing,
    isLiked,
    avatarLabel,
    pageVideoPosts,
    pagePhotoPosts,
    pageFollowers,
    pageFollowersStatus,
    visiblePageFollowers,
    responseLabel,
    foundedLabel,
    locationLabel,
    categoryLabel,
    followerCountLabel,
    likeCountLabel,
    pagePosts,
    tabs,
    handleFollowPage,
    handleLikePage,
    handleSharePage,
    handleFollowerAction,
    refreshPagePosts,
    // slug: backend-normalized slug (may differ from route param), used for canonical URLs
    slug,
    // pageSlug: raw route param value
    pageSlug,
  }
}
