<!-- Description: Community page detail — Facebook-style cover, circular avatar overlap, tab-underline nav, 2-col body. Mirrors ProfilePage layout. -->
<template>
  <div class="page-detail">
    <!-- ── Loading skeleton ──────────────────────────────── -->
    <template v-if="status === 'pending' && !page">
      <div class="page-detail__hero-skeleton">
        <USkeleton class="page-detail__cover-skeleton" />
        <div class="page-detail__identity-skeleton">
          <USkeleton class="page-detail__avatar-skeleton" />
          <div class="page-detail__identity-lines">
            <USkeleton class="h-8 w-56 max-w-full rounded-full" />
            <USkeleton class="h-5 w-72 max-w-full rounded-full" />
            <USkeleton class="h-5 w-44 max-w-full rounded-full" />
          </div>
          <div class="page-detail__action-skeletons">
            <USkeleton class="h-10 w-36 rounded-full" />
            <USkeleton class="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div class="page-detail__tab-skeletons">
          <USkeleton v-for="i in 3" :key="i" class="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div class="page-detail__body page-detail__skeleton-body">
        <main class="page-detail__feed">
          <USkeleton class="h-[82px] w-full rounded-[20px]" />
          <USkeleton class="h-[340px] w-full rounded-[20px]" />
          <USkeleton class="h-[300px] w-full rounded-[20px]" />
        </main>
        <aside class="page-detail__sidebar">
          <USkeleton class="h-[180px] w-full rounded-[20px]" />
          <USkeleton class="h-[220px] w-full rounded-[20px]" />
        </aside>
      </div>
    </template>

    <!-- ── Empty / not found ─────────────────────────────── -->
    <template v-else-if="!page">
      <div class="page-detail__empty">
        <FoundationEmptyState
          icon="i-ph-megaphone-simple-duotone"
          :title="t('pages.pageDetailPage.emptyTitle')"
          :description="t('pages.pageDetailPage.emptyDescription')"
        />
        <div class="mt-6 flex justify-center">
          <UButton
            :to="appRoutes.createPage"
            color="primary"
            variant="solid"
            size="xl"
            class="rounded-[16px] px-5 text-[14px] font-extrabold"
          >
            {{ t('pages.pageDetailPage.createNewPage') }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- ── Main content ──────────────────────────────────── -->
    <template v-else>
      <!-- HERO -->
      <div class="page-detail__hero" :class="{ 'opacity-60 pointer-events-none': status === 'pending' }">
        <!-- Cover -->
        <div class="page-detail__cover">
          <div class="page-detail__cover-backdrop" :style="{ background: page.banner }" />
          <div class="page-detail__cover-shade" />
        </div>

        <!-- Identity bar -->
        <div class="page-detail__identity-bar">
          <!-- Avatar -->
          <div class="page-detail__avatar-wrap">
            <div class="page-detail__avatar" :style="{ background: page.accent }">
              <img
                v-if="page.avatarUrl"
                :src="page.avatarUrl"
                :alt="pageName"
                class="page-detail__avatar-img"
              >
              <span v-else class="page-detail__avatar-initials">{{ avatarLabel }}</span>
            </div>
          </div>

          <!-- Name + stats -->
          <div class="page-detail__identity-meta">
            <div class="page-detail__name-row">
              <h1 class="page-detail__display-name">{{ pageName }}</h1>
              <UBadge v-if="page.canManage" color="primary" variant="soft" class="rounded-full px-2.5 py-0.5 text-xs font-bold">
                <Icon name="i-ph-flag-fill" class="mr-1 h-3 w-3" />
                Owner
              </UBadge>
            </div>
            <div class="page-detail__stats-row">
              <span class="page-detail__stat-chip">
                <strong>{{ page.followers }}</strong>
                <span class="page-detail__stat-label">{{ t('pages.pageDetailPage.followStat') }}</span>
              </span>
              <span class="page-detail__stat-chip">
                <strong>{{ page.likes }}</strong>
                <span class="page-detail__stat-label">{{ t('pages.pageDetailPage.likeStat') }}</span>
              </span>
              <span v-if="locationLabel" class="page-detail__stat-chip">
                <Icon name="i-ph-map-pin-duotone" class="h-3.5 w-3.5" />
                <span class="page-detail__stat-label">{{ locationLabel }}</span>
              </span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="page-detail__hero-actions">
            <!-- Owner: chỉ hiện Chia sẻ + Cài đặt -->
            <template v-if="page.canManage">
              <UButton
                color="white"
                variant="solid"
                class="rounded-full shadow-sm"
                @click="inviteVM.openModal()"
              >
                <Icon name="i-ph-envelope-simple-duotone" class="mr-1.5 h-4 w-4" />
                Mời bạn bè
              </UButton>
              <UButton
                color="neutral"
                variant="soft"
                class="rounded-full"
                @click="showShare = true"
              >
                <Icon name="i-ph-paper-plane-tilt-bold" class="mr-1.5 h-4 w-4" />
                {{ t('pages.pageDetailPage.shareButton') }}
              </UButton>
              <UButton
                :to="pageSettingsTo"
                color="primary"
                variant="solid"
                class="rounded-full"
              >
                <Icon name="i-ph-gear-six-duotone" class="mr-1.5 h-4 w-4" />
                {{ t('pages.pageDetailPage.settingsButton') }}
              </UButton>
            </template>

            <!-- Visitor: Theo dõi + Thích + Chia sẻ -->
            <template v-else>
              <UButton
                color="primary"
                :variant="isFollowing ? 'soft' : 'solid'"
                class="rounded-full"
                :loading="followPending"
                @click="handleFollowPage"
              >
                <Icon
                  :name="isFollowing ? 'i-ph-bell-ringing-fill' : 'i-ph-bell-simple-ringing-bold'"
                  class="mr-1.5 h-4 w-4"
                  :class="isFollowing ? 'text-primary-500' : ''"
                />
                {{ isFollowing ? t('pages.pageDetailPage.followingButton') : t('pages.pageDetailPage.followFallback') }}
              </UButton>
              <UButton
                color="primary"
                :variant="isLiked ? 'soft' : 'outline'"
                class="rounded-full"
                :loading="likePending"
                @click="handleLikePage"
              >
                <Icon
                  :name="isLiked ? 'i-ph-thumbs-up-fill' : 'i-ph-thumbs-up-bold'"
                  class="mr-1.5 h-4 w-4"
                  :class="isLiked ? 'text-primary-500' : ''"
                />
                {{ isLiked ? t('pages.pageDetailPage.likedButton') : t('pages.pageDetailPage.likeButton') }}
              </UButton>
              <UButton
                color="neutral"
                variant="soft"
                class="rounded-full"
                @click="showShare = true"
              >
                <Icon name="i-ph-paper-plane-tilt-bold" class="mr-1.5 h-4 w-4" />
                {{ t('pages.pageDetailPage.shareButton') }}
              </UButton>
            </template>
          </div>
        </div>

        <!-- Divider -->
        <div class="page-detail__divider" />

        <!-- Tab nav -->
        <nav class="page-detail__tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="page-detail__tab"
            :class="{ 'page-detail__tab--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- BODY -->
      <div class="page-detail__body" :class="{ 'mt-8': inviteVM.isOpen.value }">
        <!-- Main feed -->
        <main class="page-detail__feed">
          <template v-if="activeTab === 'posts'">
            <PageInviteModal
              v-if="inviteVM.isOpen.value"
              :is-open="inviteVM.isOpen.value"
              :is-pending="inviteVM.isPending.value"
              :search-query="inviteVM.searchQuery.value"
              :visible-candidates="inviteVM.visibleCandidates.value"
              :invited-ids="inviteVM.invitedIds.value"
              @update:search-query="inviteVM.searchQuery.value = $event"
              @close="inviteVM.closeModal()"
              @invite="inviteVM.sendInvite"
            />
            <FeedPublisherBox v-else :page-id="page.id" @created="handlePostCreated" />
            <div v-if="!inviteVM.isOpen.value">
              <div v-if="pagePosts.length" class="page-detail__post-stack">
                <FeedPostCard
                  v-for="post in pagePosts"
                  :key="post.id"
                  :post="post"
                />
              </div>
              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                icon="i-ph-newspaper-clipping-duotone"
                :title="t('pages.pageDetailPage.feedEmptyTitle')"
                :description="t('pages.pageDetailPage.feedEmptyDescription')"
                class="rounded-[20px]"
              />
            </div>
          </template>

          <template v-else-if="activeTab === 'reels'">
            <section class="page-detail__tab-panel">
              <div class="profile-card">
                <div class="profile-card__head">
                  <h2 class="profile-card__title">{{ t('pages.pageDetailPage.reelsTitle') }}</h2>
                </div>
              </div>
              <div v-if="pageVideoPosts.length" class="page-detail__post-stack">
                <FeedPostCard
                  v-for="post in pageVideoPosts"
                  :key="`page-reel-${post.id}`"
                  :post="post"
                />
              </div>
              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                icon="i-ph-video-camera-duotone"
                :title="t('pages.pageDetailPage.reelsEmptyTitle')"
                :description="t('pages.pageDetailPage.reelsEmptyDescription')"
                class="rounded-[20px]"
              />
            </section>
          </template>

          <template v-else-if="activeTab === 'photos'">
            <section class="page-detail__tab-panel">
              <div class="profile-card">
                <div class="profile-card__head">
                  <h2 class="profile-card__title">{{ t('pages.pageDetailPage.photosTitle') }}</h2>
                </div>
              </div>
              <div v-if="pagePhotoPosts.length" class="page-detail__post-stack">
                <FeedPostCard
                  v-for="post in pagePhotoPosts"
                  :key="`page-photo-${post.id}`"
                  :post="post"
                />
              </div>
              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                icon="i-ph-images-square-duotone"
                :title="t('pages.pageDetailPage.photosEmptyTitle')"
                :description="t('pages.pageDetailPage.photosEmptyDescription')"
                class="rounded-[20px]"
              />
            </section>
          </template>

          <template v-else-if="activeTab === 'followers'">
            <section class="page-detail__tab-panel">
              <div class="profile-card page-detail__followers-header">
                <div class="profile-card__head">
                  <div>
                    <h2 class="profile-card__title">{{ t('pages.pageDetailPage.followers.title') }}</h2>
                    <p class="page-detail__followers-count">{{ t('pages.pageDetailPage.followers.count', { count: page.followers }) }}</p>
                  </div>
                </div>
                <UInput
                  v-model="followerSearchQuery"
                  icon="i-ph-magnifying-glass-duotone"
                  :placeholder="t('pages.pageDetailPage.followers.searchPlaceholder')"
                  class="page-detail__followers-search"
                />
              </div>

              <div v-if="pageFollowersStatus === 'pending'" class="page-detail__followers-list">
                <USkeleton v-for="item in 4" :key="`page-follower-skeleton-${item}`" class="h-[92px] rounded-[18px]" />
              </div>
              <div v-else-if="visiblePageFollowers.length" class="page-detail__followers-list">
                <article
                  v-for="follower in visiblePageFollowers"
                  :key="follower.id"
                  class="page-detail__follower-card"
                >
                  <NuxtLink :to="`/@${follower.username}`" class="page-detail__follower-main">
                    <div class="page-detail__follower-avatar">
                      <img
                        v-if="follower.avatarUrl"
                        :src="follower.avatarUrl"
                        :alt="follower.name"
                        class="page-detail__follower-img"
                      >
                      <span v-else class="page-detail__follower-initials">{{ follower.name.slice(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="page-detail__follower-info">
                      <p class="page-detail__follower-name">
                        {{ follower.name }}
                        <Icon v-if="follower.verified" name="i-ph-seal-check-fill" class="page-detail__follower-verified" />
                      </p>
                      <p class="page-detail__follower-username">@{{ follower.username }}</p>
                    </div>
                  </NuxtLink>
                  <UButton
                    :color="follower.isFriend ? 'primary' : 'neutral'"
                    :variant="follower.isFriend ? 'solid' : 'soft'"
                    :icon="follower.isFriend ? 'i-ph-chat-circle-text-duotone' : 'i-ph-user-plus-duotone'"
                    class="page-detail__follower-action rounded-full"
                    :loading="followerActionPending === follower.id"
                    :disabled="follower.isRequested"
                    @click="handleFollowerAction(follower.id, follower.isFriend, follower.username)"
                  >
                    {{ follower.isFriend ? t('pages.pageDetailPage.followers.messageButton') : (follower.isRequested ? t('pages.pageDetailPage.followers.requestedButton') : t('pages.pageDetailPage.followers.addFriendButton')) }}
                  </UButton>
                </article>
              </div>
              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                icon="i-ph-users-three-duotone"
                :title="t('pages.pageDetailPage.followers.emptyTitle')"
                :description="t('pages.pageDetailPage.followers.emptyDescription')"
                class="rounded-[20px]"
              />
            </section>
          </template>

          <template v-else>
            <section class="profile-card">
              <div class="profile-card__head">
                <h2 class="profile-card__title">{{ t('pages.pageDetailPage.aboutEyebrow') }}</h2>
              </div>
              <p v-if="pageSummary" class="mt-2 text-sm text-slate-600 leading-relaxed">{{ pageSummary }}</p>
              <div class="mt-4 space-y-3">
                <div v-if="categoryLabel" class="profile-card__intro-row">
                  <div class="profile-card__intro-icon"><Icon name="i-ph-tag-duotone" class="h-4.5 w-4.5" /></div>
                  <div><p class="profile-card__intro-value">{{ categoryLabel }}</p></div>
                </div>
                <div v-if="locationLabel" class="profile-card__intro-row">
                  <div class="profile-card__intro-icon"><Icon name="i-ph-map-pin-duotone" class="h-4.5 w-4.5" /></div>
                  <div><p class="profile-card__intro-value">{{ locationLabel }}</p></div>
                </div>
                <div v-if="foundedLabel" class="profile-card__intro-row">
                  <div class="profile-card__intro-icon"><Icon name="i-ph-calendar-duotone" class="h-4.5 w-4.5" /></div>
                  <div><p class="profile-card__intro-value">{{ foundedLabel }}</p></div>
                </div>
                <div v-if="responseLabel" class="profile-card__intro-row">
                  <div class="profile-card__intro-icon"><Icon name="i-ph-phone-duotone" class="h-4.5 w-4.5" /></div>
                  <div><p class="profile-card__intro-value">{{ responseLabel }}</p></div>
                </div>
              </div>
            </section>
          </template>
        </main>

        <!-- Sidebar -->
        <aside class="page-detail__sidebar">
          <section class="profile-card">
            <div class="profile-card__head">
              <h2 class="profile-card__title">{{ t('pages.pageDetailPage.aboutEyebrow') }}</h2>
            </div>
            <p v-if="pageSummary" class="mt-2 text-sm text-slate-600 leading-relaxed">{{ pageSummary }}</p>
            <div class="mt-4 space-y-3">
              <div v-if="categoryLabel" class="profile-card__intro-row">
                <div class="profile-card__intro-icon"><Icon name="i-ph-tag-duotone" class="h-4.5 w-4.5" /></div>
                <div><p class="profile-card__intro-value">{{ categoryLabel }}</p></div>
              </div>
              <div v-if="locationLabel" class="profile-card__intro-row">
                <div class="profile-card__intro-icon"><Icon name="i-ph-map-pin-duotone" class="h-4.5 w-4.5" /></div>
                <div><p class="profile-card__intro-value">{{ locationLabel }}</p></div>
              </div>
              <div v-if="foundedLabel" class="profile-card__intro-row">
                <div class="profile-card__intro-icon"><Icon name="i-ph-calendar-duotone" class="h-4.5 w-4.5" /></div>
                <div><p class="profile-card__intro-value">{{ foundedLabel }}</p></div>
              </div>
              <div v-if="responseLabel" class="profile-card__intro-row">
                <div class="profile-card__intro-icon"><Icon name="i-ph-phone-duotone" class="h-4.5 w-4.5" /></div>
                <div><p class="profile-card__intro-value">{{ responseLabel }}</p></div>
              </div>
            </div>
          </section>

          <section class="profile-card">
            <div class="profile-card__head">
              <h2 class="profile-card__title">{{ t('pages.pageDetailPage.interactionTitle') }}</h2>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <div class="page-detail__metric">
                <span>{{ t('pages.pageDetailPage.followStat') }}</span>
                <strong>{{ page.followers }}</strong>
              </div>
              <div class="page-detail__metric">
                <span>{{ t('pages.pageDetailPage.likeStat') }}</span>
                <strong>{{ page.likes }}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>

  <FeedShareModal
    :open="showShare"
    :post="{ author: pageName, text: pageSummary || '' }"
    @close="showShare = false"
  />
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import FeedPublisherBox from "../../../feed/presentation/components/FeedPublisherBox.vue"
import FeedShareModal from "../../../feed/presentation/components/ShareModal.vue"
import PageInviteModal from "../components/PageInviteModal.vue"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { getCommunityPageSettingsPath } from "../../domain/services/community-helpers.service"
import { useCommunityPageDetailPageVM } from "../../application/view-models/useCommunityPageDetailPageVM"
import { useCommunityPageInviteVM } from "../../application/view-models/useCommunityPageInviteVM"

const { t } = useI18n()
const {
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
  pageName,
  pageSummary,
  isFollowing,
  isLiked,
  avatarLabel,
  pageVideoPosts,
  pagePhotoPosts,
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
} = useCommunityPageDetailPageVM()

const inviteVM = useCommunityPageInviteVM(() => page.value?.slug || '')
const showShare = ref(false)

const pageSettingsTo = computed(() => page.value ? getCommunityPageSettingsPath(page.value.slug) : '')

function handlePostCreated() {
  refreshPagePosts()
}
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────── */
.page-detail {
  min-height: 100vh;
  background: #f0f2f5;
}

/* ── Hero ────────────────────────────────────────────── */
.page-detail__hero {
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
}

/* Cover */
.page-detail__cover {
  position: relative;
  height: 280px;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 56%, #bfdbfe 100%);
}

@media (min-width: 640px) { .page-detail__cover { height: 350px; } }
@media (min-width: 1024px) { .page-detail__cover { height: 400px; } }

.page-detail__cover-backdrop {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.page-detail__cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.18) 0%, transparent 42%);
}

.page-detail__cover-actions {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  z-index: 2;
}

.page-detail__manage-link {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 14px;
  height: 32px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  text-decoration: none;
  backdrop-filter: blur(4px);
  transition: background 0.15s;
}

.page-detail__manage-link:hover { background: #ffffff; }

/* Identity bar */
.page-detail__identity-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 0;
  margin-top: -44px;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .page-detail__identity-bar {
    flex-direction: row;
    align-items: flex-end;
    margin-top: -28px;
    padding: 0 24px;
    gap: 16px;
  }
}

/* Avatar */
.page-detail__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 168px;
  height: 168px;
}

@media (max-width: 767px) {
  .page-detail__avatar-wrap { width: 120px; height: 120px; }
}

.page-detail__avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.page-detail__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.page-detail__avatar-initials {
  color: #ffffff;
  font-size: 2.5rem;
  font-weight: 900;
}

/* Name + meta */
.page-detail__identity-meta {
  flex: 1;
  min-width: 0;
  padding-bottom: 8px;
}

.page-detail__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.page-detail__display-name {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border-radius: 999px;
  padding: 6px 2px;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #0f172a;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-detail__stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  margin-left: 2px;
}

.page-detail__stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #475569;
}

