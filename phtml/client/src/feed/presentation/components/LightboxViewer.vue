<!-- Description: Adapts feed media data into the shared lightbox modal and forwards interaction events back to the post surface. -->
<template>
  <LightboxModal
    :open="open"
    :items="items"
    :current-index="currentIndex"
    :title="resolvedTitle"
    :description="resolvedDescription"
    :author="author"
    :author-avatar-url="authorAvatarUrl"
    :author-path="authorPath"
    :caption="caption"
    :time-label="timeLabel"
    :like-count="likeCount"
    :comments="comments"
    :current-user-name="currentUserName"
    :current-user-avatar-url="currentUserAvatarUrl"
    :submitting-comment="submittingComment"
    :show-composer="showComposer"
    :selected-reaction="selectedReaction"
    @close="emit('close')"
    @change="emit('change', $event)"
    @share="emit('share')"
    @download="emit('download')"
    @like="emit('like')"
    @react="emit('react', $event)"
    @comment="emit('comment')"
    @submit-comment="emit('submit-comment', $event)"
  />
</template>

<script setup lang="ts">
import LightboxModal from "../../../lightbox/presentation/components/LightboxModal.vue"
import type { FeedCommentRecord, FeedCommentSubmitPayload } from "../../domain/types/feed.types"
import type { FeedStoryReactionType } from "../../domain/constants/story-reactions"

const { t } = useI18n()

const props = withDefaults(defineProps<{
  open?: boolean
  title?: string
  description?: string
  author?: string
  authorAvatarUrl?: string
  authorPath?: string
  caption?: string
  timeLabel?: string
  likeCount?: number
  comments?: FeedCommentRecord[]
  currentUserName?: string
  currentUserAvatarUrl?: string
  submittingComment?: boolean
  showComposer?: boolean
  selectedReaction?: FeedStoryReactionType | null
  items: Array<{ type: "image" | "video"; src: string; alt?: string; mime?: string }>
  currentIndex?: number
}>(), {
  open: false,
  title: "",
  description: "",
  author: "VNSEEA",
  authorAvatarUrl: "",
  authorPath: "",
  caption: "",
  timeLabel: "",
  likeCount: 0,
  comments: () => [],
  currentUserName: "",
  currentUserAvatarUrl: "",
  submittingComment: false,
  showComposer: true,
  selectedReaction: null,
  currentIndex: 0,
})

const emit = defineEmits<{
  close: []
  share: []
  download: []
  like: []
  react: [reaction: FeedStoryReactionType]
  comment: []
  change: [index: number]
  "submit-comment": [payload: FeedCommentSubmitPayload]
}>()

const resolvedTitle = computed(() =>
  props.title || t("feed.lightboxViewer.title"),
)

const resolvedDescription = computed(() =>
  props.description || t("feed.lightboxViewer.description", { count: props.items.length }),
)
</script>
