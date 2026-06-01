// English description: Loads the home feed, merges pending story state, and exposes page-ready actions for the main feed route.

import type { FeedAnnouncement, FeedGreeting, FeedPostRecord, FeedStoryRecord } from "../../domain/types/feed.types"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"

type FeedOrderKey = "all" | "following"

export function useHomeFeedPageVM(
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const copy = computed(() => ({
    announcementEyebrow: t("pages.homeFeedPage.announcementEyebrow"),
    orderEyebrow: t("pages.homeFeedPage.orderEyebrow"),
    orderTitle: t("pages.homeFeedPage.orderTitle"),
    greetingEyebrow: t("pages.homeFeedPage.greetingEyebrow"),
    orders: {
      all: {
        label: t("pages.homeFeedPage.orders.allLabel"),
        description: t("pages.homeFeedPage.orders.allDescription"),
      },
      following: {
        label: t("pages.homeFeedPage.orders.followingLabel"),
        description: t("pages.homeFeedPage.orders.followingDescription"),
      },
    },
  }))

  const orderOptions = computed(() => [
    { key: "all" as const, ...copy.value.orders.all },
    { key: "following" as const, ...copy.value.orders.following },
  ])

  const activeOrder = ref<FeedOrderKey>("all")
  const newPostsCount = ref(0)
  const loadingMore = ref(false)
  const posts = ref<FeedPostRecord[]>([])
  const stories = ref<FeedStoryRecord[]>([])
  const announcement = ref<FeedAnnouncement | null>(null)
  const greeting = ref<FeedGreeting | null>(null)
  const hasMore = ref(false)
  const nextOffset = ref<number | null>(null)
  const initialized = ref(false)
  const pendingCreatedStory = useState<FeedStoryRecord | null>("feed-pending-created-story", () => null)

  const visiblePosts = computed(() => posts.value)
  const allLoaded = computed(() => !hasMore.value)

  const canDisplayPostInCurrentFeed = (post: FeedPostRecord) => {
    if (activeOrder.value !== "all" && activeOrder.value !== "following") {
      return false
    }

    return Boolean(post)
  }

  const mergePendingStory = (records: FeedStoryRecord[]) => {
    const pendingStory = pendingCreatedStory.value

    if (!pendingStory) {
      return records
    }

    if (records.some(story => story.id === pendingStory.id)) {
      pendingCreatedStory.value = null
      return records
    }

    return [pendingStory, ...records]
  }

  async function fetchHome(reset = true) {
    const response = await repository.getHome({
      limit: 6,
      afterPostId: reset ? undefined : nextOffset.value ?? undefined,
      followingOnly: activeOrder.value === "following",
    })

    stories.value = mergePendingStory(response.stories)
    announcement.value = response.announcement
    greeting.value = response.greeting
    hasMore.value = response.hasMore
    nextOffset.value = response.nextOffset
    posts.value = reset
      ? response.posts
      : [...posts.value, ...response.posts.filter(post => !posts.value.some(existing => existing.id === post.id))]
  }

  function loadNewPosts() {
    newPostsCount.value = 0
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) {
      return
    }

    loadingMore.value = true

    try {
      await fetchHome(false)
    }
    finally {
      loadingMore.value = false
    }
  }

  async function refreshFeed() {
    newPostsCount.value = 0
    await fetchHome(true)
  }

  async function handlePostCreated(post: FeedPostRecord | null) {
    if (!post) {
      await refreshFeed()
      return
    }

    newPostsCount.value = 0

    if (!canDisplayPostInCurrentFeed(post)) {
      return
    }

    posts.value = [
      post,
      ...posts.value.filter(existing => existing.id !== post.id),
    ]
  }

  watch(activeOrder, async () => {
    if (!initialized.value) {
      return
    }

    await fetchHome(true)
  })

  function removePost(postId: number) {
    posts.value = posts.value.filter(post => post.id !== postId)
  }

  async function initialize() {
    await fetchHome(true)
    initialized.value = true
  }

  return {
    copy,
    orderOptions,
    activeOrder,
    newPostsCount,
    loadingMore,
    stories,
    announcement,
    greeting,
    visiblePosts,
    allLoaded,
    loadNewPosts,
    loadMore,
    handlePostCreated,
    removePost,
    initialize,
  }
}
