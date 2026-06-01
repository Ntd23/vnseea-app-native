<!-- Description: Renders the home feed in PHP order while sourcing stories, announcement, and posts from real backend bridges instead of mock social data. -->
<template>
  <div class="home-feed">
    <div class="home-feed__stories">
      <FeedStoryCarousel :stories="stories" />
    </div>

    <section v-if="announcement?.title || announcement?.message" class="home-feed__section surface-card">
      <div class="home-feed__announcement">
        <div class="home-feed__announcement-icon">
          <Icon name="i-ph-megaphone-simple-duotone" class="h-5 w-5" />
        </div>
        <div class="home-feed__announcement-copy">
          <p class="home-feed__eyebrow">{{ copy.announcementEyebrow }}</p>
          <h2 v-if="announcement.title" class="home-feed__title">{{ announcement.title }}</h2>
          <p v-if="announcement.message" class="home-feed__body">
            {{ announcement.message }}
          </p>
        </div>
      </div>
    </section>

    <div class="home-feed__publisher">
      <FeedPublisherBox @created="handlePostCreated" />
    </div>

    <section class="home-feed__section surface-card home-feed__order-card">
      <div class="home-feed__section-header">
        <div>
          <p class="home-feed__eyebrow">{{ copy.orderEyebrow }}</p>
          <h2 class="home-feed__title">{{ copy.orderTitle }}</h2>
        </div>
      </div>

      <div class="home-feed__order-list">
        <button
          v-for="option in orderOptions"
          :key="option.key"
          class="home-feed__order-button"
          :class="{ 'home-feed__order-button--active': activeOrder === option.key }"
          type="button"
          @click="activeOrder = option.key"
        >
          <span class="font-semibold">{{ option.label }}</span>
          <span class="home-feed__order-description">{{ option.description }}</span>
        </button>
      </div>
    </section>

    <section
      v-if="greeting"
      class="home-feed__section surface-card home-feed__greeting-card"
      :style="{ '--home-feed-greeting-accent': greeting.accent }"
    >
      <div class="home-feed__greeting">
        <div class="home-feed__greeting-copy">
          <p class="home-feed__eyebrow">{{ copy.greetingEyebrow }}</p>
          <h2 class="home-feed__title">{{ greeting.title }}</h2>
        </div>
        <p class="home-feed__body">{{ greeting.message }}</p>
        <NuxtImg
          v-if="greeting.imageUrl"
          :src="greeting.imageUrl"
          :alt="greeting.title"
          class="home-feed__greeting-image"
          sizes="42px"
          loading="lazy"
        />
      </div>
    </section>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="newPostsCount > 0" class="home-feed__new-posts">
        <button class="home-feed__new-posts-btn" type="button" @click="loadNewPosts">
          <Icon name="i-ph-arrow-up-bold" class="h-4 w-4" />
          <span>{{ t("pages.homeFeedPage.newPostsButton", { count: newPostsCount }) }}</span>
        </button>
      </div>
    </Transition>

    <div class="home-feed__posts">
      <FeedPostCard
        v-for="post in visiblePosts"
        :key="post.id"
        :post="post"
        @deleted="removePost"
        @hidden="removePost"
      />
    </div>

    <div class="home-feed__load-more">
      <button
        v-if="!allLoaded"
        class="home-feed__load-more-btn"
        :disabled="loadingMore"
        type="button"
        @click="loadMore"
        >
        <Icon v-if="loadingMore" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
        <Icon v-else name="i-ph-arrow-down-bold" class="h-4 w-4" />
        <span>{{ loadingMore ? t("pages.homeFeedPage.loadingMore") : t("pages.homeFeedPage.loadMore") }}</span>
      </button>
      <p v-else class="home-feed__all-loaded">{{ t("pages.homeFeedPage.allCaughtUp") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import FeedPostCard from "../components/PostCard.vue"
import FeedPublisherBox from "../components/FeedPublisherBox.vue"
import FeedStoryCarousel from "../components/StoryCarousel.vue"
import { useHomeFeedPageVM } from "../../application/view-models/useHomeFeedPageVM"

const { t } = useI18n()
const {
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
} = useHomeFeedPageVM()

await initialize()
</script>

<style scoped>
.home-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.home-feed__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-color: var(--border-light);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  box-shadow: var(--shadow-md);
  padding: var(--space-4);
}

.home-feed__section-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.home-feed__eyebrow {
  font-size: var(--text-label);
  font-weight: var(--weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.home-feed__title {
  font-family: var(--font-secondary);
  font-size: var(--text-heading);
  font-weight: var(--weight-bold);
  line-height: var(--leading-tight);
  color: var(--text-primary);
}

.home-feed__hint,
.home-feed__body,
.home-feed__order-description,
.home-feed__all-loaded {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.home-feed__order-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.home-feed__order-button,
.home-feed__new-posts-btn,
.home-feed__load-more-btn {
  transition: all 0.2s ease;
}

.home-feed__announcement {
  display: flex;
  gap: var(--space-3);
}

.home-feed__announcement-icon {
  display: flex;
  height: 40px;
  width: 40px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--bg-surface-active);
  color: var(--icon-brand);
}

.home-feed__announcement-copy,
.home-feed__greeting {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.home-feed__greeting-card {
  border-left: 4px solid var(--home-feed-greeting-accent, var(--border-strong));
}

.home-feed__greeting {
  position: relative;
  min-height: 64px;
  padding-right: 58px;
}

.home-feed__greeting-image {
  position: absolute;
  right: 0;
  top: 50%;
  width: 42px;
  height: 42px;
  transform: translateY(-50%);
  object-fit: contain;
}

.home-feed__order-card {
  display: none;
}

.home-feed__order-button {
  display: flex;
  min-width: 220px;
  flex: 1 1 220px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: var(--bg-muted);
  padding: 12px 14px;
  color: var(--text-primary);
  text-align: left;
}

.home-feed__order-button--active {
  border-color: var(--border-strong);
  background: var(--bg-surface-active);
}

.home-feed__new-posts,
.home-feed__load-more {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
}

.home-feed__new-posts-btn {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  padding: 8px 18px;
  color: var(--text-link);
  font-size: var(--text-caption);
  font-weight: var(--weight-bold);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  box-shadow: var(--shadow-md);
}

.home-feed__new-posts-btn > *,
.home-feed__load-more-btn > * {
  pointer-events: none;
}

.home-feed__new-posts-btn:hover,
.home-feed__load-more-btn:hover {
  transform: translateY(-1px);
}

.home-feed__posts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.home-feed__load-more {
  padding: 8px 0 24px;
}

.home-feed__load-more-btn {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: var(--bg-surface);
  padding: 10px 22px;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: var(--weight-bold);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.home-feed__load-more-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 767px) {
  .home-feed__order-card {
    display: flex;
  }
}
</style>
