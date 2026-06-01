<!-- Description: Renders the reels route as a fullscreen media viewer with feed-powered reactions, comments, sharing, and save controls. -->
<template>
  <div class="reels-page">
    <!-- Loading State -->
    <div v-if="loading" class="reels-page__status">
      <div class="reels-page__loader">
        <Icon name="i-lucide-loader-2" class="mx-auto h-8 w-8 animate-spin text-white/70" />
        <p class="text-sm font-bold text-white/70">{{ t("pages.reelsPage.playing") }}</p>
      </div>
    </div>

    <!-- Active Reel Content -->
    <div
      v-else-if="activeReel"
      class="reels-page__container"
      @wheel="handleWheel"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- Main Content Area -->
      <main class="reels-page__main">
         <!-- Reel Player Stage -->
         <div class="reels-page__stage">
            <div
              class="reels-page__player-box"
            >
              <template v-if="activeMedia?.type === 'video'">
                <video
                  ref="videoRef"
                  :key="activeReel.id"
                  :src="activeMedia.src"
                  class="reels-page__video"
                  autoplay
                  loop
                  playsinline
                  @timeupdate="updateProgress"
                  @loadedmetadata="onMetadataLoaded"
                  @click="togglePlayPause"
                />

                <!-- Play Overlay -->
                <div v-if="!isPlaying" class="reels-page__play-overlay" @click="togglePlayPause">
                  <Icon name="i-ph-play-fill" class="h-16 w-16 text-white/50" />
                </div>

                <!-- Custom Progress Bar -->
                <div class="reels-page__progress-container" :class="{ 'reels-page__progress-container--visible': !isPlaying }" @click="seek">
                  <div class="reels-page__progress-bar">
                    <div 
                      class="reels-page__progress-fill" 
                      :style="{ width: `${progress}%` }"
                    ></div>
                  </div>
                </div>
              </template>
              <img
                v-else
                :src="activeMedia?.thumb || activeMedia?.src || activeReel.authorAvatarUrl"
                class="reels-page__video"
              >

              <!-- Dark Overlay for better text readability -->
              <div class="reels-page__video-overlay" />

              <!-- Author Info & Caption (Bottom Left of player) -->
              <div class="reels-page__info">
                 <div class="reels-page__author">
                    <img :src="activeReel.authorAvatarUrl" :alt="activeReel.author" class="reels-page__avatar">
                    <div class="reels-page__author-meta">
                       <p class="reels-page__author-name">{{ activeReel.author }}</p>
                    </div>
                 </div>
              </div>
            </div>

            <!-- Interaction Icons (Floating on the right) -->
            <div class="reels-page__actions">
               <div class="reels-page__action-item">
                  <div
                    class="reels-page__action-wrapper"
                    @mouseenter="openPostReactionTray"
                    @mouseleave="closePostReactionTray"
                  >
                    <button
                      class="reels-page__action-btn"
                      :class="{ 'reels-page__action-btn--active': liked }"
                      @click="handlePostReactionButtonClick"
                    >
                       <img v-if="selectedPostReaction" :src="activePostReactionAsset.src" class="h-8 w-8">
                       <Icon v-else name="i-ph-thumbs-up-bold" class="h-8 w-8" />
                       <span class="reels-page__action-label">{{ likesCount }}</span>
                    </button>

                    <!-- Reaction Tray -->
                    <Transition
                      enter-active-class="transition duration-150 ease-out"
                      enter-from-class="opacity-0 translate-y-2 scale-95"
                      enter-to-class="opacity-100 translate-y-0 scale-100"
                      leave-active-class="transition duration-100 ease-in"
                      leave-to-class="opacity-0 translate-y-2 scale-95"
                    >
                      <div v-if="postReactionTrayOpen" class="reels-page__reaction-tray">
                        <button
                          v-for="reaction in postReactionOptions"
                          :key="reaction.value"
                          class="reels-page__reaction-option"
                          type="button"
                          @click="reactToPost(reaction.value)"
                        >
                          <img :src="reaction.src" :alt="reaction.label" class="h-8 w-8 block object-contain">
                        </button>
                      </div>
                    </Transition>
                  </div>
               </div>

               <div class="reels-page__action-item">
                  <button class="reels-page__action-btn" @click="toggleComments">
                     <Icon name="i-ph-chat-circle-bold" class="h-8 w-8" />
                     <span class="reels-page__action-label">{{ activeReel.stats.comments }}</span>
                  </button>
               </div>

               <div class="reels-page__action-item">
                  <button class="reels-page__action-btn" @click="showShare = true">
                     <Icon name="i-ph-share-fat-bold" class="h-8 w-8" />
                     <span class="reels-page__action-label">{{ sharesCount }}</span>
                  </button>
               </div>

               <div class="reels-page__action-item">
                  <button class="reels-page__action-btn" @click="handleMenuAction('save')">
                     <Icon name="i-ph-bookmark-simple-bold" class="h-8 w-8" />
                  </button>
               </div>

               <div class="reels-page__action-item">
                  <button class="reels-page__action-btn" @click="handleMenuAction('report')">
                     <Icon name="i-ph-dots-three-bold" class="h-8 w-8" />
                  </button>
               </div>
            </div>
         </div>
      </main>

      <!-- Share Modal Integration -->
      <FeedShareModal
        :open="showShare"
        :share-url="shareUrl"
        :post="{ author: activeReel.author, text: activeReel.text }"
        @close="showShare = false"
        @shared="handleShared"
      />

      <!-- Comment Bottom Sheet -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showComments" class="reels-page__overlay" @click="showComments = false"></div>
      </Transition>
      <Transition
        enter-active-class="transition duration-400 cubic-bezier(0.33, 1, 0.68, 1)"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div v-if="showComments" class="reels-page__bottom-sheet">
           <div class="reels-page__sheet-handle"></div>
           <header class="reels-page__sheet-header">
              <div class="reels-page__sheet-title">
                 {{ t('pages.watchPage.commentsTitle') }} ({{ activeReel.stats.comments }})
              </div>
              <button class="reels-page__sheet-close" @click="showComments = false">
                 <Icon name="i-ph-x-bold" class="h-5 w-5" />
              </button>
           </header>

           <div class="reels-page__sheet-content scrollbar-hide">
              <div class="reels-page__comments">
                 <FeedCommentList
                    v-if="localComments.length > 0"
                    :comments="localComments"
                    enable-reply
                    enable-reaction
                    :current-user-name="currentAuthUserStore.user?.name"
                    :current-user-avatar-url="currentAuthUserStore.user?.avatarUrl"
                    :comment-action-repository="commentActionRepository"
                 />
                 <div v-else class="reels-page__comments-empty">
                    <Icon name="i-ph-chat-circle-text" class="h-10 w-10 opacity-20" />
                    <p>{{ t('feed.commentList.emptyDescription') }}</p>
                 </div>
              </div>
           </div>

           <footer class="reels-page__sheet-composer">
              <FeedCommentComposer
                 :current-user-name="currentAuthUserStore.user?.name"
                 :current-user-avatar-url="currentAuthUserStore.user?.avatarUrl"
                 :submitting="commenting"
                 @submit="submitComment"
              />
           </footer>
        </div>
      </Transition>
    </div>

    <!-- Empty State -->
    <div v-else class="reels-page__status">
      <div class="reels-page__loader">
        <Icon name="i-ph-film-strip-duotone" class="mx-auto h-8 w-8 text-white/70" />
        <p class="text-base font-black text-white">{{ t("pages.reelsPage.heroTitle") }}</p>
        <p class="max-w-md text-sm leading-6 text-white/70">{{ errorMessage || t("pages.watchPage.emptyDescription") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FeedCommentComposer from "../../../feed/presentation/components/CommentComposer.vue"
import FeedCommentList from "../../../feed/presentation/components/CommentList.vue"
import FeedShareModal from "../../../feed/presentation/components/ShareModal.vue"
import { useReelsPageVM } from "../../application/view-models/useReelsPageVM"

const { t } = useI18n()
const {
  loading,
  errorMessage,
  activeReel,
  activeMedia,
  videoRef,
  isPlaying,
  progress,
  onTouchStart,
  onTouchEnd,
  handleWheel,
  updateProgress,
  onMetadataLoaded,
  togglePlayPause,
  seek,
  currentAuthUserStore,
  showComments,
  showShare,
  liked,
  selectedPostReaction,
  postReactionTrayOpen,
  localComments,
  likesCount,
  sharesCount,
  commenting,
  postReactionOptions,
  activePostReactionAsset,
  shareUrl,
  commentActionRepository,
  openPostReactionTray,
  closePostReactionTray,
  handlePostReactionButtonClick,
  reactToPost,
  submitComment,
  handleShared,
  handleMenuAction,
  toggleComments,
} = useReelsPageVM()

useSeoMeta({
  title: () => t("pages.reelsPage.seoTitle"),
  description: () => t("pages.reelsPage.seoDescription"),
})
</script>

<style scoped>
.reels-page {
  min-height: 100vh;
  background-color: #020617;
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

.reels-page__status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.reels-page__loader {
  padding: 40px 32px;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reels-page__container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.reels-page__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #000;
}

.reels-page__stage {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.reels-page__player-box {
  height: 100vh;
  width: 100%;
  background-color: #000;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reels-page__video {
  width: 100%;
  height: 100%;
}

.reels-page__video-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.8) 100%);
  pointer-events: none;
}

/* Floating Actions on the Right */
.reels-page__actions {
  position: absolute;
  right: 20px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 20;
}

.reels-page__action-item {
  flex-direction: column;
  display: flex;
  align-items: center;
}

.reels-page__action-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reels-page__action-btn {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  justify-content: center;
  /* backdrop-filter: blur(10px); */
  transition: all 0.2s ease;
}

.reels-page__action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.reels-page__action-btn--active {
  color: #3b82f6;
}

.reels-page__action-label {
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}

/* Nav Arrows (Floating far right) */
.reels-page__nav-arrows {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 20;
}

@media (max-width: 1000px) {
  .reels-page__nav-arrows {
     display: none;
  }
}

.reels-page__nav-arrow-btn {
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s ease;
}

.reels-page__nav-arrow-btn:hover:not(:disabled) {
  color: #ffffff;
  transform: scale(1.1);
}

.reels-page__nav-arrow-btn:disabled {
  opacity: 0.1;
}

/* Info Section (Bottom Left) */
.reels-page__info {
  position: absolute;
  left: 20px;
  bottom: 20px;
  right: 80px;
  z-index: 10;
}

.reels-page__author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reels-page__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #ffffff;
}