.page-detail__stat-chip strong {
  font-weight: 800;
  color: #0f172a;
}

.page-detail__stat-label { color: #64748b; }

/* Hero actions */
.page-detail__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
  margin-top: 4px;
}

@media (min-width: 768px) { .page-detail__hero-actions { margin-top: 0; } }

/* Divider */
.page-detail__divider {
  height: 1px;
  background: #e2e8f0;
  margin: 12px 0 0;
}

/* Tab nav */
.page-detail__tab-nav {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 16px;
}

.page-detail__tab-nav::-webkit-scrollbar { display: none; }

@media (min-width: 640px) { .page-detail__tab-nav { padding: 0 24px; } }

.page-detail__tab {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 700;
  color: #65676b;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.page-detail__tab:hover {
  background: #f0f2f5;
  border-radius: 8px 8px 0 0;
  color: #0f172a;
}

.page-detail__tab--active {
  color: #0000ff;
  border-bottom-color: #0000ff;
}

/* ── Body ────────────────────────────────────────────── */
.page-detail__body {
  display: grid;
  gap: 12px;
}

@media (min-width: 1024px) {
  .page-detail__body {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
  }
}

@media (min-width: 1280px) {
  .page-detail__body { grid-template-columns: minmax(0, 1fr) 380px; }
}

