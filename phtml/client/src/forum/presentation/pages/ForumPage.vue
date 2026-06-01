<!-- English description: Backend-backed forum workspace with forum browsing, thread listing, thread detail, creation, and replies. -->
<template>
  <main class="forum-page">
    <section class="forum-hero surface-card">
      <div class="forum-hero__copy">
        <span class="forum-hero__icon">
          <Icon name="i-ph-chats-circle-duotone" />
        </span>
        <div>
          <p>{{ t("pages.forumPage.heroEyebrow") }}</p>
          <h1>{{ t("pages.forumPage.heroTitle") }}</h1>
          <span>{{ t("pages.forumPage.heroDescription") }}</span>
        </div>
      </div>

      <div class="forum-hero__stats">
        <div>
          <strong>{{ totalForumCount }}</strong>
          <span>{{ t("pages.forumPage.sectionsTitle") }}</span>
        </div>
        <div>
          <strong>{{ totalThreadCount }}</strong>
          <span>{{ t("pages.forumPage.resultsEyebrow") }}</span>
        </div>
      </div>
    </section>

    <nav class="forum-tabs surface-card" aria-label="Forum tabs">
      <button
        v-for="tab in tabItems"
        :key="tab.value"
        class="forum-tab"
        :class="{ 'forum-tab--active': activeTab === tab.value }"
        type="button"
        @click="selectTab(tab.value)"
      >
        <Icon :name="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section class="forum-toolbar surface-card">
      <form class="forum-search" @submit.prevent="syncQuery">
        <UInput
          v-model="search"
          icon="i-ph-magnifying-glass-duotone"
          :placeholder="t('pages.forumPage.searchPlaceholder')"
          class="forum-search__input"
        />
        <UButton type="submit" color="primary" class="forum-icon-button" :aria-label="t('pages.forumPage.searchPlaceholder')">
          <Icon name="i-ph-magnifying-glass-bold" />
        </UButton>
        <UButton v-if="search || activeForumId" type="button" color="neutral" variant="soft" class="forum-reset" @click="resetFilters">
          <Icon name="i-ph-arrow-counter-clockwise-bold" />
          {{ t("pages.forumPage.resetFilters") }}
        </UButton>
      </form>

      <UButton
        v-if="canCreate && forums.length"
        color="primary"
        class="forum-create"
        @click="openCreate"
      >
        <Icon name="i-ph-plus-bold" />
        {{ t("pages.forumPage.createThreadButton") }}
      </UButton>
    </section>

    <UAlert
      v-if="error"
      color="warning"
      variant="soft"
      icon="i-ph-warning-circle-fill"
      :title="String(error.message || error)"
    />

    <section class="forum-layout" :class="`forum-layout--${layoutMode}`">
      <aside v-if="isForumDrilldown && activeTab !== 'my_threads'" class="forum-sidebar surface-card">
        <div class="forum-sidebar__header">
          <p>{{ t("pages.forumPage.sectionsEyebrow") }}</p>
          <h2>{{ t("pages.forumPage.sectionsTitle") }}</h2>
        </div>

        <div v-if="pending && !sections.length" class="forum-sidebar__loading">
          <USkeleton v-for="index in 5" :key="index" class="h-16 rounded-[12px]" />
        </div>

        <div v-else class="forum-section-list">
          <div v-for="section in sections" :key="section.id" class="forum-section">
            <div class="forum-section__heading">
              <h3>{{ section.title }}</h3>
              <span>{{ section.forums.length }}</span>
            </div>
            <p v-if="section.description">{{ section.description }}</p>

            <button
              v-for="forum in section.forums"
              :key="forum.id"
              class="forum-link"
              :class="{ 'forum-link--active': forum.id === activeForumId }"
              type="button"
              @click="selectForum(forum.id)"
            >
              <span class="forum-link__icon">
                <Icon name="i-ph-chat-centered-text-duotone" />
              </span>
              <span class="forum-link__body">
                <strong>{{ forum.title }}</strong>
                <small>{{ forum.posts }} {{ t("pages.forumPage.repliesLabel") }}</small>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <section class="forum-main">
        <div v-if="pending && !sections.length && activeTab !== 'my_threads'" class="forum-list-tab">
          <USkeleton v-for="index in 4" :key="index" class="h-56 rounded-[16px]" />
        </div>

        <div v-else-if="!isForumDrilldown && activeTab !== 'my_threads'" class="forum-list-tab">
          <article v-for="section in sections" :key="section.id" class="forum-section-card surface-card">
            <header>
              <div>
                <p>{{ t("pages.forumPage.sectionsEyebrow") }}</p>
                <h3>{{ section.title }}</h3>
              </div>
              <span>{{ section.forums.length }}</span>
            </header>
            <p v-if="section.description" class="forum-section-card__description">{{ section.description }}</p>
            <div class="forum-section-card__forums">
              <button
                v-for="forum in section.forums"
                :key="forum.id"
                class="forum-list-item"
                type="button"
                @click="selectForum(forum.id)"
              >
                <span class="forum-link__icon">
                  <Icon name="i-ph-chat-centered-text-duotone" />
                </span>
                <span>
                  <strong>{{ forum.title }}</strong>
                  <small>{{ forum.description }}</small>
                </span>
                <em>{{ forum.posts }} {{ t("pages.forumPage.repliesLabel") }}</em>
              </button>
            </div>
          </article>
        </div>

        <div v-else-if="pending && (isForumDrilldown || activeTab === 'my_threads') && !threads.length" class="forum-thread-list">
          <USkeleton v-for="index in 4" :key="index" class="h-40 rounded-[16px]" />
        </div>

        <div v-else-if="(isForumDrilldown || activeTab === 'my_threads') && threads.length" class="forum-thread-list">
          <ForumThreadCard
            v-for="thread in threads"
            :key="thread.id"
            :thread="thread"
            :selected="thread.id === activeThreadId"
            :local-reply-count="0"
            @select="selectThread"
          />

          <div v-if="hasMoreThreads" class="forum-load-more">
            <UButton color="neutral" variant="soft" :loading="loadingMore" @click="loadMoreThreads">
              {{ t("navigation.leftSidebar.showMore") }}
            </UButton>
          </div>
        </div>

        <UCard v-else-if="activeTab === 'my_threads' || activeForumId" class="surface-card forum-empty" :ui="{ body: 'p-8' }">
          <Icon name="i-ph-chat-dots-duotone" />
          <h2>{{ t("pages.forumPage.emptyTitle") }}</h2>
          <p>{{ t("pages.forumPage.emptyDescription") }}</p>
        </UCard>

        <UCard v-else class="surface-card forum-empty" :ui="{ body: 'p-8' }">
          <Icon name="i-ph-list-magnifying-glass-duotone" />
          <h2>{{ t("pages.forumPage.detailEmptyTitle") }}</h2>
          <p>{{ t("pages.forumPage.detailEmptyDescription") }}</p>
        </UCard>
      </section>

      <ForumThreadDetail
        v-if="isThreadDetail"
        class="forum-detail"
        :thread="selectedThread"
        :replies="selectedThread?.replies ?? []"
        :status-label="selectedThread ? t('pages.forumPage.detailStatus', { title: selectedThread.title, count: selectedThread.repliesCount }) : ''"
        :submitting="replying"
        @reply="replyThread"
      />
    </section>

    <CreateThreadModal
      :open="createOpen"
      :forums="forums"
      :default-forum-id="activeForumId || forums[0]?.id"
      :submitting="creating"
      @close="closeCreate"
      @create="createThread"
    />
  </main>
