// English description: Owns feed comment reactions, reply thread loading, and reply submission for a single rendered comment item.

import { useTimeoutFn } from "@vueuse/core"
import { defaultFeedReactionAsset, feedReactionAssetByValue, feedReactionAssets } from "../constants/reaction-assets"
import { defaultFeedStoryReaction, type FeedStoryReactionType } from "../../domain/constants/story-reactions"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"
import type { FeedCommentAttachment, FeedCommentRecord, FeedCommentSubmitPayload } from "../../domain/types/feed.types"

type FeedCommentItemVMProps = {
  id?: number
  author: string
  authorAvatarUrl?: string
  authorPath?: string
  role: string
  text: string
  time?: string
  attachment?: FeedCommentAttachment
  reactionsCount?: number
  selectedReaction?: FeedStoryReactionType | null
  replies?: FeedCommentRecord[]
  repliesCount?: number
  enableReply?: boolean
  currentUserName?: string
  currentUserAvatarUrl?: string
  reactionTarget?: "comment" | "reply"
}

export type FeedCommentActionRepository = Pick<ReturnType<typeof createApiFeedRepository>, "getCommentReplies" | "runCommentAction">

export function useFeedCommentItemVM(
  props: FeedCommentItemVMProps,
  repository: FeedCommentActionRepository = createApiFeedRepository(),
) {
  const { t } = useI18n()

  const replyThreadOpen = ref((props.replies?.length ?? 0) > 0)
  const replyLoading = ref(false)
  const replySubmitting = ref(false)
  const reacting = ref(false)
  const reactionTrayOpen = ref(false)
  const reactionLongPressTriggered = ref(false)
  const replyItems = ref<FeedCommentRecord[]>(props.replies ?? [])
  const localSelectedReaction = ref<FeedStoryReactionType | null>(props.selectedReaction ?? null)
  const localReactionsCount = ref(props.reactionsCount ?? 0)

  watch(
    () => props.replies,
    (value) => {
      replyItems.value = value ? [...value] : []
      if (value && value.length > 0) {
        replyThreadOpen.value = true
      }
    },
    { deep: true },
  )

  watch(
    () => props.selectedReaction,
    (value) => {
      localSelectedReaction.value = value ?? null
    },
    { immediate: true },
  )

  watch(
    () => props.reactionsCount,
    (value) => {
      localReactionsCount.value = value ?? 0
    },
    { immediate: true },
  )

  const initials = computed(() =>
    props.author
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || "")
      .join(""),
  )

  const reactionOptions = computed(() =>
    feedReactionAssets.map(reaction => ({
      value: reaction.value,
      label: t(reaction.labelKey),
      src: reaction.src,
    })),
  )

  const replyActionLabel = computed(() => {
    const count = replyItems.value.length || props.repliesCount || 0

    if (count > 0) {
      return `${t("feed.commentItem.reply")} · ${count}`
    }

    return t("feed.commentItem.reply")
  })

  const activeReactionAsset = computed(() =>
    localSelectedReaction.value
      ? feedReactionAssetByValue[localSelectedReaction.value]
      : defaultFeedReactionAsset,
  )

  const activeReactionLabel = computed(() =>
    localSelectedReaction.value
      ? t(activeReactionAsset.value.labelKey)
      : t("feed.postCard.like"),
  )

  const {
    start: startReactionLongPressTimer,
    stop: stopReactionLongPressTimer,
  } = useTimeoutFn(() => {
    reactionLongPressTriggered.value = true
    reactionTrayOpen.value = true
  }, 420, { immediate: false })

  function openReactionTray() {
    reactionTrayOpen.value = true
  }

  function closeReactionTray() {
    reactionTrayOpen.value = false
  }

  function startReactionPress() {
    if (reacting.value || !props.id) {
      return
    }

    reactionLongPressTriggered.value = false
    startReactionLongPressTimer()
  }

  function finishReactionPress() {
    stopReactionLongPressTimer()
  }

  function cancelReactionPress() {
    stopReactionLongPressTimer()
  }

  async function handleReactionButtonClick() {
    if (reactionLongPressTriggered.value) {
      return
    }

    await reactToComment(defaultFeedStoryReaction.value)
  }

  async function toggleReplyThread() {
    replyThreadOpen.value = !replyThreadOpen.value

    if (!replyThreadOpen.value || !props.id || replyItems.value.length > 0) {
      return
    }

    replyLoading.value = true

    try {
      replyItems.value = await repository.getCommentReplies({
        commentId: props.id,
        limit: 10,
        offset: 0,
      })
    }
    finally {
      replyLoading.value = false
    }
  }

  async function reactToComment(reaction: FeedStoryReactionType) {
    if (!props.id || reacting.value) {
      return
    }

    reacting.value = true
    const hadLocalReaction = Boolean(localSelectedReaction.value)

    try {
      await repository.runCommentAction({
        action: "reaction",
        target: props.reactionTarget ?? "comment",
        targetId: props.id,
        reaction,
      })

      if (!hadLocalReaction) {
        localReactionsCount.value += 1
      }

      localSelectedReaction.value = reaction
      reactionTrayOpen.value = false
    }
    finally {
      reacting.value = false
    }
  }

  async function submitReply(payload: FeedCommentSubmitPayload) {
    if (!props.id || replySubmitting.value) {
      return
    }

    replySubmitting.value = true

    try {
      const response = await repository.runCommentAction({
        action: "reply",
        commentId: props.id,
        text: payload.backendText ?? payload.text,
      })

      const reply = response.reply ?? {
        id: response.commentId ?? Date.now(),
        author: props.currentUserName || t("feed.postCard.commentAuthor"),
        authorAvatarUrl: props.currentUserAvatarUrl || "",
        authorPath: undefined,
        role: props.currentUserName || t("feed.postCard.commentRole"),
        text: payload.text,
        time: t("feed.postCard.justNow"),
        reactionsCount: 0,
        selectedReaction: null,
      }

      replyThreadOpen.value = true

      if (props.id) {
        const savedReplies = await repository.getCommentReplies({
          commentId: props.id,
          limit: 10,
          offset: 0,
        })

        replyItems.value = savedReplies.some(item => item.id === reply.id)
          ? savedReplies
          : [...savedReplies, reply]
      }
      else {
        replyItems.value = [...replyItems.value, reply]
      }
    }
    finally {
      replySubmitting.value = false
    }
  }

  return {
    replyThreadOpen,
    replyLoading,
    replySubmitting,
    reactionTrayOpen,
    reacting,
    replyItems,
    localSelectedReaction,
    localReactionsCount,
    initials,
    reactionOptions,
    replyActionLabel,
    activeReactionAsset,
    activeReactionLabel,
    openReactionTray,
    closeReactionTray,
    startReactionPress,
    finishReactionPress,
    cancelReactionPress,
    handleReactionButtonClick,
    toggleReplyThread,
    reactToComment,
    submitReply,
  }
}