.page-detail__sidebar { display: none; }

@media (min-width: 1024px) {
  .page-detail__sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    order: 2;
    position: sticky;
    top: 68px;
  }
}

.page-detail__feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
  order: 1;
}

.page-detail__post-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-detail__tab-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-detail__followers-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-detail__followers-count {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.page-detail__followers-search :deep(input) {
  border-color: #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  box-shadow: none;
}

.page-detail__followers-list {
  display: grid;
  gap: 12px;
}

@media (min-width: 768px) {
  .page-detail__followers-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.page-detail__follower-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.page-detail__follower-main {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.page-detail__follower-avatar {
  display: flex;
  width: 56px;
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 16px;
  background: #dbeafe;
}

.page-detail__follower-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.page-detail__follower-initials {
  color: #1d4ed8;
  font-size: 16px;
  font-weight: 900;
}

.page-detail__follower-info {
  min-width: 0;
}

.page-detail__follower-name {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-detail__follower-verified {
  flex-shrink: 0;
  color: #0000ff;
}

.page-detail__follower-username {
  margin: 3px 0 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-detail__follower-action {
  justify-self: end;
}

@media (max-width: 520px) {
  .page-detail__follower-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .page-detail__follower-action {
    justify-self: stretch;
  }
}

/* Metric cards */
.page-detail__metric {
  border-radius: 14px;
  background: #f6f8ff;
  padding: 12px;
}

.page-detail__metric span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-detail__metric strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 900;
}

/* ── Shared profile-card styles (mirrors ProfilePage) ── */
.profile-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.profile-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.profile-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.profile-card__intro-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-card__intro-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
}

.profile-card__intro-value {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* ── Empty ───────────────────────────────────────────── */
.page-detail__empty {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 16px;
  text-align: center;
}

/* ── Skeleton ────────────────────────────────────────── */
.page-detail__hero-skeleton {
  background: #ffffff;
  margin-bottom: 12px;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
}

.page-detail__cover-skeleton {
  width: 100%;
  height: 280px;
}

@media (min-width: 640px) { .page-detail__cover-skeleton { height: 350px; } }

.page-detail__identity-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px;
  margin-top: -44px;
}

@media (min-width: 768px) {
  .page-detail__identity-skeleton {
    flex-direction: row;
    align-items: flex-end;
    margin-top: -28px;
  }
}

.page-detail__avatar-skeleton {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #ffffff;
}

@media (min-width: 768px) {
  .page-detail__avatar-skeleton { width: 168px; height: 168px; }
}

.page-detail__identity-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 8px;
}

.page-detail__action-skeletons {
  display: flex;
  gap: 8px;
  padding-bottom: 8px;
}

.page-detail__tab-skeletons {
  display: flex;
  gap: 8px;
  padding: 16px;
}

.page-detail__skeleton-body {
  display: grid;
  gap: 12px;
  padding: 0 8px;
}

@media (min-width: 1024px) {
  .page-detail__skeleton-body {
    grid-template-columns: minmax(0, 1fr) 360px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
  }
}
</style>