</template>

<script setup lang="ts">
import { useForumPageVM } from "../../application/view-models/useForumPageVM"
import CreateThreadModal from "../components/CreateThreadModal.vue"
import ForumThreadCard from "../components/ForumThreadCard.vue"
import ForumThreadDetail from "../components/ForumThreadDetail.vue"

const { t } = useI18n()
const {
  search,
  createOpen,
  creating,
  replying,
  sections,
  forums,
  activeForumId,
  activeThreadId,
  activeTab,
  isForumDrilldown,
  isThreadDetail,
  activeForum,
  threads,
  selectedThread,
  canCreate,
  hasMoreThreads,
  pending,
  error,
  loadingMore,
  totalForumCount,
  totalThreadCount,
  syncQuery,
  selectTab,
  selectForum,
  selectThread,
  resetFilters,
  openCreate,
  closeCreate,
  createThread,
  replyThread,
  loadMoreThreads,
} = useForumPageVM()

const tabItems = computed(() => [
  { value: "browse" as const, label: t("pages.forumPage.tabForumList"), icon: "i-ph-list-bullets-duotone" },
  { value: "my_threads" as const, label: t("pages.forumPage.tabMyThreads"), icon: "i-ph-user-circle-duotone" },
])

const layoutMode = computed(() => {
  if (activeTab.value === "my_threads") return "my_threads"
  if (isThreadDetail.value) return "thread"
  if (isForumDrilldown.value) return "forum"
  return "root"
})

const mainEyebrow = computed(() => {
  if (activeTab.value === "my_threads") return t("pages.forumPage.tabMyThreads")
  if (isForumDrilldown.value) return activeForum.value?.title || t("pages.forumPage.tabForumDetail")
  return t("pages.forumPage.tabForumList")
})

const mainTitle = computed(() => {
  if (activeTab.value === "my_threads") return t("pages.forumPage.myThreadsTitle")
  if (isForumDrilldown.value) return activeForum.value ? t("pages.forumPage.resultsEyebrow") : t("pages.forumPage.tabForumDetail")
  return t("pages.forumPage.forumListTitle")
})

const mainDescription = computed(() => {
  if (activeTab.value === "my_threads") return t("pages.forumPage.myThreadsDescription")
  if (isForumDrilldown.value) return activeForum.value?.description || t("pages.forumPage.detailEmptyDescription")
  return t("pages.forumPage.forumListDescription")
})
</script>

