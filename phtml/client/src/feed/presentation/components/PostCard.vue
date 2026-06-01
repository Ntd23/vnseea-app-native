<!-- Description: Renders a normalized feed post with real backend media, like, report, and comment actions instead of mock-local content. -->
<template>
  <article 
    :id="postAnchorId" 
    class="post-card"
    :class="{ 'post-card--colored': Boolean(postColorStyles) }"
  >
    <div class="post-card__body">
      <FeedPostHeader
        :author="post.author"
        :author-avatar-url="post.authorAvatarUrl"
        :author-path="post.authorPath"
        :event-context="post.eventContext"
        :group-context="post.groupContext"
        :feeling="post.feeling"
        :role="post.role"
        :time="post.time"
        :audience="post.audience"
        :is-saved="post.isSaved"
        :is-owner="isOwner"
        :is-admin="isAdmin"
        @menu-action="onMenuAction"
      />

      <div
        v-if="hasPostContent"
        class="post-card__content"
        :style="postColorStyles ? { background: postColorStyles.bg, color: postColorStyles.text } : {}"
      >
        <p v-if="post.text" class="post-card__text">
          <template v-for="segment in postTextSegments" :key="segment.key">
            <span :class="{ 'post-card__mention': segment.isMention }">{{ segment.text }}</span>
          </template>
        </p>
        <div v-if="post.tags.length" class="post-card__tags">
          <NuxtLink
            v-for="tag in post.tags"
            :key="tag"
            :to="createHashtagPath(tag)"
            class="post-card__tag"
          >
            {{ formatHashtagLabel(tag) }}
          </NuxtLink>
        </div>
      </div>

      <div v-if="localPollOptions.length" class="post-card__poll">
        <button
          v-for="option in localPollOptions"
          :key="option.id"
          type="button"
          class="post-card__poll-option"
          :class="{ 'post-card__poll-option--selected': option.selected }"
          :disabled="pollVoting"
          @click="votePoll(option.id)"
        >
          <div class="post-card__poll-fill" :style="{ width: `${Math.min(option.percentage, 100)}%` }" />
          <div class="post-card__poll-content">
            <span class="post-card__poll-text">{{ option.text }}</span>
            <span class="post-card__poll-meta">
              <strong>{{ option.percentage }}%</strong>
              <small>{{ t("feed.postCard.pollOptionVotes", { count: option.votes }) }}</small>
            </span>
          </div>
        </button>
        <p class="post-card__poll-summary">
          {{ t("feed.postCard.pollTotalVotes", { count: pollVotesTotal }) }}
        </p>
      </div>

      <NuxtLink
        v-if="post.attachmentCard"
        :to="post.attachmentCard.href"
        class="post-card__attachment"
        :class="`post-card__attachment--${post.attachmentCard.type}`"
      >
        <div class="post-card__attachment-media">
          <NuxtImg
            v-if="post.attachmentCard.imageUrl"
            :src="post.attachmentCard.imageUrl"
            :alt="post.attachmentCard.title"
            loading="lazy"
            class="post-card__attachment-image"
          />
          <div v-else class="post-card__attachment-fallback">
            <Icon :name="attachmentIcon" />
          </div>
        </div>
        <div class="post-card__attachment-body">
          <p class="post-card__attachment-eyebrow">
            <Icon :name="attachmentIcon" />
            <span>{{ attachmentLabel }}</span>
          </p>
          <h3 class="post-card__attachment-title">{{ post.attachmentCard.title }}</h3>
          <p v-if="post.attachmentCard.description" class="post-card__attachment-description">
            {{ post.attachmentCard.description }}
          </p>
          <div v-if="post.attachmentCard.type === 'funding'" class="post-card__attachment-progress">
            <div class="post-card__attachment-progress-top">
              <span>{{ t("feed.postCard.fundingProgress") }}</span>
              <strong>{{ post.attachmentCard.progress ?? 0 }}%</strong>
            </div>
            <div class="post-card__attachment-progress-track">
              <span :style="{ width: `${post.attachmentCard.progress ?? 0}%` }" />
            </div>
          </div>
          <span class="post-card__attachment-action">
            {{ attachmentActionLabel }}
            <Icon name="i-ph-arrow-right-bold" />
          </span>
        </div>
      </NuxtLink>

      <ClientOnly v-if="post.isLive">
        <FeedLivePostPlayer
          :post-id="post.id"
          :initial-state="post.liveState"
          :initial-viewer-count="post.liveViewerCount"
          :author-user-id="post.authorId"
          :author="post.author"
          :author-avatar-url="post.authorAvatarUrl"
          @react="reactToPost"
          @comment="openComments"
          @share="showShare = true"
        />
      </ClientOnly>

      <FeedSharedPostCard v-else-if="post.sharedPost" :post="post.sharedPost" class="mt-4" />

      <FeedPostMediaGrid v-else-if="mediaItems.length" class="post-card__media" :items="mediaItems" @open="handleMediaOpen" />

      <div class="post-card__stats">
        <button
          v-if="hasReactions"
          class="post-card__stats-left post-card__stats-left--button"
          type="button"
          @click="openReactionModal()"
        >
          <div class="post-card__reaction-emojis">
            <span
              v-for="reaction in previewReactions"
              :key="reaction.value"
              class="post-card__emoji"
            >
              <img
                :src="reaction.src"
                :alt="t(reaction.labelKey)"
                class="post-card__emoji-image"
                draggable="false"
              >
            </span>
          </div>
          <span class="post-card__stat-count">{{ likesCount }}</span>
        </button>
        <div class="post-card__stats-right">
          <span>{{ t("feed.postCard.commentsCount", { count: commentsCount }) }}</span>
          <span>{{ t("feed.postCard.sharesCount", { count: sharesCount }) }}</span>
        </div>
      </div>

      <div class="post-card__actions">
        <div
          class="post-card__reaction-action"
          @mouseenter="openPostReactionTray"
          @mouseleave="closePostReactionTray"
          @focusin="openPostReactionTray"
          @focusout="closePostReactionTray"
        >
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0 translate-y-2 scale-95"
          >
            <div
              v-if="postReactionTrayOpen"
              class="post-card__reaction-tray"
              @click.stop
              @pointerdown.stop
            >
              <button
                v-for="(reaction, reactionIndex) in postReactionOptions"
                :key="reaction.value"
                class="post-card__reaction-option"
                :class="{ 'post-card__reaction-option--active': selectedPostReaction === reaction.value }"
                :style="{ '--reaction-index': String(reactionIndex) }"
                type="button"
                :aria-label="reaction.label"
                @click="reactToPost(reaction.value)"
              >
                <img
                  :src="reaction.src"
                  :alt="reaction.label"
                  class="post-card__reaction-option-image"
                  draggable="false"
                >
              </button>
            </div>
          </Transition>

          <button
            class="post-card__action-btn"
            :class="{ 'post-card__action-btn--active': liked, 'post-card__action-btn--reacted': selectedPostReaction }"
            type="button"
            :aria-pressed="liked"
            :aria-label="activePostReactionLabel"
            @pointerdown="startPostReactionPress"
            @pointerup="finishPostReactionPress"
            @pointerleave="cancelPostReactionPress"
            @pointercancel="cancelPostReactionPress"
            @click="handlePostReactionButtonClick"
          >
            <img
              v-if="selectedPostReaction"
              :src="activePostReactionAsset.src"
              :alt="activePostReactionLabel"
              class="post-card__action-reaction-image"
              draggable="false"
            >
            <Icon v-else name="i-ph-thumbs-up-fill" class="post-card__action-icon" />
            <span>{{ selectedPostReaction ? activePostReactionLabel : liked ? t("feed.postCard.likeActive") : t("feed.postCard.like") }}</span>
          </button>
        </div>
        <button
          class="post-card__action-btn"
          :class="{ 'post-card__action-btn--active': showComments }"
          type="button"
          :aria-pressed="showComments"
          @click="toggleComments"
        >
          <Icon name="i-ph-chat-circle-fill" class="post-card__action-icon" />
          <span>{{ t("feed.postCard.comment") }}</span>
        </button>
       
        <button
          class="post-card__action-btn"
          type="button"
          @click="showShare = true"
        >
          <Icon name="i-ph-share-fat-fill" class="post-card__action-icon" />
          <span>{{ t("feed.postCard.share") }}</span>
        </button>
      </div>

      <UAlert
        v-if="actionState === 'error' && actionMessage"
        class="mt-3 rounded-2xl"
        color="warning"
        variant="subtle"
        icon="i-ph-warning-circle-fill"
        :description="actionMessage"
      />

      <div v-if="localComments.length && !showComments" class="post-card__comment-peek">
        <div class="post-card__comment-peek-row">
          <div class="post-card__comment-avatar">
            <img
              v-if="previewComment?.authorAvatarUrl"
              :src="previewComment.authorAvatarUrl"
              :alt="previewComment.author"
              class="post-card__comment-avatar-image"
            >
            <span v-else>{{ previewCommentInitials }}</span>
          </div>
          <div class="post-card__comment-bubble">
            <p class="post-card__comment-author">{{ previewComment?.author }}</p>
            <p class="post-card__comment-text">{{ previewComment?.text }}</p>
          </div>
        </div>
        <button v-if="localComments.length > 1" class="post-card__comment-more" type="button" @click.stop="openComments">
          <span>{{ t("feed.postCard.viewMoreComments", { count: localComments.length - 1 }) }}</span>
        </button>
      </div>

      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
        <div v-if="showComments" class="post-card__comments-full">
          <FeedCommentList
            :comments="localComments"
            enable-reply
            enable-reaction
            :current-user-name="currentAuthUserStore.user?.name"
            :current-user-avatar-url="currentAuthUserStore.user?.avatarUrl"
            :comment-action-repository="commentActionRepository"
          />
          <FeedCommentComposer
            ref="commentComposerRef"
            :current-user-name="currentAuthUserStore.user?.name"
            :current-user-avatar-url="currentAuthUserStore.user?.avatarUrl"
            :submitting="commenting"
            @submit="submitComment"
          />
        </div>
      </Transition>
    </div>

    <ClientOnly>
      <FeedShareModal
        :open="showShare"
        :share-url="shareUrl"
        :post="{ id: post.id, author: post.author, text: post.text, authorAvatar: post.authorAvatarUrl, authorVerified: post.authorVerified }"
        @close="showShare = false"
        @shared="handleShared"
      />
      <FeedLightboxViewer
        :open="lightboxOpen"
        :items="post.sharedPost ? [] : mediaItems"
        :current-index="currentMediaIndex"
        :title="props.post.text || t('feed.postCard.lightboxTitle')"
        :description="''"
        :author="post.author"
        :author-avatar-url="post.authorAvatarUrl"
        :author-path="post.authorPath"
        :caption="post.text"
        :time-label="post.time"
        :like-count="likesCount"
        :comments="localComments"
        :current-user-name="currentAuthUserStore.user?.name"
        :current-user-avatar-url="currentAuthUserStore.user?.avatarUrl"
        :submitting-comment="commenting"
        :selected-reaction="selectedPostReaction"
        @close="lightboxOpen = false"
        @change="currentMediaIndex = $event"
        @share="showShare = true"
        @download="downloadMedia"
        @like="toggleLike"
        @react="reactToPost"
        @comment="openComments"
        @submit-comment="submitComment"
      />
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="reactionModalOpen"
            class="post-card__reaction-modal-backdrop"
            @click.self="closeReactionModal"
          >
            <section class="post-card__reaction-modal" role="dialog" aria-modal="true">
              <div class="post-card__reaction-modal-tabs">
                <button
                  v-for="tab in reactionTabs"
                  :key="tab.value"
                  type="button"
                  class="post-card__reaction-modal-tab"
                  :class="{ 'post-card__reaction-modal-tab--active': activeReactionFilter === tab.value }"
                  @click="openReactionModal(tab.value)"
                >
                  <span v-if="tab.value === 'all'">{{ tab.label }}</span>
                  <img
                    v-if="tab.asset"
                    :src="tab.asset.src"
                    :alt="tab.label"
                    class="post-card__reaction-modal-tab-icon"
                    draggable="false"
                  >
                  <strong v-if="tab.value !== 'all' && tab.count > 0">{{ tab.count }}</strong>
                </button>
              </div>

              <button
                type="button"
                class="post-card__reaction-modal-close"
                :aria-label="t('feed.postCard.reactionModalClose')"
                @click="closeReactionModal"
              >
                <Icon name="i-ph-x-bold" />
              </button>

              <div class="post-card__reaction-modal-list">
                <div v-if="reactionUsersLoading" class="post-card__reaction-loading">
                  <USkeleton v-for="index in 5" :key="index" class="h-12 rounded-xl" />
                </div>
                <template v-else>
                  <div
                    v-for="user in reactionModalUsers"
                    :key="`${user.id}-${user.reaction}`"
                    class="post-card__reaction-user"
                  >
                    <NuxtLink
                      :to="user.profilePath || '#'"
                      class="post-card__reaction-user-link"
                    >
                      <span class="post-card__reaction-user-avatar">
                        <UAvatar
                          :src="user.avatarUrl"
                          :alt="user.name"
                          size="lg"
                        />
                        <img
                          :src="postReactionAssetByValue[user.reaction].src"
                          :alt="t(postReactionAssetByValue[user.reaction].labelKey)"
                          class="post-card__reaction-user-badge"
                          draggable="false"
                        > 
                      </span>
                      <span class="post-card__reaction-user-name">{{ user.name }}</span>
                    </NuxtLink>
                    <button
                      v-if="!user.isFollowing"
                      type="button"
                      class="post-card__reaction-add-friend"
                    >
                      <Icon name="i-ph-user-plus-fill" />
                      <span>{{ t("feed.postCard.reactionAddFriend") }}</span>
                    </button>
                  </div>
                </template>

                <div v-if="!reactionUsersLoading && reactionModalUsers.length === 0" class="post-card__reaction-empty">
                  {{ t("feed.postCard.reactionNoUsers") }}
                </div>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>
    </ClientOnly>
  </article>
