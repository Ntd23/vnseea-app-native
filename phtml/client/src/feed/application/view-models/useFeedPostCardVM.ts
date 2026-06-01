// English description: Owns post-card reactions, lightbox state, share actions, and comment submission for a single feed post.

import { useTimeoutFn } from "@vueuse/core"
import {
  defaultFeedReactionAsset,
  feedReactionAssetByValue,
  feedReactionAssets,
} from "../constants/reaction-assets"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"
import { defaultFeedStoryReaction } from "../../domain/constants/story-reactions"
import type {
  FeedCommentRecord,
  FeedCommentSubmitPayload,
  FeedPollOptionRecord,
  FeedPostRecord,
  FeedPostReactionSummary,
  FeedPostReactionUser,
  FeedStoryReactionType,
} from "../../domain/types/feed.types"
import type { FeedCommentActionRepository } from "./useFeedCommentItemVM"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"

export function useFeedPostCardVM(
  post: Ref<FeedPostRecord | null>,
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const requestURL = useRequestURL()
  const toast = useToast()
  const currentAuthUserStore = useCurrentAuthUserStore()

  const showComments = ref(false)
  const showShare = ref(false)
  const liked = ref(false)
  const selectedPostReaction = ref<FeedStoryReactionType | null>(null)
  const postReactionTrayOpen = ref(false)
  const postReactionLongPressTriggered = ref(false)
  const lightboxOpen = ref(false)
  const currentMediaIndex = ref(0)
  const localComments = ref<FeedCommentRecord[]>([])
  const localPollOptions = ref<FeedPollOptionRecord[]>([])
  const localReactionSummaries = ref<FeedPostReactionSummary[]>([])
  const localReactionUsers = ref<FeedPostReactionUser[]>([])
  const likesCount = ref(0)
  const sharesCount = ref(0)
  const actionState = ref<"idle" | "success" | "error">("idle")
  const actionMessage = ref("")
  const liking = ref(false)
  const commenting = ref(false)
  const pollVoting = ref(false)
  const reporting = ref(false)
  const loadingComments = ref(false)
  const reactionModalOpen = ref(false)
  const reactionUsersLoading = ref(false)
  const activeReactionFilter = ref<FeedStoryReactionType | "all">("all")

  const postAnchorId = computed(() => post.value ? `feed-post-${post.value.id}` : "")
  const postReactionOptions = computed(() =>
    feedReactionAssets.map(reaction => ({
      value: reaction.value,
      label: t(reaction.labelKey),
      src: reaction.src,
    })),
  )
  const activePostReactionAsset = computed(() =>
    selectedPostReaction.value
      ? feedReactionAssetByValue[selectedPostReaction.value]
      : defaultFeedReactionAsset,
  )
  const activePostReactionLabel = computed(() => t(activePostReactionAsset.value.labelKey))
  const sortedReactionSummaries = computed(() =>
    [...localReactionSummaries.value]
      .filter(item => item.count > 0)
      .sort((left, right) =>
        feedReactionAssets.findIndex(asset => asset.value === left.reaction)
        - feedReactionAssets.findIndex(asset => asset.value === right.reaction),
      ),
  )
  const previewReactions = computed(() =>
    sortedReactionSummaries.value
      .slice(0, 3)
      .map(item => feedReactionAssetByValue[item.reaction])
      .filter(Boolean),
  )
  const reactionTabs = computed(() => [
    {
      value: "all" as const,
      label: t("feed.postCard.reactionAll"),
      count: likesCount.value,
      asset: null,
    },
    ...sortedReactionSummaries.value.map(summary => ({
      value: summary.reaction,
      label: t(feedReactionAssetByValue[summary.reaction].labelKey),
      count: summary.count,
      asset: feedReactionAssetByValue[summary.reaction],
    })),
  ])
  const reactionModalUsers = computed(() => {
    const usersById = new Map<number, FeedPostReactionUser>()

    for (const user of localReactionUsers.value) {
      usersById.set(user.id, user)
    }

    const currentUser = currentAuthUserStore.user
    if (currentUser?.id && selectedPostReaction.value) {
      usersById.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name || t("feed.postCard.commentAuthor"),
        avatarUrl: currentUser.avatarUrl || "",
        profilePath: currentUser.username ? `/@${currentUser.username}` : undefined,
        reaction: selectedPostReaction.value,
        isFollowing: true,
      })
    }

    const reactionOrder = new Map(feedReactionAssets.map((asset, index) => [asset.value, index]))
    const users = [...usersById.values()].sort((left, right) => {
      const reactionDiff = (reactionOrder.get(left.reaction) ?? 99) - (reactionOrder.get(right.reaction) ?? 99)

      if (reactionDiff !== 0) {
        return reactionDiff
      }

      return left.name.localeCompare(right.name)
    })
    if (activeReactionFilter.value === "all") {
      return users
    }

    return users.filter(user => user.reaction === activeReactionFilter.value)
  })
  const pollVotesTotal = computed(() =>
    localPollOptions.value.reduce((total, option) => total + option.votes, 0),
  )
  const hasReactions = computed(() => likesCount.value > 0)
  const commentsCount = computed(() => Math.max(localComments.value.length, post.value?.stats.comments ?? 0))
  const hasPostContent = computed(() =>
    Boolean(post.value?.text.trim() || post.value?.tags.length),
  )
  const mediaItems = computed(() => post.value.mediaItems)
  const isOwner = computed(() => {
    const currentUsername = currentAuthUserStore.user?.username
    if (!currentUsername || !post.value.authorPath) {
      return false
    }
    // Remove /@ prefix if exists
    const postUsername = post.value.authorPath.replace("/@", "")
    return currentUsername === postUsername
  })
  const isAdmin = computed(() => currentAuthUserStore.user?.isAdmin || currentAuthUserStore.user?.isModerator || false)

  const shareUrl = computed(() =>
    post.value ? new URL(`${route.path || "/"}#${postAnchorId.value}`, requestURL.origin).toString() : ""
  )

  const commentActionRepository: FeedCommentActionRepository = {
    getCommentReplies(input) {
      return repository.getCommentReplies(input)
    },
    runCommentAction(input) {
      return repository.runCommentAction(input)
    },
  }

  let lastPostId: number | null = null

  watch(
    post,
    (value) => {
      if (!value) {
        lastPostId = null
        localComments.value = []
        localPollOptions.value = []
        localReactionSummaries.value = []
        localReactionUsers.value = []
        likesCount.value = 0
        sharesCount.value = 0
        liked.value = false
        selectedPostReaction.value = null
        postReactionTrayOpen.value = false
        actionState.value = "idle"
        actionMessage.value = ""
        // Do not reset showComments.value to false here to prevent momentary reactivity/null glitches in parent-rendered lists from closing it.
        // If a different post is loaded later, isDifferentPost check below will handle resetting showComments correctly.
        showShare.value = false
        reactionModalOpen.value = false
        reactionUsersLoading.value = false
        activeReactionFilter.value = "all"
        lightboxOpen.value = false
        currentMediaIndex.value = 0
        return
      }

      const isDifferentPost = lastPostId !== null && String(lastPostId) !== String(value.id)
      lastPostId = value.id

      localComments.value = [...value.comments]
      localPollOptions.value = [...value.pollOptions]
      localReactionSummaries.value = value.reactions.length > 0
        ? [...value.reactions]
        : value.stats.likes > 0 && value.reaction
          ? [{ reaction: value.reaction, count: value.stats.likes }]
          : []
      localReactionUsers.value = [...value.reactionUsers]
      likesCount.value = value.stats.likes || value.reactions.reduce((total, item) => total + item.count, 0)
      sharesCount.value = value.stats.shares
      liked.value = value.isLiked
      selectedPostReaction.value = value.reaction

      if (isDifferentPost) {
        postReactionTrayOpen.value = false
        actionState.value = "idle"
        actionMessage.value = ""
        showComments.value = false
        showShare.value = false
        reactionModalOpen.value = false
        reactionUsersLoading.value = false
        activeReactionFilter.value = "all"
        lightboxOpen.value = false
        currentMediaIndex.value = 0
      }
    },
    { deep: true, immediate: true },
  )

  onMounted(async () => {
    await currentAuthUserStore.hydrate()
  })

  const {
    start: startPostReactionLongPressTimer,
    stop: stopPostReactionLongPressTimer,
  } = useTimeoutFn(() => {
    postReactionLongPressTriggered.value = true
    postReactionTrayOpen.value = true
  }, 420, { immediate: false })

  function openPostReactionTray() {
    postReactionTrayOpen.value = true
  }

  function closePostReactionTray() {
    postReactionTrayOpen.value = false
  }

  function startPostReactionPress() {
    if (liking.value) {
      return
    }

    postReactionLongPressTriggered.value = false
    startPostReactionLongPressTimer()
  }

  function finishPostReactionPress() {
    stopPostReactionLongPressTimer()
  }

  function cancelPostReactionPress() {
    stopPostReactionLongPressTimer()
  }

  async function handlePostReactionButtonClick() {
    if (postReactionLongPressTriggered.value) {
      return
    }

    if (selectedPostReaction.value) {
      await reactToPost(selectedPostReaction.value)
    } else {
      await reactToPost(defaultFeedStoryReaction.value)
    }
  }

  async function toggleLike() {
    await reactToPost(defaultFeedStoryReaction.value)
  }

  async function reactToPost(reaction: FeedStoryReactionType) {
    const currentPost = post.value

    if (liking.value || !currentPost) {
      return
    }

    liking.value = true
    const hadLocalReaction = Boolean(selectedPostReaction.value)
    const isRemoving = hadLocalReaction && selectedPostReaction.value === reaction

    try {
      await repository.runPostAction({
        action: "reaction",
        postId: currentPost.id,
        reaction,
      })

      if (isRemoving) {
        likesCount.value = Math.max(0, likesCount.value - 1)
        localReactionSummaries.value = updateReactionSummaries(
          localReactionSummaries.value,
          null,
          selectedPostReaction.value,
        )
        selectedPostReaction.value = null
        liked.value = false

        if (post.value) {
          post.value.isLiked = false
          post.value.reaction = null
          post.value.stats.likes = likesCount.value
          post.value.reactions = [...localReactionSummaries.value]
        }
      } else {
        if (!hadLocalReaction) {
          likesCount.value += 1
        }

        localReactionSummaries.value = updateReactionSummaries(
          localReactionSummaries.value,
          reaction,
          selectedPostReaction.value,
        )
        selectedPostReaction.value = reaction
        liked.value = true

        if (post.value) {
          post.value.isLiked = true
          post.value.reaction = reaction
          post.value.stats.likes = likesCount.value
          post.value.reactions = [...localReactionSummaries.value]
        }
      }
      postReactionTrayOpen.value = false
    }
    catch (error) {
      actionState.value = "error"
      actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
    }
    finally {
      liking.value = false
    }
  }

  function onOpenMedia(index: number) {
    currentMediaIndex.value = index
    lightboxOpen.value = true
  }

  async function submitComment(payload: FeedCommentSubmitPayload) {
    const currentPost = post.value

    if (commenting.value || !currentPost) {
      return
    }

    commenting.value = true

    try {
      const response = await repository.runPostAction({
        action: "comment",
        postId: currentPost.id,
        text: payload.backendText ?? payload.text,
        imageFile: payload.imageFile,
        gifFile: payload.gifFile,
        audioFile: payload.audioFile,
      })

      const comment: FeedCommentRecord = {
        id: response.commentId ?? Date.now(),
        author: currentAuthUserStore.user?.name || t("feed.postCard.commentAuthor"),
        authorAvatarUrl: currentAuthUserStore.user?.avatarUrl || "",
        authorPath: currentAuthUserStore.user?.username ? `/@${currentAuthUserStore.user.username}` : undefined,
        role: currentAuthUserStore.user?.username ? `@${currentAuthUserStore.user.username}` : t("feed.postCard.commentRole"),
        text: payload.text,
        time: t("feed.postCard.justNow"),
        attachment: response.attachment ?? payload.attachmentPreview,
      }

      localComments.value = [...localComments.value, comment]
      if (post.value) {
        post.value.comments = [...localComments.value]
        post.value.stats.comments = localComments.value.length
      }
      showComments.value = true
      void refreshComments()
      actionState.value = "success"
      actionMessage.value = t("feed.postCard.commentAddedMessage")

      toast.add({
        color: "success",
        icon: "i-ph-chat-centered-dots-fill",
        title: currentPost.author,
        description: actionMessage.value,
      })
    }
    catch (error) {
      actionState.value = "error"
      actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
    }
    finally {
      commenting.value = false
    }
  }

  async function votePoll(optionId: number) {
    const currentPost = post.value

    if (pollVoting.value || !currentPost) {
      return
    }

    pollVoting.value = true

    try {
      const response = await repository.runPostAction({
        action: "votePoll",
        postId: currentPost.id,
        optionId,
      })

      if (response.pollOptions?.length) {
        localPollOptions.value = response.pollOptions
        if (post.value) {
          post.value.pollOptions = [...response.pollOptions]
        }
      }
      else {
        const isRemovingCurrentVote = localPollOptions.value.some(option => option.id === optionId && option.selected)
        const nextOptions = localPollOptions.value.map(option => ({
          ...option,
          votes:
            option.id === optionId
              ? isRemovingCurrentVote
                ? Math.max(0, option.votes - 1)
                : option.votes + 1
              : !isRemovingCurrentVote && option.selected
                ? Math.max(0, option.votes - 1)
                : option.votes,
          selected: !isRemovingCurrentVote && option.id === optionId,
        }))
        const totalVotes = nextOptions.reduce((total, option) => total + option.votes, 0)

        localPollOptions.value = nextOptions.map(option => ({
          ...option,
          percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
        }))
        if (post.value) {
          post.value.pollOptions = [...localPollOptions.value]
        }
      }
    }
    catch (error) {
      actionState.value = "error"
      actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
    }
    finally {
      pollVoting.value = false
    }
  }

  async function refreshComments() {
    const currentPost = post.value

    if (!currentPost || loadingComments.value) {
      return
    }

    loadingComments.value = true

    try {
      const comments = await repository.getPostComments({
        postId: currentPost.id,
        limit: 50,
        offset: 0,
      })

      if (comments.length) {
        localComments.value = comments
        if (post.value) {
          post.value.comments = [...comments]
          post.value.stats.comments = comments.length
        }
      }
    }
    catch (error) {
      actionState.value = "error"
      actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
    }
    finally {
      loadingComments.value = false
    }
  }

  function openComments() {
    showComments.value = true
    void refreshComments()
  }

  function toggleComments() {
    if (showComments.value) {
      showComments.value = false
      return
    }

    openComments()
  }

  function updateReactionSummaries(
    summaries: FeedPostReactionSummary[],
    nextReaction: FeedStoryReactionType | null,
    previousReaction: FeedStoryReactionType | null,
  ) {
    const countsByReaction = new Map<FeedStoryReactionType, number>()

    for (const summary of summaries) {
      countsByReaction.set(summary.reaction, summary.count)
    }

    if (previousReaction) {
      countsByReaction.set(previousReaction, Math.max(0, (countsByReaction.get(previousReaction) ?? 0) - 1))
    }

    if (nextReaction && nextReaction !== previousReaction) {
      countsByReaction.set(nextReaction, (countsByReaction.get(nextReaction) ?? 0) + 1)
    }

    return feedReactionAssets
      .map(asset => ({
        reaction: asset.value,
        count: countsByReaction.get(asset.value) ?? 0,
      }))
      .filter(summary => summary.count > 0)
  }

  async function loadPostReactions(filter: FeedStoryReactionType | "all" = "all") {
    const currentPost = post.value

    if (!currentPost || reactionUsersLoading.value) {
      return
    }

    reactionUsersLoading.value = true

    try {
      const response = await repository.getPostReactions({
        postId: currentPost.id,
        reaction: filter,
        limit: 100,
      })

      localReactionSummaries.value = response.reactions
      localReactionUsers.value = response.users
      const nextLikesCount = response.reactions.reduce((total, summary) => total + summary.count, 0)

      if (nextLikesCount > 0) {
        likesCount.value = nextLikesCount
      }
    }
    catch (error) {
      actionState.value = "error"
      actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
    }
    finally {
      reactionUsersLoading.value = false
    }
  }

  async function openReactionModal(filter: FeedStoryReactionType | "all" = "all") {
    activeReactionFilter.value = filter
    reactionModalOpen.value = true
    await loadPostReactions(filter)
  }

  function closeReactionModal() {
    reactionModalOpen.value = false
  }

  function handleShared() {
    const currentPost = post.value

    if (!currentPost) {
      return
    }

    sharesCount.value += 1
    actionState.value = "success"
    actionMessage.value = t("feed.shareModal.shared")
    showShare.value = false
  }

  async function handleMenuAction(action: string) {
    const currentPost = post.value

    if (!currentPost) {
      return
    }

    if (action === "open" && import.meta.client) {
      window.open(currentPost.sourcePath || shareUrl.value, "_blank", "noopener,noreferrer")
      return
    }

    if (action === "copy") {
      actionState.value = "idle"
      actionMessage.value = ""

      try {
        if (!import.meta.client || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
          throw new Error("clipboard_unavailable")
        }

        await navigator.clipboard.writeText(shareUrl.value)
        actionMessage.value = t("feed.shareModal.copied")
      }
      catch {
        actionMessage.value = `${t("feed.shareModal.copyUnavailable")}: ${shareUrl.value}`
      }
    }
    else if (action === "report") {
      if (reporting.value) {
        return
      }

      reporting.value = true

      try {
        await repository.runPostAction({
          action: "report",
          postId: currentPost.id,
        })
        actionState.value = "success"
        actionMessage.value = t("feed.postCard.reportSuccess")
      }
      catch (error) {
        actionState.value = "error"
        actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
      }
      finally {
        reporting.value = false
      }
    }

    else if (action === "save" || action === "unsave") {
      try {
        await repository.runPostAction({
          action,
          postId: post.value.id,
        })
        post.value.isSaved = action === "save"
        actionState.value = "success"
        actionMessage.value = action === "save" ? t("feed.postHeader.menuSaveLabel") : t("feed.postHeader.menuUnsaveLabel")
      }
      catch (error) {
        actionState.value = "error"
        actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
      }
    }
    else if (action === "delete") {
      try {
        await repository.runPostAction({
          action: "delete",
          postId: post.value.id,
        })
        actionState.value = "success"
        actionMessage.value = t("feed.postHeader.menuDeleteLabel")
        // Note: In a real app, we might want to emit a 'deleted' event to the parent to remove it from the list
      }
      catch (error) {
        actionState.value = "error"
        actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
      }
    }
    else if (action === "hide") {
      try {
        await repository.runPostAction({
          action: "hide",
          postId: post.value.id,
        })
        actionState.value = "success"
        actionMessage.value = t("feed.postHeader.menuHideLabel")
        // Note: In a real app, we might want to emit a 'hidden' event
      }
      catch (error) {
        actionState.value = "error"
        actionMessage.value = error instanceof Error ? error.message : t("feed.publisherBox.statusErrorDescription")
      }
    }

    toast.add({
      color: actionState.value === "error" ? "warning" : "primary",
      icon: actionState.value === "error" ? "i-ph-warning-circle-fill" : "i-ph-check-circle-fill",
      title: currentPost.author,
      description: actionMessage.value,
    })
  }

  function downloadMedia() {
    const currentPost = post.value

    if (!currentPost || !mediaItems.value[currentMediaIndex.value]) {
      return
    }

    actionState.value = "success"
    actionMessage.value = t("feed.postCard.lightboxDownloadMessage")

    toast.add({
      color: "primary",
      icon: "i-ph-download-simple-fill",
      title: currentPost.author,
      description: actionMessage.value,
    })
  }

  return {
    currentAuthUserStore,
    showComments,
    showShare,
    liked,
    selectedPostReaction,
    postReactionTrayOpen,
    lightboxOpen,
    currentMediaIndex,
    localComments,
    localPollOptions,
    likesCount,
    sharesCount,
    actionState,
    actionMessage,
    commenting,
    pollVoting,
    loadingComments,
    reactionModalOpen,
    reactionUsersLoading,
    activeReactionFilter,
    postAnchorId,
    postReactionOptions,
    activePostReactionAsset,
    activePostReactionLabel,
    previewReactions,
    reactionTabs,
    reactionModalUsers,
    pollVotesTotal,
    hasReactions,
    commentsCount,
    hasPostContent,
    mediaItems,
    shareUrl,
    commentActionRepository,
    openPostReactionTray,
    closePostReactionTray,
    startPostReactionPress,
    finishPostReactionPress,
    cancelPostReactionPress,
    handlePostReactionButtonClick,
    toggleLike,
    reactToPost,
    onOpenMedia,
    submitComment,
    votePoll,
    refreshComments,
    openComments,
    toggleComments,
    openReactionModal,
    closeReactionModal,
    loadPostReactions,
    handleShared,
    handleMenuAction,
    downloadMedia,
    isOwner,
    isAdmin,
  }
}
