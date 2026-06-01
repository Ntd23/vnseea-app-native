<!-- Description: Facebook-style profile page — cover full-width, circular avatar overlapping cover, tab-underline nav, 2-col layout (sidebar left, feed right). -->
<template>
  <div class="profile-page">
    <!-- ── Loading skeleton ──────────────────────────────── -->
    <template v-if="pending">
      <div class="profile-page__hero-skeleton">
        <USkeleton class="profile-page__cover-skeleton" />
        <div class="profile-page__identity-skeleton">
          <USkeleton class="profile-page__avatar-skeleton" />
          <div class="profile-page__identity-lines">
            <USkeleton class="h-8 w-56 max-w-full rounded-full" />
            <USkeleton class="h-5 w-72 max-w-full rounded-full" />
            <USkeleton class="h-5 w-44 max-w-full rounded-full" />
          </div>
          <div class="profile-page__action-skeletons">
            <USkeleton class="h-10 w-40 rounded-full" />
            <USkeleton class="h-10 w-36 rounded-full" />
          </div>
        </div>
        <div class="profile-page__tab-skeletons">
          <USkeleton
            v-for="item in 5"
            :key="`profile-tab-skeleton-${item}`"
            class="h-9 w-24 rounded-full"
          />
        </div>
      </div>
      <div class="profile-page__body profile-page__skeleton-body">
        <main class="profile-page__feed">
          <USkeleton class="h-[82px] w-full rounded-[20px]" />
          <USkeleton class="h-[340px] w-full rounded-[20px]" />
          <USkeleton class="h-[300px] w-full rounded-[20px]" />
        </main>
        <aside class="profile-page__sidebar">
          <USkeleton class="h-[180px] w-full rounded-[20px]" />
          <USkeleton class="h-[260px] w-full rounded-[20px]" />
          <USkeleton class="h-[220px] w-full rounded-[20px]" />
        </aside>
      </div>
    </template>

    <!-- ── Empty / not found ─────────────────────────────── -->
    <template v-else-if="!profile">
      <div class="profile-page__empty">
        <FoundationEmptyState
          icon="i-ph-user-circle-duotone"
          :title="$t('pages.profilePage.emptyTitle')"
          :description="$t('pages.profilePage.emptyDescription')"
        />
      </div>
    </template>

    <!-- ── Main profile ──────────────────────────────────── -->
    <template v-else>
      <!-- HERO ─────────────────────────────────────────── -->
      <div class="profile-page__hero">
        <!-- Cover -->
        <div class="profile-page__cover">
          <img
            v-if="profile.coverImage"
            :src="profile.coverImage"
            :alt="profile.displayName"
            class="profile-page__cover-img"
          >
          <div v-else class="profile-page__cover-placeholder" />
          <div class="profile-page__cover-shade" />
        </div>

        <!-- Identity bar (avatar + name + actions) -->
        <div class="profile-page__identity-bar">
          <!-- Avatar -->
          <div class="profile-page__avatar-wrap">
            <UAvatar
              :src="profile.avatarUrl"
              :text="profile.avatarText"
              class="profile-page__avatar"
              :ui="{
                root: 'rounded-full bg-primary-600',
                fallback: 'text-white font-black text-3xl',
              }"
            />
            <button v-if="profile.isOwner" class="profile-page__avatar-btn" type="button">
              <Icon name="i-ph-camera-plus-duotone" class="h-4 w-4" />
            </button>
          </div>

          <!-- Name + meta -->
          <div class="profile-page__identity-meta">
            <div class="profile-page__name-row">
              <h1 class="text-label-primary">{{ profile.displayName }}</h1>
              <UBadge v-if="profile.verified" color="primary" variant="soft" class="rounded-full px-2.5 py-0.5 text-xs font-bold">
                <Icon name="i-ph-seal-check-fill" class="mr-1 h-3.5 w-3.5" />
                {{ $t("settings.data.fields.verified") }}
              </UBadge>
            </div>
            <!-- Stats chips -->
            <div class="profile-page__stats-row">
              <span
                v-for="stat in profile.stats"
                :key="stat.label"
                class="profile-page__stat-chip"
              >
                <strong>{{ stat.value }}</strong>
                <span class="profile-page__stat-label">{{ stat.label }}</span>
              </span>
            </div>
          </div>

          <!-- Hero actions (right) -->
          <div class="profile-page__hero-actions">
            <UButton
              v-for="action in heroActions"
              :key="action.id"
              :variant="action.variant === 'solid' ? 'solid' : 'soft'"
              :color="'primary'"
              :icon="action.icon"
              :loading="actionPending && action.id === 'follow-profile'"
              class="rounded-full btn-primary"
              @click="runHeroAction(action.id)"
            >
              {{ action.label }}
            </UButton>
          </div>
        </div>

        <!-- Divider -->
        <div class="profile-page__divider" />

        <!-- Tab nav -->
        <nav class="profile-page__tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="profile-page__tab"
            :class="{ 'profile-page__tab--active': activeTab === tab.key }"
            type="button"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
          <!-- More dropdown trigger -->
          <button
            ref="moreTriggerRef"
            class="profile-page__tab profile-page__tab--more"
            :class="{ 'profile-page__tab--active': moreOpen }"
            type="button"
            @click="toggleMore"
          >
            <Icon name="i-ph-dots-three-bold" class="h-4 w-4" />
            {{ $t("navigation.leftSidebar.showMore") }}
          </button>
          <span class="profile-page__tab-scroll-hint" aria-hidden="true">
            <Icon name="i-ph-caret-right-bold" class="h-4 w-4" />
          </span>
        </nav>
      </div>

      <!-- More dropdown (Teleported to body to avoid overflow clipping) -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="moreOpen" class="profile-more-dropdown" :style="moreDropdownStyle">
            <div class="py-1">
              <button class="profile-more-item" type="button" @click="handleMoreAction('poke')">
                <span class="profile-more-icon" style="background:rgba(249,115,22,0.1)">
                  <Icon name="i-ph-hand-pointing-fill" class="h-4 w-4 text-orange-500" />
                </span>
                <div class="min-w-0">
                  <p class="profile-more-label">{{ $t('pages.profilePage.tabs.poke') }}</p>
                  <p class="profile-more-desc">{{ $t('pages.profilePage.tabs.pokeDesc') }}</p>
                </div>
              </button>
              
              <button v-if="profile.isOwner" class="profile-more-item" type="button" @click="handleMoreAction('copy')">
                <span class="profile-more-icon">
                  <Icon name="i-ph-link-bold" class="h-4 w-4" />
                </span>
                <div class="min-w-0">
                  <p class="profile-more-label">{{ $t('pages.profilePage.tabs.copyLink') }}</p>
                  <p class="profile-more-desc">{{ $t('pages.profilePage.tabs.copyLinkDesc') }}</p>
                </div>
              </button>
            </div>

            <div class="profile-more-divider" />
            
            <div class="py-1">
              <!-- Others' profile: Report -->
              <button v-if="!profile.isOwner" class="profile-more-item" type="button" @click="handleMoreAction('report')">
                <span class="profile-more-icon" style="background:rgba(245,158,11,0.1)">
                  <Icon name="i-ph-warning-circle-bold" class="h-4 w-4 text-amber-500" />
                </span>
                <div class="min-w-0">
                  <p class="profile-more-label">{{ $t('pages.profilePage.tabs.report') }}</p>
                  <p class="profile-more-desc">{{ $t('pages.profilePage.tabs.reportDesc') }}</p>
                </div>
              </button>

              <!-- Self profile: Block List -->
              <button v-if="profile.isOwner" class="profile-more-item" type="button" @click="handleMoreAction('blockList')">
                <span class="profile-more-icon" style="background:rgba(220,38,38,0.08)">
                  <Icon name="i-ph-prohibit-bold" class="h-4 w-4 text-red-500" />
                </span>
                <div class="min-w-0">
                  <p class="profile-more-label" style="color:#dc2626">{{ $t('pages.profilePage.tabs.blockList') }}</p>
                  <p class="profile-more-desc">{{ $t('pages.profilePage.tabs.blockListDesc') }}</p>
                </div>
              </button>

              <!-- Others' profile: Block -->
              <button v-else class="profile-more-item" type="button" @click="handleMoreAction('block')">
                <span class="profile-more-icon" style="background:rgba(220,38,38,0.08)">
                  <Icon name="i-ph-prohibit-bold" class="h-4 w-4 text-red-500" />
                </span>
                <div class="min-w-0">
                  <p class="profile-more-label" style="color:#dc2626">{{ $t('pages.profilePage.tabs.block') }}</p>
                  <p class="profile-more-desc">{{ $t('pages.profilePage.tabs.blockDesc') }}</p>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- ── TIMELINE TAB ───────────────────────────────── -->
      <template v-if="activeTab === 'timeline'">
        <div class="profile-page__body">
          <!-- LEFT: feed -->
          <main class="profile-page__feed">
            <!-- Publisher -->
            <FeedPublisherBox v-if="profile.isOwner" />

            <!-- Posts -->
            <div v-if="displayedTimelinePosts.length" class="profile-page__post-stack">
              <FeedPostCard
                v-for="post in displayedTimelinePosts"
                :key="`profile-post-${post.id}`"
                :post="post"
                class="profile-page__post-card"
              />
              <UButton
                v-if="timelineHasMore && !postSearchQuery"
                variant="soft"
                block
                class="btn-primary profile-page__load-more-button rounded-2xl"
                :loading="timelineLoadingMore"
                @click="loadMoreTimelinePosts"
              >
                {{ $t("navigation.leftSidebar.showMore") }}
              </UButton>
            </div>
            <UAlert
              v-else
              color="neutral"
              variant="subtle"
              icon="i-ph-newspaper-clipping-duotone"
              :title="$t('pages.pageDetailPage.feedEmptyTitle')"
              :description="$t('pages.pageDetailPage.feedEmptyDescription')"
              class="rounded-[20px]"
            />
          </main>

          <!-- RIGHT: sidebar (intro / friends / photos) -->
          <aside class="profile-page__sidebar">
            <!-- Intro -->
            <section v-if="profile.intro.length" class="profile-card">
              <div class="profile-card__head">
                <h2 class="profile-card__title">{{ copy.introTitle }}</h2>
                <UButton
                  v-if="profile.isOwner"
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                  @click="runHeroAction('edit-profile')"
                >
                  {{ copy.introAction }}
                </UButton>
              </div>
              <div class="space-y-2.5">
                <div
                  v-for="item in profile.intro"
                  :key="`${item.label}-${item.value}`"
                  class="profile-card__intro-row"
                >
                  <div class="profile-card__intro-icon">
                    <Icon :name="item.icon" class="h-4.5 w-4.5" />
                  </div>
                  <div class="min-w-0">
                    <p class="profile-card__intro-label">{{ item.label }}</p>
                    <p class="profile-card__intro-value">{{ item.value }}</p>
                  </div>
                </div>
              </div>
            </section>

            <section class="profile-card">
              <div class="profile-card__head">
                <h2 class="profile-card__title">{{ $t("pages.profilePage.sidebarSearchPosts") }}</h2>
              </div>
              <UInput
                v-model="postSearchQuery"
                icon="i-ph-magnifying-glass-duotone"
                :placeholder="$t('pages.profilePage.sidebarSearchPosts')"
                class="profile-page__post-search w-full"
              />
            </section>

            <!-- Following -->
            <section v-if="following.length" class="profile-card">
              <div class="profile-card__head">
                <div>
                  <h2 class="profile-card__title">{{ $t("pages.profilePage.stats.following") + ' (' + profile.counts.following + ')' }}</h2>
                </div>
                <UButton
                  variant="ghost"
                  size="xs"
                  class="text-link"
                  @click="activeTab = 'friends'"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div class="profile-card__friend-grid">
                <NuxtLink
                  v-for="friend in following.slice(0, 9)"
                  :key="friend.id"
                  :to="`/@${friend.username}`"
                  class="profile-card__friend-cell"
                >
                  <div class="profile-card__friend-thumb">
                    <img
                      v-if="friend.avatarUrl"
                      :src="friend.avatarUrl"
                      :alt="friend.name"
                      class="profile-card__friend-img"
                    >
                    <span v-else class="profile-card__friend-initials">{{ friend.initials }}</span>
                  </div>
                  <p class="profile-card__friend-name">{{ friend.name }}</p>
                </NuxtLink>
              </div>
            </section>

            <!-- Followers -->
            <section v-if="followers.length" class="profile-card">
              <div class="profile-card__head">
                <div>
                  <h2 class="profile-card__title">{{ $t("pages.pageDetailPage.followStat") + ' (' + profile.counts.followers + ')' }}</h2>
                </div>
                <UButton
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                  @click="activeTab = 'friends'"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div class="profile-card__friend-grid">
                <NuxtLink
                  v-for="friend in followers.slice(0, 9)"
                  :key="friend.id"
                  :to="`/@${friend.username}`"
                  class="profile-card__friend-cell"
                >
                  <div class="profile-card__friend-thumb">
                    <img
                      v-if="friend.avatarUrl"
                      :src="friend.avatarUrl"
                      :alt="friend.name"
                      class="profile-card__friend-img"
                    >
                    <span v-else class="profile-card__friend-initials">{{ friend.initials }}</span>
                  </div>
                  <p class="profile-card__friend-name">{{ friend.name }}</p>
                </NuxtLink>
              </div>
            </section>

            <!-- Photos -->
            <section class="profile-card">
              <div class="profile-card__head">
                <h2 class="profile-card__title">{{ copy.photosTitle }}</h2>
                <UButton
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                  @click="activeTab = 'photos'"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div v-if="photos.length" class="profile-card__media-grid">
                <div
                  v-for="post in photos.slice(0, 6)"
                  :key="post.id"
                  class="profile-card__media-cell"
                >
                  <img
                    v-if="post.mediaItems[0]"
                    :src="post.mediaItems[0].thumb || post.mediaItems[0].src"
                    :alt="post.mediaItems[0].alt || post.author"
                    class="profile-card__media-img"
                  >
                </div>
              </div>
              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                icon="i-ph-images-duotone"
                :title="$t('pages.pageDetailPage.feedEmptyTitle')"
                :description="$t('pages.pageDetailPage.feedEmptyDescription')"
                class="rounded-[16px]"
              />
            </section>

            <section v-if="albums.length" class="profile-card">
              <div class="profile-card__head">
                <h2 class="profile-card__title">{{ copy.albumsTitle }}</h2>
                <UButton
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                  @click="activeTab = 'albums'"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div class="profile-card__media-grid">
                <div
                  v-for="album in albums.slice(0, 6)"
                  :key="album.id"
                  class="profile-card__media-cell"
                >
                  <img
                    v-if="album.coverUrl"
                    :src="album.coverUrl"
                    :alt="album.title"
                    class="profile-card__media-img"
                  >
                  <p class="profile-card__media-title">{{ album.title }}</p>
                </div>
              </div>
            </section>

            <section v-if="likedPages.length" class="profile-card">
              <div class="profile-card__head">
                <div>
                  <h2 class="profile-card__title">{{ $t("pages.profilePage.stats.likes") }}</h2>
                  <p class="profile-card__sub">{{ profile.counts.likes }} {{ $t("pages.profilePage.stats.likes") }}</p>
                </div>
                <UButton
                  to="/liked-pages"
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div class="profile-card__link-list">
                <NuxtLink
                  v-for="page in likedPages.slice(0, 5)"
                  :key="page.id"
                  :to="`/p/${page.slug}`"
                  class="profile-card__link-row"
                >
                  <span class="profile-card__link-dot" :style="{ background: page.accent }" />
                  <span>{{ page.name }}</span>
                </NuxtLink>
              </div>
            </section>

            <section v-if="joinedGroups.length" class="profile-card">
              <div class="profile-card__head">
                <div>
                  <h2 class="profile-card__title">{{ $t("pages.profilePage.stats.groups") }}</h2>
                  <p class="profile-card__sub">{{ profile.counts.groups }} {{ $t("pages.profilePage.stats.groups") }}</p>
                </div>
                <UButton
                  to="/joined_groups"
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div class="profile-card__link-list">
                <NuxtLink
                  v-for="group in joinedGroups.slice(0, 5)"
                  :key="group.id"
                  :to="`/g/${group.slug}`"
                  class="profile-card__link-row"
                >
                  <span class="profile-card__link-dot" :style="{ background: group.accent }" />
                  <span>{{ group.name }}</span>
                </NuxtLink>
              </div>
            </section>

            <section v-if="products.length" class="profile-card">
              <div class="profile-card__head">
                <div>
                  <h2 class="profile-card__title">{{ $t("pages.profilePage.stats.products") + ' (' + profile.counts.products + ')' }}</h2>
                </div>
                <UButton
                  v-if="hasHiddenProducts"
                  variant="ghost"
                  color="primary"
                  size="xs"
                  class="text-link"
                  @click="productsExpanded = true"
                >
                  {{ copy.photosAction }}
                </UButton>
              </div>
              <div class="profile-card__product-grid">
                <NuxtLink
                  v-for="product in visibleProducts"
                  :key="product.id"
                  :to="product.href"
                  class="profile-card__product-cell"
                >
                  <img
                    v-if="product.imageUrl"
                    :src="product.imageUrl"
                    :alt="product.name"
                    class="profile-card__product-img"
                  >
                  <span class="profile-card__product-name">{{ product.name }}</span>
                  <strong class="profile-card__product-price">{{ product.priceLabel }}</strong>
                </NuxtLink>
              </div>
            </section>
          </aside>
        </div>
      </template>

      <!-- ── ABOUT TAB ─────────────────────────────────── -->
      <section v-else-if="activeTab === 'about'" class="profile-page__tab-panel">
        <div v-if="profile.aboutSections.length" class="grid gap-4 lg:grid-cols-2">
          <section
            v-for="section in profile.aboutSections"
            :key="section.title"
            class="profile-card"
          >
            <h3 class="profile-card__title">{{ section.title }}</h3>
            <div class="mt-4 space-y-3">
              <div
                v-for="item in section.items"
                :key="`${item.label}-${item.value}`"
                class="profile-card__intro-row"
              >
                <div class="profile-card__intro-icon">
                  <Icon :name="item.icon" class="h-4.5 w-4.5" />
                </div>
                <div>
                  <p class="profile-card__intro-label">{{ item.label }}</p>
                  <p class="profile-card__intro-value">{{ item.value }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-ph-info-duotone"
          :title="$t('pages.pageDetailPage.feedEmptyTitle')"
          :description="$t('pages.pageDetailPage.feedEmptyDescription')"
          class="rounded-[24px]"
        />
      </section>

      <!-- ── FRIENDS TAB ───────────────────────────────── -->
      <section v-else-if="activeTab === 'friends'" class="profile-page__tab-panel">
        <div class="profile-card profile-page__friends-header">
          <div class="profile-card__head">
            <div>
              <p class="profile-card__eyebrow">{{ copy.friendsTitle }}</p>
              <h2 class="profile-card__title">{{ profile.counts.followers }} {{ copy.friendsTitle }}</h2>
            </div>
            <UButton variant="soft" class="text-link">
              {{ copy.friendsAction }}
            </UButton>
          </div>
        </div>
        <div v-if="friends.length" class="profile-page__friends-grid">
          <NuxtLink
            v-for="friend in friends"
            :key="friend.id"
            :to="`/@${friend.username}`"
            class="profile-page__friend-card"
          >
            <div class="profile-page__friend-avatar">
              <img
                v-if="friend.avatarUrl"
                :src="friend.avatarUrl"
                :alt="friend.name"
                class="profile-page__friend-img"
              >
              <span v-else class="profile-page__friend-initials">{{ friend.initials }}</span>
            </div>
            <div class="profile-page__friend-info">
              <p class="profile-page__friend-name">{{ friend.name }}</p>
              <p class="profile-page__friend-username">@{{ friend.username }}</p>
            </div>
            <Icon name="i-ph-caret-right-bold" class="profile-page__friend-open" />
          </NuxtLink>
        </div>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-ph-users-three-duotone"
          :title="$t('pages.pageDetailPage.feedEmptyTitle')"
          :description="$t('pages.pageDetailPage.feedEmptyDescription')"
          class="rounded-[24px]"
        />
      </section>

      <!-- ── PHOTOS / VIDEOS / OTHER ───────────────────── -->
      <section v-else-if="activeTab === 'photos'" class="profile-page__tab-panel">
        <div class="profile-card">
          <p class="profile-card__eyebrow">{{ copy.photosTitle }}</p>
          <h2 class="profile-card__title">{{ copy.photosTitle }}</h2>
        </div>
        <div v-if="photos.length" class="profile-page__media-posts">
          <FeedPostCard v-for="post in photos" :key="post.id" :post="post" />
        </div>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-ph-images-square-duotone"
          :title="$t('pages.pageDetailPage.feedEmptyTitle')"
          :description="$t('pages.pageDetailPage.feedEmptyDescription')"
          class="rounded-[24px]"
        />
      </section>

      <section v-else-if="activeTab === 'videos'" class="profile-page__tab-panel">
        <div class="profile-card">
          <p class="profile-card__eyebrow">{{ copy.videosTitle }}</p>
          <h2 class="profile-card__title">{{ copy.videosTitle }}</h2>
        </div>
        <div v-if="videos.length" class="profile-page__media-posts">
          <FeedPostCard v-for="post in videos" :key="post.id" :post="post" />
        </div>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-ph-video-camera-duotone"
          :title="$t('pages.pageDetailPage.feedEmptyTitle')"
          :description="$t('pages.pageDetailPage.feedEmptyDescription')"
          class="rounded-[24px]"
        />
      </section>

      <section v-else class="profile-page__tab-panel">
        <div class="profile-card">
          <p class="profile-card__eyebrow">{{ copy.albumsTitle }}</p>
          <h2 class="profile-card__title">{{ copy.albumsTitle }}</h2>
        </div>
        <div v-if="albums.length" class="profile-page__album-grid">
          <article
            v-for="album in albums"
            :key="album.id"
            class="profile-card profile-page__album-card"
          >
            <img
              v-if="album.coverUrl"
              :src="album.coverUrl"
              :alt="album.title"
              class="profile-page__album-cover"
            >
            <h3 class="profile-card__title">{{ album.title }}</h3>
            <p class="profile-card__sub">{{ album.mediaCount }} {{ copy.photosTitle }}</p>
          </article>
        </div>
        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-ph-images-square-duotone"
          :title="$t('pages.pageDetailPage.feedEmptyTitle')"
          :description="$t('pages.pageDetailPage.feedEmptyDescription')"
          class="rounded-[24px]"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import FeedPublisherBox from "../../../feed/presentation/components/FeedPublisherBox.vue"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import { useProfileVM } from "../../application/composables/useProfileVM"

const route = useRoute()

const normalizeProfileUsername = (value: unknown) => {
  const raw = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "")

  try {
    return decodeURIComponent(raw).trim().replace(/^@+/, "")
  } catch {
    return raw.trim().replace(/^@+/, "")
  }
}