</template>

<script setup lang="ts">
import { createHashtagPath, formatHashtagLabel } from "../../application/composables/useHashtagData"
import { feedReactionAssetByValue as postReactionAssetByValue } from "../../application/constants/reaction-assets"
import { useFeedPostColors } from "../../application/composables/useFeedPostColors"
import { createPostTextMentionSegments } from "../../application/utils/feed-mentions"
import { useFeedPostCardVM } from "../../application/view-models/useFeedPostCardVM"
import type { FeedPostRecord } from "../../domain/types/feed.types"
import FeedCommentComposer from "./CommentComposer.vue"
import FeedCommentList from "./CommentList.vue"
import FeedLightboxViewer from "./LightboxViewer.vue"
import FeedLivePostPlayer from "./LivePostPlayer.vue"
import FeedPostHeader from "./PostHeader.vue"
import FeedPostMediaGrid from "./PostMediaGrid.vue"
import FeedShareModal from "./ShareModal.vue"
import FeedSharedPostCard from "./SharedPostCard.vue"

const { t } = useI18n()
const { defaultPostColor, postColorById } = useFeedPostColors()

const props = defineProps<{
  post: FeedPostRecord
  preventLightbox?: boolean
}>()

const emit = defineEmits<{
  open: [index: number]
  deleted: [postId: number]
  hidden: [postId: number]
}>()

