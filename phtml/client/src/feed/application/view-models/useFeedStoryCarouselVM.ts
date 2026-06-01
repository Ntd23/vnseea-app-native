// English description: Owns story grouping, viewer navigation, reply flow, reactions, and backend story actions for the feed story carousel.

import { useEventListener, useTimeoutFn } from "@vueuse/core"
import {
  feedStoryCarouselScrollDistance,
  feedStoryKeyboardKeys,
  feedStoryPointerTapTolerance,
  feedStoryReactionLongPressDelay,
  feedStorySwipeMinDistance,
  feedStoryVideoExtensions,
  feedStoryVideoPathHint,
  feedStoryViewerFallbackGradient,
  feedStoryViewerSideTapDivisor,
} from "../constants/story-carousel"
import {
  defaultFeedReactionAsset,
  feedReactionAssets,
} from "../constants/reaction-assets"
import { defaultFeedStoryReaction } from "../../domain/constants/story-reactions"
import type { FeedStoryReactionType, FeedStoryRecord } from "../../domain/types/feed.types"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"

type StoryGroup = {
  key: string
  owner: FeedStoryRecord
  stories: FeedStoryRecord[]
  hasUnseen: boolean
}

export function useFeedStoryCarouselVM(
  stories: Ref<FeedStoryRecord[]>,
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const scrollRef = ref<HTMLElement | null>(null)
  const dialogRef = ref<HTMLElement | null>(null)
  const replyInputRef = ref<{ $el?: HTMLElement } | null>(null)
  const canScrollLeft = ref(false)
  const canScrollRight = ref(false)
  const activeStoryGroupIndex = ref<number | null>(null)
  const activeStoryItemIndex = ref(0)
  const storyPointerStart = ref<{ x: number, y: number } | null>(null)
  const storyTouchStartX = ref<number | null>(null)
  const storyTouchStartY = ref<number | null>(null)
  const replyText = ref("")
  const reactionTrayOpen = ref(false)
  const reactionLongPressTriggered = ref(false)
  const storyActionState = ref<"idle" | "loading" | "success" | "error">("idle")
  const storyActionError = ref("")
  const selectedReactionByStoryId = ref(new Map<number, FeedStoryReactionType>())
  const viewedStoryIds = ref(new Set<number>())
  const sentStoryViewIds = ref(new Set<number>())
  const failedMediaStoryIds = ref(new Set<number>())

  const storyReactionOptions = computed<Array<{
    value: FeedStoryReactionType
    label: string
    src: string
  }>>(() =>
    feedReactionAssets.map(reaction => ({
      value: reaction.value,
      label: t(reaction.labelKey),
      src: reaction.src,
    })),
  )

  const resolveStoryOwnerKey = (story: FeedStoryRecord, index: number) =>
    story.ownerKey
      || (story.ownerId ? `user:${story.ownerId}` : "")
      || (story.ownerUsername ? `username:${story.ownerUsername}` : "")
      || (story.author ? `author:${story.author.toLowerCase()}` : "")
      || `story:${index}`

  const storyGroups = computed<StoryGroup[]>(() => {
    const groups = new Map<string, StoryGroup>()

    stories.value.forEach((story, index) => {
      const key = resolveStoryOwnerKey(story, index)
      const existingGroup = groups.get(key)

      if (!existingGroup) {
        groups.set(key, {
          key,
          owner: story,
          stories: [story],
          hasUnseen: story.hasUnseen && !viewedStoryIds.value.has(story.id),
        })
        return
      }

      existingGroup.stories.push(story)
      existingGroup.hasUnseen = existingGroup.hasUnseen || (story.hasUnseen && !viewedStoryIds.value.has(story.id))

      if (story.id > existingGroup.owner.id) {
        existingGroup.owner = story
      }
    })

    return Array.from(groups.values()).map(group => ({
      ...group,
      stories: [...group.stories].sort((left, right) => right.id - left.id),
      hasUnseen: group.stories.some(story => story.hasUnseen && !viewedStoryIds.value.has(story.id)),
    }))
  })

  const activeStoryGroup = computed(() =>
    activeStoryGroupIndex.value !== null
      ? storyGroups.value[activeStoryGroupIndex.value] ?? null
      : null,
  )
  const storyQueue = computed(() => activeStoryGroup.value?.stories ?? [])
  const activeStoryData = computed(() =>
    activeStoryGroupIndex.value !== null
      ? storyQueue.value[activeStoryItemIndex.value] ?? null
      : null,
  )
  const activeStoryIsVideo = computed(() => isVideoStory(activeStoryData.value))
  const activeStoryReaction = computed(() =>
    activeStoryData.value
      ? selectedReactionByStoryId.value.get(activeStoryData.value.id) ?? null
      : null,
  )
  const activeReactionOption = computed(() =>
    storyReactionOptions.value.find(reaction => reaction.value === activeStoryReaction.value) ?? null,
  )
  const activeStoryIsMine = computed(() => Boolean(activeStoryData.value?.isMe))
  const canInteractWithActiveStory = computed(() => Boolean(activeStoryData.value && !activeStoryIsMine.value))
  const activeStoryViewsLabel = computed(() =>
    t("feed.storyCarousel.viewsLabel", { count: activeStoryData.value?.views ?? 0 }),
  )

  const fallbackGradient = feedStoryViewerFallbackGradient
  const storyVideoExtensionPattern = new RegExp(`\\.(${feedStoryVideoExtensions.join("|")})$`, "i")
  const {
    start: startReactionLongPressTimer,
    stop: stopReactionLongPressTimer,
  } = useTimeoutFn(() => {
    if (!canInteractWithActiveStory.value || storyActionState.value === "loading") {
      return
    }

    reactionLongPressTriggered.value = true
    reactionTrayOpen.value = true
  }, feedStoryReactionLongPressDelay, { immediate: false })

  function isVideoStoryMedia(media: string) {
    const normalized = media.toLowerCase().split(/[?#]/)[0] || ""
    return storyVideoExtensionPattern.test(normalized) || normalized.includes(feedStoryVideoPathHint)
  }

  function isVideoStory(story?: FeedStoryRecord | null) {
    if (!story) {
      return false
    }

    return story.mediaType === "video" || isVideoStoryMedia(story.media)
  }

  function resolveStoryCardMedia(story: FeedStoryRecord) {
    return isVideoStory(story)
      ? story.poster || ""
      : story.media || story.poster || ""
  }

  function markStoryMediaFailed(storyId?: number) {
    if (!storyId) {
      return
    }

    failedMediaStoryIds.value = new Set([...failedMediaStoryIds.value, storyId])
  }

  function updateScroll() {
    const el = scrollRef.value

    if (!el) {
      return
    }

    canScrollLeft.value = el.scrollLeft > 10
    canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 10
  }

  function scroll(dir: 1 | -1) {
    scrollRef.value?.scrollBy({ left: dir * feedStoryCarouselScrollDistance, behavior: "smooth" })
  }

  function openStoryGroup(groupIndex: number, itemIndex = 0) {
    if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex >= storyGroups.value.length) {
      return
    }

    const activeGroup = storyGroups.value[groupIndex]
    const groupStories = activeGroup?.stories ?? []

    if (!groupStories.length) {
      return
    }

    markStoryGroupViewed(groupStories)
    activeStoryGroupIndex.value = groupIndex
    activeStoryItemIndex.value = Math.min(Math.max(itemIndex, 0), groupStories.length - 1)
  }

  function rememberStoryPointer(event: PointerEvent) {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-story-group-index]")

    if (!trigger) {
      storyPointerStart.value = null
      return
    }

    storyPointerStart.value = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  function openStoryFromPointer(event: PointerEvent) {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-story-group-index]")
    const pointerStart = storyPointerStart.value
    storyPointerStart.value = null

    if (!trigger || !pointerStart) {
      return
    }

    const movedX = Math.abs(event.clientX - pointerStart.x)
    const movedY = Math.abs(event.clientY - pointerStart.y)

    if (movedX > feedStoryPointerTapTolerance || movedY > feedStoryPointerTapTolerance) {
      return
    }

    const groupIndex = Number(trigger.dataset.storyGroupIndex)
    openStoryGroup(groupIndex)
  }

  function closeStory() {
    activeStoryGroupIndex.value = null
    activeStoryItemIndex.value = 0
    replyText.value = ""
    reactionTrayOpen.value = false
    storyActionError.value = ""
    storyActionState.value = "idle"
  }

  async function markStoryViewed(story: FeedStoryRecord) {
    viewedStoryIds.value = new Set([...viewedStoryIds.value, story.id])

    if (sentStoryViewIds.value.has(story.id)) {
      return
    }

    sentStoryViewIds.value = new Set([...sentStoryViewIds.value, story.id])

    try {
      await repository.runStoryAction({
        action: "view",
        storyId: story.id,
      })
    }
    catch (error) {
      console.error(error)
    }
  }

  function markStoryGroupViewed(groupStories: FeedStoryRecord[]) {
    viewedStoryIds.value = new Set([
      ...viewedStoryIds.value,
      ...groupStories.map(story => story.id),
    ])
  }

  function focusReply() {
    if (!canInteractWithActiveStory.value) {
      return
    }

    const input = replyInputRef.value?.$el?.querySelector?.("input") as HTMLInputElement | null
    input?.focus()
  }

  function startReactionPress() {
    if (!canInteractWithActiveStory.value || storyActionState.value === "loading") {
      return
    }

    reactionLongPressTriggered.value = false
    startReactionLongPressTimer()
  }

  async function finishReactionPress() {
    stopReactionLongPressTimer()

    if (reactionLongPressTriggered.value) {
      return
    }

    await reactToStory(defaultFeedStoryReaction.value)
  }

  function cancelReactionPress() {
    stopReactionLongPressTimer()
  }

  async function reactToStory(reaction: FeedStoryReactionType) {
    const story = activeStoryData.value

    if (!story || !canInteractWithActiveStory.value || storyActionState.value === "loading") {
      return
    }

    storyActionState.value = "loading"
    storyActionError.value = ""

    try {
      await repository.runStoryAction({
        action: "react",
        storyId: story.id,
        reaction,
      })

      const nextReactions = new Map(selectedReactionByStoryId.value)
      nextReactions.set(story.id, reaction)
      selectedReactionByStoryId.value = nextReactions
      reactionTrayOpen.value = false
      storyActionState.value = "success"
    }
    catch (error) {
      console.error(error)
      storyActionState.value = "error"
      storyActionError.value = t("feed.storyCarousel.reactionFailed")
    }
  }

  async function sendReply() {
    const story = activeStoryData.value
    const text = replyText.value.trim()

    if (!story || !text || storyActionState.value === "loading") {
      return
    }

    if (story.isMe) {
      storyActionError.value = t("feed.storyCarousel.replyDisabledSelf")
      return
    }

    storyActionState.value = "loading"
    storyActionError.value = ""

    try {
      await repository.runStoryAction({
        action: "reply",
        storyId: story.id,
        ownerId: story.ownerId,
        text,
      })

      replyText.value = ""
      storyActionState.value = "success"
      toast.add({
        color: "success",
        icon: "i-ph-paper-plane-tilt-fill",
        title: t("feed.storyCarousel.replySent"),
      })
    }
    catch (error) {
      console.error(error)
      storyActionState.value = "error"
      storyActionError.value = t("feed.storyCarousel.replyFailed")
    }
  }

  function nextStory() {
    if (activeStoryGroupIndex.value === null || !storyGroups.value.length) {
      return
    }

    if (activeStoryItemIndex.value < storyQueue.value.length - 1) {
      activeStoryItemIndex.value += 1
      return
    }

    openStoryGroup((activeStoryGroupIndex.value + 1) % storyGroups.value.length)
  }

  function prevStory() {
    if (activeStoryGroupIndex.value === null || !storyGroups.value.length) {
      return
    }

    if (activeStoryItemIndex.value > 0) {
      activeStoryItemIndex.value -= 1
      return
    }

    const previousGroupIndex = (activeStoryGroupIndex.value - 1 + storyGroups.value.length) % storyGroups.value.length
    const previousGroup = storyGroups.value[previousGroupIndex]
    openStoryGroup(previousGroupIndex, Math.max((previousGroup?.stories.length ?? 1) - 1, 0))
  }

  function onStoryTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0]
    storyTouchStartX.value = touch?.clientX ?? null
    storyTouchStartY.value = touch?.clientY ?? null
  }

  function onStoryTouchEnd(event: TouchEvent) {
    const startX = storyTouchStartX.value
    const startY = storyTouchStartY.value
    const touch = event.changedTouches[0]
    const endX = touch?.clientX ?? null
    const endY = touch?.clientY ?? null
    storyTouchStartX.value = null
    storyTouchStartY.value = null

    if (startX == null || startY == null || endX == null || endY == null) {
      return
    }

    const deltaX = startX - endX
    const deltaY = startY - endY

    if (Math.abs(deltaX) > feedStorySwipeMinDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        nextStory()
      }
      else {
        prevStory()
      }

      return
    }

    const target = event.currentTarget as HTMLElement | null

    if (!target) {
      return
    }

    const rect = target.getBoundingClientRect()
    const x = endX - rect.left
    const third = rect.width / feedStoryViewerSideTapDivisor

    if (x < third) {
      prevStory()
    }
    else if (x > third * 2) {
      nextStory()
    }
  }

  useEventListener(scrollRef, "scroll", updateScroll, { passive: true })

  if (import.meta.client) {
    useEventListener(window, "keydown", (event) => {
      if (activeStoryGroupIndex.value === null) {
        return
      }

      if (event.key === feedStoryKeyboardKeys.close) {
        closeStory()
      }
      if (event.key === feedStoryKeyboardKeys.previous) {
        prevStory()
      }
      if (event.key === feedStoryKeyboardKeys.next) {
        nextStory()
      }
    })
  }

  watch(
    storyGroups,
    async () => {
      const activeGroupIndex = activeStoryGroupIndex.value

      if (
        activeGroupIndex !== null
        && (activeGroupIndex < 0 || activeGroupIndex >= storyGroups.value.length)
      ) {
        activeStoryGroupIndex.value = storyGroups.value.length ? 0 : null
        activeStoryItemIndex.value = 0
      }

      const activeGroup = activeStoryGroup.value

      if (activeGroup && activeStoryItemIndex.value >= activeGroup.stories.length) {
        activeStoryItemIndex.value = Math.max(activeGroup.stories.length - 1, 0)
      }

      await nextTick()
      updateScroll()
    },
    { deep: true, immediate: true },
  )

  watch(activeStoryData, async (story) => {
    if (!story) {
      return
    }

    replyText.value = ""
    reactionTrayOpen.value = false
    storyActionError.value = ""
    storyActionState.value = "idle"
    await markStoryViewed(story)
    await nextTick()
    dialogRef.value?.focus()
  })

  return {
    scrollRef,
    dialogRef,
    replyInputRef,
    canScrollLeft,
    canScrollRight,
    activeStoryItemIndex,
    replyText,
    reactionTrayOpen,
    storyActionState,
    storyActionError,
    storyReactionOptions,
    storyGroups,
    storyQueue,
    activeStoryData,
    activeStoryIsVideo,
    activeStoryReaction,
    activeReactionOption,
    activeStoryIsMine,
    canInteractWithActiveStory,
    activeStoryViewsLabel,
    failedMediaStoryIds,
    fallbackGradient,
    defaultFeedReactionAsset,
    resolveStoryCardMedia,
    markStoryMediaFailed,
    scroll,
    openStoryGroup,
    rememberStoryPointer,
    openStoryFromPointer,
    closeStory,
    focusReply,
    startReactionPress,
    finishReactionPress,
    cancelReactionPress,
    reactToStory,
    sendReply,
    nextStory,
    prevStory,
    onStoryTouchStart,
    onStoryTouchEnd,
  }
}