const username = computed(() => {
  return normalizeProfileUsername(route.params.username)
})

const {
  activeTab,
  actionPending,
  copy,
  displayedTimelinePosts,
  followers,
  following,
  friends,
  heroActions,
  hasHiddenProducts,
  joinedGroups,
  likedPages,
  albums,
  loadMoreTimelinePosts,
  pending,
  postSearchQuery,
  photos,
  profile,
  products,
  productsExpanded,
  tabs,
  timelineHasMore,
  timelineLoadingMore,
  timelinePosts,
  runHeroAction,
  visibleProducts,
  videos,
} = useProfileVM(username)

// ── More dropdown ──────────────────────────────────────
const moreOpen = ref(false)
const moreTriggerRef = ref<HTMLElement | null>(null)
const moreDropdownStyle = ref<Record<string, string>>({})
const toast = useToast()
const { t } = useI18n()

function toggleMore() {
  if (!moreOpen.value && moreTriggerRef.value) {
    const rect = moreTriggerRef.value.getBoundingClientRect()
    moreDropdownStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 6}px`,
      right: `${window.innerWidth - rect.right}px`,
      'transform-origin': 'top right',
    }
  }
  moreOpen.value = !moreOpen.value
}

function closeMore(e: MouseEvent) {
  if (!moreTriggerRef.value?.contains(e.target as Node)) {
    moreOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMore, true)
  window.addEventListener('scroll', () => { moreOpen.value = false }, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeMore, true)
  window.removeEventListener('scroll', () => { moreOpen.value = false })
})

function handleMoreAction(action: string) {
  moreOpen.value = false

  if (action === 'copy') {
    if (import.meta.client) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.add({ title: t('feed.shareModal.copied'), color: 'success', icon: 'i-ph-check-circle-fill' }))
        .catch(() => toast.add({ title: t('pages.profilePage.tabs.copyLink'), description: window.location.href, color: 'warning', icon: 'i-ph-warning-circle-fill' }))
    }
    return
  }

  if (['poke', 'block', 'report', 'blockList'].includes(action)) {
    // On own profile and poke → navigate to poke list
    if (action === 'poke' && profile.value?.isOwner) {
      navigateTo('/poke')
      return
    }

    // On own profile and blockList → navigate to settings/blocked-users
    if (action === 'blockList' && profile.value?.isOwner) {
      navigateTo('/setting/blocked-users')
      return
    }

    if (actionPending.value) return

    const targetUserId = profile.value?.id
    const targetName = profile.value?.displayName || profile.value?.username || ''
    if (!targetUserId) {
      toast.add({ title: 'Lỗi', description: 'Không tìm thấy người dùng.', color: 'error', icon: 'i-ph-warning-circle-fill' })
      return
    }

    actionPending.value = true

    $fetch('/_api/profile/action', {
      method: 'POST',
      body: { action, userId: targetUserId },
    })
      .then(() => {
        const titleKey = action === 'blockList' ? 'blockList' : action
        const title = t('pages.profilePage.tabs.' + titleKey)
        const descKey = action === 'blockList' ? 'blockSuccess' : action + 'Success'
        const desc = t('pages.profilePage.tabs.' + descKey, { name: targetName })
        const icon = action === 'poke' ? 'i-ph-hand-pointing-fill' : (action === 'block' || action === 'blockList' ? 'i-ph-prohibit-duotone' : 'i-ph-warning-octagon-duotone')

        toast.add({
          title: `✅ ${title}`,
          description: desc,
          color: 'success',
          icon,
        })
      })
      .catch((err: any) => {
        const status: string = err?.data?.statusMessage || ''
        if (status === 'already_poked') {
          toast.add({ title: t('pages.profilePage.tabs.poke'), description: t('pages.profilePage.tabs.pokeAlready'), color: 'warning', icon: 'i-ph-hand-pointing-fill' })
        }
        else {
          toast.add({ title: 'Lỗi', description: 'Không thể thực hiện yêu cầu. Thử lại sau.', color: 'error', icon: 'i-ph-warning-circle-fill' })
        }
      })
      .finally(() => {
        actionPending.value = false
      })
    return
  }

  toast.add({ title: t('pages.profilePage.tabs.' + action), description: 'Tính năng đang phát triển', color: 'primary', icon: 'i-ph-info-bold' })
}
</script>

<style scoped>
/* ── Page shell ───────────────────────────────────────── */
.profile-page {
  min-height: 100vh;
  background: #f0f2f5;
}

/* ── Hero ─────────────────────────────────────────────── */
.profile-page__hero {
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  border-radius: 16px;
}

@media (max-width: 639px) {
  .profile-page__hero {
    overflow: hidden;
    border-bottom-right-radius: 18px;
    border-bottom-left-radius: 18px;
  }
}

/* Cover */
.profile-page__cover {
  position: relative;
  height: 280px;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 56%, #bfdbfe 100%);
}

@media (min-width: 640px) {
  .profile-page__cover { height: 350px; }
}

@media (min-width: 1024px) {
  .profile-page__cover { height: 400px; }
}

.profile-page__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-page__cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 56%, #bfdbfe 100%);
}

.profile-page__cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.15) 0%, transparent 40%);
}

.profile-page__cover-actions {
  position: absolute;
  bottom: 14px;
  right: 14px;
  display: flex;
  gap: 8px;
}

/* Identity bar */
.profile-page__identity-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 0;
  margin-top: -44px;
  position: relative;
  z-index: 1;
}

@media (min-width: 768px) {
  .profile-page__identity-bar {
    flex-direction: row;
    align-items: flex-end;
    margin-top: -28px;
    padding: 0 24px;
    gap: 16px;
  }
}

/* Avatar */
.profile-page__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 168px;
  height: 168px;
}

@media (max-width: 767px) {
  .profile-page__avatar-wrap {
    width: 120px;
    height: 120px;
  }
}

.profile-page__avatar {
  width: 100%;
  height: 100%;
  border: 4px solid #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
  display: block;
}

.profile-page__avatar-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #f0f2f5;
  color: #0f172a;
  cursor: pointer;
  transition: background 0.15s ease;
}

.profile-page__avatar-btn:hover {
  background: #e2e8f0;
}

/* Name + meta */
.profile-page__identity-meta {
  flex: 1;
  min-width: 0;
  padding-bottom: 8px;
}

.profile-page__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.profile-page__display-name {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(18px);
  padding: 6px 16px;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #0f172a;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-page__stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

.profile-page__stat-chip {
  display: inline-flex;
  gap: 4px;
  font-size: 14px;
  color: #475569;
}

.profile-page__stat-chip strong {
  font-weight: 800;
  color: #0f172a;
}

.profile-page__stat-label {
  color: #64748b;
}

/* Hero actions */
.profile-page__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
  margin-top: 4px;
}

@media (min-width: 768px) {
  .profile-page__hero-actions { margin-top: 0; }
}

/* Divider */
.profile-page__divider {
  height: 1px;
  background: #e2e8f0;
  margin: 12px 0 0;
}

/* Tab nav */
.profile-page__tab-nav {
  display: flex;
  overflow-x: auto;
  position: relative;
  scrollbar-width: none;
  padding: 0 16px;
  scroll-padding-inline: 16px;
  scroll-snap-type: x proximity;
}

.profile-page__tab-nav::-webkit-scrollbar { display: none; }

@media (min-width: 640px) {
  .profile-page__tab-nav { padding: 0 24px; }
}

.profile-page__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
  scroll-snap-align: start;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.profile-page__tab:hover {
  background: #f0f2f5;
  border-radius: 8px 8px 0 0;
  color: #0f172a;
}

.profile-page__tab--active {
  color: #0000ff;
  border-bottom-color: #0000ff;
}

.profile-page__tab--more {
  color: #65676b;
  background: transparent;
  box-shadow: none;
}

.profile-page__tab--more:hover {
  background: #f0f2f5;
  color: #0f172a;
}

.profile-page__tab-scroll-hint {
  position: sticky;
  right: -16px;
  z-index: 1;
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: flex-end;
  color: #0000ff;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), #ffffff 48%, #ffffff 100%);
  pointer-events: none;
}

@media (min-width: 768px) {
  .profile-page__tab-scroll-hint {
    display: none;
  }
}

/* ── Body (timeline) ─────────────────────────────────── */
.profile-page__body {
  display: grid;
  gap: 12px;
}

@media (min-width: 1024px) {
  .profile-page__body {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
  }
}

@media (min-width: 1280px) {
  .profile-page__body {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
}

.profile-page__sidebar {
  display: none;
}

@media (min-width: 1024px) {
  .profile-page__sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    order: 2;
    position: sticky;
    top: 68px;
  }
}

.profile-page__feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
}

@media (min-width: 1024px) {
  .profile-page__feed {
    order: 1;
  }
}

.profile-page__post-stack {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
  overflow: visible;
}

.profile-page__post-stack > * {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.profile-page__load-more-button {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.profile-page__load-more-button:hover {
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.profile-page__post-search :deep(input) {
  border-color: #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  box-shadow: none;
}

.profile-page__post-search :deep(input::placeholder) {
  color: #94a3b8;
}

.profile-page__post-search :deep(svg) {
  color: #64748b;
}

.profile-page__post-card {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.profile-page__post-stack :deep(.post-card) {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.profile-page__post-stack :deep(.media-grid__item) {
  max-height: 300px;
  background: #f8fafc;
}

.profile-page__post-stack :deep(.media-grid__img) {
  min-height: 0;
  height: min(300px, 46vw);
  max-height: 300px;
  object-fit: cover;
  background: #f8fafc;
}

.profile-page__post-stack :deep(.media-grid--multi .media-grid__img) {
  height: min(210px, 32vw);
  max-height: 210px;
}

@media (max-width: 639px) {
  .profile-page__post-stack :deep(.media-grid__item) {
    max-height: 280px;
  }

  .profile-page__post-stack :deep(.media-grid__img) {
    height: min(280px, 76vw);
    max-height: 280px;
  }

  .profile-page__post-stack :deep(.media-grid--multi .media-grid__img) {
    height: min(190px, 44vw);
    max-height: 190px;
  }
}

/* ── Tab panel (non-timeline) ────────────────────────── */
.profile-page__tab-panel {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}


/* ── Profile card (reusable) ─────────────────────────── */
.profile-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.profile-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 8px;
}

.profile-card__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 4px;
}

.profile-card__title {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
}

.profile-card__sub {
  font-size: 13px;
  color: #65676b;
  margin: 2px 0 0;
}

/* Intro rows */
.profile-card__intro-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.profile-card__intro-row:last-child {
  border-bottom: none;
}

.profile-card__intro-icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #0000ff;
}

.profile-card__intro-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0;
}

.profile-card__intro-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 2px 0 0;
}

/* Friend cells */
.profile-card__friend-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.profile-card__friend-cell {
  min-width: 0;
  cursor: pointer;
}

.profile-card__friend-thumb {
  display: flex;
  width: 100%;
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  background: #dbeafe;
}

.profile-card__friend-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-card__friend-initials {
  font-size: 18px;
  font-weight: 900;
  color: #1d4ed8;
}

.profile-card__friend-name {
  margin: 5px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.profile-card__media-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.profile-card__media-cell {
  position: relative;
  min-height: 92px;
  overflow: hidden;
  border-radius: 10px;
  background: #f1f5f9;
}

.profile-card__media-img {
  width: 100%;
  height: 100%;
  min-height: 92px;
  object-fit: cover;
  display: block;
}

.profile-card__media-title {
  position: absolute;
  right: 6px;
  bottom: 6px;
  left: 6px;
  margin: 0;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  padding: 4px 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 800;
  color: #ffffff;
}

.profile-card__link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-card__link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  transition: background 0.15s ease;
}

.profile-card__link-row:hover {
  background: #f1f5f9;
}

.profile-card__link-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 999px;
}

.profile-card__product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.profile-card__product-cell {
  display: block;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: #f8fafc;
  color: #0f172a;
}

.profile-card__product-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  background: #f1f5f9;
}

.profile-card__product-name {
  display: block;
  overflow: hidden;
  padding: 8px 8px 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 800;
}

.profile-card__product-price {
  display: block;
  padding: 2px 8px 8px;
  font-size: 12px;
  color: #2563eb;
}

.profile-page__media-posts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-page__friends-header .profile-card__head {
  margin-bottom: 0;
  align-items: center;
}

.profile-page__friends-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .profile-page__friends-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1180px) {
  .profile-page__friends-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.profile-page__friend-card {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 12px;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.profile-page__friend-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
  transform: translateY(-1px);
}

.profile-page__friend-avatar {
  display: flex;
  width: 68px;
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  background: #dbeafe;
}

.profile-page__friend-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-page__friend-initials {
  font-size: 18px;
  font-weight: 800;
  color: #1d4ed8;
}

.profile-page__friend-info {
  min-width: 0;
}

.profile-page__friend-name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.profile-page__friend-username {
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.profile-page__friend-open {
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

@media (min-width: 768px) {
  .profile-page__friend-card {
    grid-template-columns: 88px minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: start;
    padding: 14px;
  }

  .profile-page__friend-avatar {
    grid-row: 1 / span 2;
    width: 88px;
    border-radius: 20px;
  }

  .profile-page__friend-open {
    display: none;
  }

  .profile-page__friend-name {
    font-size: 16px;
  }
}

.profile-page__album-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 640px) {
  .profile-page__album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .profile-page__album-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.profile-page__album-card {
  overflow: hidden;
}

.profile-page__album-cover {
  width: calc(100% + 32px);
  height: 190px;
  margin: -16px -16px 14px;
  object-fit: cover;
  display: block;
  background: #f1f5f9;
}

/* ── Skeletons / Empty ───────────────────────────────── */
.profile-page__hero-skeleton {
  overflow: hidden;
  background: #ffffff;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.profile-page__cover-skeleton {
  height: 280px;
  width: 100%;
}

@media (min-width: 640px) {
  .profile-page__cover-skeleton {
    height: 350px;
  }
}

@media (min-width: 1024px) {
  .profile-page__cover-skeleton {
    height: 400px;
  }
}

.profile-page__identity-skeleton {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  padding: 0 16px 14px;
  margin-top: -44px;
}

.profile-page__avatar-skeleton {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  border: 4px solid #ffffff;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.12);
}

.profile-page__identity-lines,
.profile-page__action-skeletons,
.profile-page__tab-skeletons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.profile-page__tab-skeletons {
  overflow: hidden;
  border-top: 1px solid #e2e8f0;
  padding: 12px 16px;
}

.profile-page__skeleton-body {
  padding-bottom: 16px;
}

@media (min-width: 768px) {
  .profile-page__identity-skeleton {
    grid-template-columns: 168px minmax(0, 1fr) auto;
    align-items: end;
    gap: 16px;
    padding: 0 24px 14px;
    margin-top: -28px;
  }

  .profile-page__avatar-skeleton {
    width: 168px;
    height: 168px;
  }
}

@media (max-width: 639px) {
  .profile-page__hero-skeleton {
    border-bottom-right-radius: 18px;
    border-bottom-left-radius: 18px;
  }

  .profile-page__action-skeletons {
    display: none;
  }
}

.profile-page__empty {
  max-width: 540px;
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  padding: 40px 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  text-align: center;
}
</style>

<style>
/* Non-scoped: dropdown is Teleported to body */
.profile-more-dropdown {
  z-index: 9999;
  width: 268px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 255, 0.08);
  background: #ffffff;
  box-shadow: 0 12px 40px rgba(0, 0, 255, 0.12);
}

.profile-more-divider {
  height: 1px;
  background: rgba(0, 0, 255, 0.06);
}

.profile-more-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.12s ease;
}

.profile-more-item:hover {
  background: rgba(0, 0, 255, 0.03);
}

.profile-more-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 255, 0.05);
  color: rgba(0, 0, 255, 0.6);
  margin-top: 2px;
}

.profile-more-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.profile-more-desc {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  line-height: 1.3;
}
</style>