async function onMenuAction(action: string) {
  await handleMenuAction(action)
  if (actionState.value === "success") {
    if (action === "delete") {
      emit("deleted", props.post.id)
    } else if (action === "hide") {
      emit("hidden", props.post.id)
    }
  }
}
const commentComposerRef = ref<{
  focus: () => void
  insertMentionTrigger: () => void
} | null>(null)

const {
  currentAuthUserStore,
  showComments,
  showShare,
  liked,
  selectedPostReaction,
  postReactionTrayOpen,
  lightboxOpen,
  reactionModalOpen,
  reactionUsersLoading,
  activeReactionFilter,
  currentMediaIndex,
  localComments,
  localPollOptions,
  likesCount,
  sharesCount,
  actionState,
  actionMessage,
  commenting,
  pollVoting,
  commentActionRepository,
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
  openPostReactionTray,
  closePostReactionTray,
  startPostReactionPress,
  finishPostReactionPress,
  cancelPostReactionPress,
  handlePostReactionButtonClick,
  toggleLike,
  reactToPost,
  votePoll,
  onOpenMedia,
  submitComment,
  handleShared,
  handleMenuAction,
  downloadMedia,
  isOwner,
  isAdmin,
  openComments,
  toggleComments,
  openReactionModal,
  closeReactionModal,
} = useFeedPostCardVM(toRef(props, "post"))