.reels-page__author-name {
  font-size: 15px;
  font-weight: 700;
}

.reels-page__follow {
  font-weight: 700;
  cursor: pointer;
}

.reels-page__caption {
  font-size: 14px;
  line-height: 1.5;
  color: #ffffff;
  max-width: 100%;
}

/* Bottom Sheet */
.reels-page__overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 40;
}

.reels-page__bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1200px;
  height: 65vh;
  background-color: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
}

.reels-page__sheet-handle {
  width: 40px;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  margin: 12px auto 0;
}

.reels-page__sheet-header {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.reels-page__sheet-title {
  font-size: 16px;
  font-weight: 800;
  color: #000;
}

.reels-page__sheet-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

.reels-page__sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.reels-page__sheet-composer {
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background-color: #f8f9fa;
}

.reels-page__reaction-tray {
  position: absolute;
  bottom: calc(100% + 12px);
  left:-100px;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 8px 16px;
  display: flex;
  gap: 12px;
  width: 280px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 100;
  pointer-events: auto;
  white-space: nowrap;
}

.reels-page__reaction-option {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.reels-page__reaction-option:hover {
  transform: scale(1.4) translateY(-8px);
}

/* Custom Progress Bar Styles */
.reels-page__progress-container {
  position: absolute;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px); /* Fix for mobile safe areas */
  left: 0;
  right: 0;
  height: calc(4px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  z-index: 35;
  transition: all 0.2s;
}

.reels-page__progress-container:hover {
  height: calc(8px + env(safe-area-inset-bottom, 0px));
}

.reels-page__progress-bar {
  width: 100%;
  height: 4px;
  position: relative;
}

.reels-page__progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #ffffff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  transition: width 0.1s linear;
}

.reels-page__play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  z-index: 25;
}

.reels-page__progress-container--visible {
  height: 6px !important;
  opacity: 1 !important;
}
</style>