<style scoped>
.forum-page {
  width: min(100%, 1320px);
  margin: 0 auto;
  padding: 12px 12px 32px;
  display: grid;
  gap: 16px;
}

.forum-hero,
.forum-toolbar,
.forum-tabs {
  padding: 16px;
}

.forum-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.forum-tab {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fafbfe;
  padding: 9px 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.forum-tab svg,
.forum-tab :deep(svg) {
  width: 17px;
  height: 17px;
}

.forum-tab:hover,
.forum-tab--active {
  border-color: rgba(0, 0, 255, 0.18);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.forum-hero {
  display: grid;
  gap: 16px;
}

.forum-hero__copy {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.forum-hero__icon,
.forum-link__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #0000ff;
  background: rgba(0, 0, 255, 0.06);
}

.forum-hero__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.forum-hero__icon svg,
.forum-hero__icon :deep(svg) {
  width: 26px;
  height: 26px;
}

.forum-hero__copy p,
.forum-sidebar__header p,
.forum-main__header p {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.forum-hero__copy h1 {
  margin-top: 4px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.forum-hero__copy span,
.forum-main__header span,
.forum-section p {
  display: block;
  margin-top: 6px;
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
}

.forum-hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.forum-hero__stats div {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #fafbfe;
}

.forum-hero__stats strong {
  display: block;
  color: #0f172a;
  font-size: 22px;
  font-weight: 800;
}

.forum-hero__stats span {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.forum-toolbar,
.forum-search {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forum-search__input {
  width: 100%;
}

.forum-icon-button,
.forum-reset,
.forum-create {
  border-radius: 12px;
}

.forum-icon-button svg,
.forum-icon-button :deep(svg),
.forum-reset svg,
.forum-reset :deep(svg),
.forum-create svg,
.forum-create :deep(svg) {
  width: 16px;
  height: 16px;
}

.forum-layout {
  display: grid;
  gap: 16px;
}

.forum-list-tab {
  display: grid;
  gap: 12px;
}

.forum-section-card {
  padding: 16px;
}

.forum-section-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.forum-section-card header p {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.forum-section-card h3 {
  margin-top: 3px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 800;
}

.forum-section-card header span {
  border-radius: 999px;
  background: #fafbfe;
  padding: 5px 9px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.forum-section-card__description {
  margin-top: 6px;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.forum-section-card__forums {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.forum-list-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.forum-list-item:hover {
  border-color: rgba(0, 0, 255, 0.14);
  background: #fafbfe;
}

.forum-list-item strong,
.forum-list-item small {
  display: block;
}

.forum-list-item strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forum-list-item small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 2px;
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.forum-list-item em {
  grid-column: 2;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.forum-sidebar,
.forum-main__header {
  padding: 16px;
}

.forum-sidebar {
  align-self: start;
}

.forum-sidebar__header h2,
.forum-main__header h2 {
  margin-top: 3px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 800;
}

.forum-sidebar__loading,
.forum-section-list,
.forum-thread-list {
  display: grid;
  gap: 12px;
}

.forum-section {
  display: grid;
  gap: 8px;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid #f1f5f9;
}

.forum-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.forum-section__heading h3 {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.forum-section__heading span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.forum-link {
  display: flex;
  width: 100%;
  gap: 10px;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 10px;
  background: transparent;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.forum-link:hover,
.forum-link--active {
  border-color: rgba(0, 0, 255, 0.12);
  background: #fafbfe;
}

.forum-link__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
}

.forum-link__body {
  min-width: 0;
}

.forum-link__body strong,
.forum-link__body small {
  display: block;
}

.forum-link__body strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forum-link__body small {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.forum-main {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
}

.forum-main__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.forum-count {
  width: fit-content;
}

.forum-load-more {
  display: flex;
  justify-content: center;
}

.forum-empty {
  text-align: center;
}

.forum-empty svg,
.forum-empty :deep(svg) {
  width: 42px;
  height: 42px;
  margin: 0 auto;
  color: #94a3b8;
}

.forum-empty h2 {
  margin-top: 12px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 800;
}

.forum-empty p {
  margin: 8px auto 0;
  max-width: 520px;
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
}

.forum-detail {
  min-width: 0;
}

@media (min-width: 720px) {
  .forum-toolbar,
  .forum-search {
    flex-direction: row;
    align-items: center;
  }

  .forum-search {
    flex: 1;
  }

  .forum-hero {
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: center;
  }

  .forum-list-item {
    grid-template-columns: 38px minmax(0, 1fr) auto;
  }

  .forum-list-item em {
    grid-column: auto;
  }
}

@media (min-width: 1120px) {
  .forum-layout--thread {
    grid-template-columns: 310px minmax(0, 1fr) 360px;
    align-items: start;
  }

  .forum-layout--forum {
    grid-template-columns: 310px minmax(0, 1fr);
    align-items: start;
  }

  .forum-layout--my_threads {
    grid-template-columns: minmax(0, 1fr) 380px;
    align-items: start;
  }

  .forum-layout--root {
    grid-template-columns: minmax(0, 1fr);
  }

  .forum-list-tab {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