const postTextSegments = computed(() =>
  createPostTextMentionSegments(props.post.text, props.post.mentions ?? []),
)

const postColorStyles = computed(() => {
  if (!props.post.colorId) return null

  return postColorById.value[props.post.colorId] || defaultPostColor.value
})

const previewComment = computed(() => localComments.value[0] ?? null)
const previewCommentInitials = computed(() => {
  const author = previewComment.value?.author ?? ""
  const initials = author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? "")
    .join("")

  return initials || "?"
})

const attachmentIcon = computed(() =>
  props.post.attachmentCard?.type === "funding"
    ? "i-ph-hand-heart-duotone"
    : props.post.attachmentCard?.type === "product"
      ? "i-ph-shopping-bag-open-duotone"
      : "i-ph-newspaper-clipping-duotone",
)

const attachmentLabel = computed(() =>
  props.post.attachmentCard?.type === "funding"
    ? t("feed.postCard.fundingAttachment")
    : props.post.attachmentCard?.type === "product"
      ? t("feed.postCard.productAttachment")
      : t("feed.postCard.blogAttachment"),
)

const attachmentActionLabel = computed(() =>
  props.post.attachmentCard?.type === "funding"
    ? t("feed.postCard.openFunding")
    : props.post.attachmentCard?.type === "product"
      ? t("feed.postCard.openProduct")
      : t("feed.postCard.openBlog"),
)

async function openCommentTagging() {
  showComments.value = true
  await nextTick()
  commentComposerRef.value?.insertMentionTrigger()
}

function handleMediaOpen(index: number) {
  emit("open", index)
  if (!props.preventLightbox) {
    onOpenMedia(index)
  }
}
</script>

<style scoped>
.post-card {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 20px rgba(0, 0, 255, 0.03);
  transition: box-shadow 0.2s ease;
}

.post-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05), 0 10px 28px rgba(0, 0, 255, 0.05);
}

.post-card__body {
  padding: 16px;
}

@media (min-width: 640px) {
  .post-card__body {
    padding: 20px;
  }
}

.post-card__content {
  margin-top: 14px;
}

.post-card__text {
  font-size: 14.5px;
  line-height: 1.75;
  color: #334155;
}

.post-card__mention {
  color: #1420ff;
  font-weight: 600;
}

.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.post-card__tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 255, 0.05);
  font-size: 12px;
  font-weight: 600;
  color: #0000ff;
  transition: all 0.15s ease;
}

.post-card__tag:hover {
  background: #0000ff;
  color: #ffffff;
}

.post-card__media {
  margin-top: 14px;
}

.post-card__poll {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.post-card__poll-option {
  position: relative;
  overflow: hidden;
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: #f8fafc;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.post-card__poll-option--selected {
  border-color: rgba(20, 32, 255, 0.35);
}

.post-card__poll-option:disabled {
  cursor: default;
}

.post-card__poll-option:not(:disabled):hover {
  border-color: rgba(20, 32, 255, 0.25);
}

.post-card__poll-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(20, 32, 255, 0.1);
}

.post-card__poll-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}

.post-card__poll-text,
.post-card__poll-meta {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.post-card__poll-meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: #1420ff;
  text-align: right;
}

.post-card__poll-meta strong {
  font-size: 13px;
  line-height: 1;
}

.post-card__poll-meta small {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.post-card__poll-summary {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.post-card__attachment {
  display: grid;
  gap: 0;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.09);
  border-radius: 14px;
  background: #ffffff;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.post-card__attachment:hover {
  border-color: rgba(0, 0, 255, 0.18);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.post-card__attachment-media {
  position: relative;
  min-height: 160px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eef2ff;
}

.post-card__attachment-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-card__attachment-fallback {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  color: #0000ff;
}

.post-card__attachment-fallback svg,
.post-card__attachment-fallback :deep(svg) {
  width: 42px;
  height: 42px;
}

.post-card__attachment-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}

.post-card__attachment-eyebrow,
.post-card__attachment-action,
.post-card__attachment-progress-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.post-card__attachment-eyebrow {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: rgba(0, 0, 255, 0.7);
}

.post-card__attachment-eyebrow svg,
.post-card__attachment-eyebrow :deep(svg),
.post-card__attachment-action svg,
.post-card__attachment-action :deep(svg) {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.post-card__attachment-title {
  display: -webkit-box;
  overflow: hidden;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-card__attachment-description {
  display: -webkit-box;
  overflow: hidden;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-card__attachment-progress {
  display: grid;
  gap: 6px;
  margin-top: 2px;
}

.post-card__attachment-progress-top {
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
}

.post-card__attachment-progress-top strong {
  color: #16a34a;
}

.post-card__attachment-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #dcfce7;
}

.post-card__attachment-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #16a34a;
}

.post-card__attachment-action {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 800;
  color: #0000ff;
}

@media (min-width: 640px) {
  .post-card__attachment {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .post-card__attachment-media {
    min-height: 100%;
    aspect-ratio: auto;
  }
}

.post-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 255, 0.06);
  font-size: 13px;
  color: #64748b;
}

.post-card__stats-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.post-card__stats-left--button {
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
}

.post-card__stats-left--button:hover .post-card__stat-count {
  text-decoration: underline;
}

.post-card__reaction-emojis {
  display: flex;
  align-items: center;
}

.post-card__emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: #ffffff;
  transition: transform 0.15s ease;
}

.post-card__emoji:hover {
  transform: scale(1.2);
  z-index: 2;
}

.post-card__emoji-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.post-card__stat-count {
  font-weight: 600;
  font-size: 13px;
}

.post-card__stats-right {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  color: #94a3b8;
}

.post-card__reaction-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.28);
  padding: 24px;
}

.post-card__reaction-modal {
  position: relative;
  display: flex;
  width: min(684px, calc(100vw - 32px));
  max-height: min(550px, calc(100dvh - 48px));
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.26);
}

.post-card__reaction-modal-tabs {
  display: flex;
  min-height: 76px;
  align-items: stretch;
  gap: 4px;
  overflow-x: auto;
  padding: 14px 78px 0 28px;
  border-bottom: 1px solid #edf0f4;
}

.post-card__reaction-modal-tab {
  position: relative;
  display: inline-flex;
  min-width: max-content;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  padding: 0 14px 14px;
  color: #65676b;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.post-card__reaction-modal-tab--active {
  color: #0000ff;
}

.post-card__reaction-modal-tab--active::after {
  position: absolute;
  right: 8px;
  bottom: 0;
  left: 8px;
  height: 3px;
  border-radius: 999px 999px 0 0;
  background: #0000ff;
  content: "";
}

.post-card__reaction-modal-tab-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.post-card__reaction-modal-close {
  position: absolute;
  top: 15px;
  right: 20px;
  display: inline-flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: #e4e6eb;
  color: #050505;
  cursor: pointer;
}

.post-card__reaction-modal-close svg,
.post-card__reaction-modal-close :deep(svg) {
  width: 24px;
  height: 24px;
}

.post-card__reaction-modal-list {
  display: grid;
  gap: 10px;
  overflow-y: auto;
  padding: 18px 20px 24px;
}

.post-card__reaction-user {
  display: flex;
  min-height: 60px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.post-card__reaction-user-link {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
  color: #050505;
  text-decoration: none;
}

.post-card__reaction-user-avatar {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
}

.post-card__reaction-user-badge {
  position: absolute;
  right: -2px;
  bottom: -1px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ffffff;
  object-fit: contain;
}

.post-card__reaction-user-name {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-card__reaction-add-friend {
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: #e4e6eb;
  padding: 0 14px;
  color: #050505;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.post-card__reaction-add-friend svg,
.post-card__reaction-add-friend :deep(svg) {
  width: 19px;
  height: 19px;
}

.post-card__reaction-empty {
  padding: 42px 16px;
  color: #65676b;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 560px) {
  .post-card__reaction-modal-backdrop {
    align-items: flex-end;
    padding: 0;
  }

  .post-card__reaction-modal {
    width: 100%;
    max-height: 82dvh;
    border-radius: 14px 14px 0 0;
  }

  .post-card__reaction-modal-tabs {
    padding-left: 14px;
  }

  .post-card__reaction-user {
    align-items: flex-start;
    flex-direction: column;
  }

  .post-card__reaction-add-friend {
    width: 100%;
    justify-content: center;
  }
}

.post-card__actions {
  position: relative;
  z-index: 2;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 255, 0.06);
}

.post-card__reaction-action {
  position: relative;
  z-index: 3;
  min-width: 0;
}

.post-card__reaction-action::before {
  content: "";
  position: absolute;
  left: -10px;
  right: -10px;
  bottom: 100%;
  height: 18px;
}

.post-card__action-btn {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  color: #64748b;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.post-card__action-btn > * {
  pointer-events: none;
}

.post-card__action-btn span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-card__action-btn:hover {
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.post-card__action-btn--active {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.post-card__action-btn--reacted .post-card__action-reaction-image {
  animation: post-reaction-selected-pop 0.32s cubic-bezier(0.2, 1.35, 0.35, 1);
}

.post-card__action-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.post-card__action-symbol {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
}

.post-card__action-reaction-image {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: contain;
}

@media (max-width: 420px) {
  .post-card__actions {
    gap: 4px;
  }

  .post-card__action-btn {
    gap: 4px;
    min-height: 42px;
    padding: 9px 4px;
    font-size: 12.5px;
  }

  .post-card__action-icon {
    width: 17px;
    height: 17px;
  }

  .post-card__action-reaction-image {
    width: 18px;
    height: 18px;
  }
}

.post-card__reaction-tray {
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  z-index: 20;
  display: flex;
  gap: 10px;
  transform: translateX(-50%);
  border-radius: 999px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.98);
  padding: 8px 10px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  filter: none;
  transform-origin: 50% 100%;
  animation: post-reaction-tray-in 0.16s ease-out both;
  will-change: transform, opacity;
}

.post-card__reaction-option {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.15s ease, transform 0.15s ease;
  will-change: transform;
}

.post-card__reaction-option:hover,
.post-card__reaction-option:focus-visible,
.post-card__reaction-option--active {
  background: transparent;
  transform: translateY(-8px) scale(1.18);
}

.post-card__reaction-option-image {
  width: 28px;
  height: 28px;
  object-fit: contain;
  pointer-events: none;
  transform: translateZ(0);
}

@keyframes post-reaction-tray-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(8px) scale(0.96);
  }

  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes post-reaction-selected-pop {
  0% {
    transform: scale(0.72) rotate(-8deg);
  }

  65% {
    transform: scale(1.24) rotate(4deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
  }
}

@media (max-width: 520px) {
  .post-card__reaction-action {
    position: static;
  }

  .post-card__reaction-action::before {
    display: none;
  }

  .post-card__reaction-tray {
    bottom: 42px;
    left: 12px;
    right: 12px;
    justify-content: space-between;
    gap: 4px;
    transform: none;
    animation-name: post-reaction-tray-in-mobile;
  }

  .post-card__reaction-option {
    width: 36px;
    height: 36px;
  }

  .post-card__reaction-option:hover,
  .post-card__reaction-option:focus-visible,
  .post-card__reaction-option--active {
    transform: translateY(-6px) scale(1.12);
  }

  .post-card__reaction-option-image {
    width: 30px;
    height: 30px;
  }
}

@keyframes post-reaction-tray-in-mobile {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-card__reaction-tray,
  .post-card__action-btn--reacted .post-card__action-reaction-image {
    animation: none;
  }
}

.post-card__comment-peek {
  position: relative;
  z-index: 2;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 255, 0.05);
}

.post-card__comment-peek-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.post-card__comment-avatar {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e2e8f0;
  font-size: 9px;
  font-weight: 700;
  color: #475569;
  overflow: hidden;
}

.post-card__comment-avatar-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-card__comment-bubble {
  min-width: 0;
  border-radius: 14px;
  background: #f1f5f9;
  padding: 8px 12px;
}

.post-card__comment-author {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
}

.post-card__comment-text {
  font-size: 12.5px;
  line-height: 1.6;
  color: #475569;
  margin-top: 2px;
}

.post-card__comment-more {
  position: relative;
  z-index: 3;
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  margin-left: 36px;
  margin-top: 6px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(0, 0, 255, 0.55);
  background: none;
  border: none;
  padding: 5px 8px;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: color 0.15s ease;
}

.post-card__comment-more > * {
  pointer-events: none;
}

.post-card__comment-more:hover {
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.post-card__comments-full {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Colored post specific styles */
.post-card--colored {
  background: #ffffff;
}

.post-card--colored .post-card__content {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 28px 20px;
}

.post-card--colored .post-card__text {
  font-size: 20px !important;
  font-weight: 700 !important;
  text-align: center !important;
  line-height: 1.6 !important;
  color: inherit !important;
  width: 100%;
}

.post-card--colored .post-card__mention {
  color: #ffffff !important;
  text-decoration: underline;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
</style>
