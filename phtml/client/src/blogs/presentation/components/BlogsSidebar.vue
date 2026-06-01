<template>
  <aside class="blogs-sidebar">
    <section class="blogs-sidebar__card" aria-labelledby="blogs-sidebar-topics-title">
      <div class="blogs-sidebar__header">
        <span class="blogs-sidebar__icon">
          <Icon name="i-ph-hash-fill" />
        </span>
        <h2 id="blogs-sidebar-topics-title" class="blogs-sidebar__title">
          {{ $t("pages.blogsPage.featuredTopics") }}
        </h2>
      </div>

      <div class="blogs-sidebar__topics" role="list">
        <button
          v-for="topic in trendingTopics"
          :key="topic.value"
          class="blogs-sidebar__topic"
          type="button"
          role="listitem"
          @click="$emit('selectCategory', topic.value)"
        >
          <span class="blogs-sidebar__topic-main">
            <Icon :name="topic.icon" />
            {{ topic.label }}
          </span>
          <span class="blogs-sidebar__count">{{ topic.count }}</span>
        </button>
      </div>
    </section>

    <section class="blogs-sidebar__card" aria-labelledby="blogs-sidebar-authors-title">
      <div class="blogs-sidebar__header">
        <span class="blogs-sidebar__icon">
          <Icon name="i-ph-users-three-fill" />
        </span>
        <h2 id="blogs-sidebar-authors-title" class="blogs-sidebar__title">
          {{ $t("pages.blogsPage.authorsThisWeek") }}
        </h2>
      </div>

      <div class="blogs-sidebar__authors" role="list">
        <div v-for="author in featuredAuthors" :key="`${author.name}-${author.topic}`" class="blogs-sidebar__author" role="listitem">
          <span class="blogs-sidebar__avatar">
            <NuxtImg
              v-if="author.avatarUrl"
              :src="author.avatarUrl"
              :alt="author.name"
              class="blogs-sidebar__avatar-image"
              width="72"
              height="72"
              sizes="36px"
              loading="lazy"
            />
            <Icon v-else name="i-ph-user-circle-fill" />
          </span>
          <span class="blogs-sidebar__author-copy">
            <span class="blogs-sidebar__author-name">{{ author.name }}</span>
            <span class="blogs-sidebar__author-meta">
              {{ $t("pages.blogsPage.authorArticleTopic", { count: author.count, topic: author.topic }) }}
            </span>
          </span>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  trendingTopics: Array<{
    label: string
    value: string
    icon: string
    count: number
  }>
  featuredAuthors: Array<{
    name: string
    avatarUrl: string
    count: number
    topic: string
  }>
}>()

defineEmits<{
  selectCategory: [value: string]
}>()
</script>

<style scoped>
.blogs-sidebar {
  display: grid;
  gap: 16px;
}

.blogs-sidebar__card {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.blogs-sidebar__header,
.blogs-sidebar__topic,
.blogs-sidebar__topic-main,
.blogs-sidebar__author {
  display: flex;
  align-items: center;
}

.blogs-sidebar__header {
  gap: 9px;
  border-bottom: 1px solid #f1f5f9;
  padding: 14px 16px;
}

.blogs-sidebar__icon {
  display: flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.blogs-sidebar__title {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
}

.blogs-sidebar__topics,
.blogs-sidebar__authors {
  display: grid;
  padding: 10px;
}

.blogs-sidebar__topic {
  position: relative;
  z-index: 2;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 10px;
  pointer-events: auto;
  user-select: none;
  text-align: left;
  transition: all 0.15s ease;
}

.blogs-sidebar__topic > * {
  pointer-events: none;
}

.blogs-sidebar__topic:hover {
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.blogs-sidebar__topic-main {
  min-width: 0;
  gap: 8px;
}

.blogs-sidebar__topic-main :deep(svg) {
  height: 16px;
  width: 16px;
  flex: 0 0 16px;
}

.blogs-sidebar__count {
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 8px;
}

.blogs-sidebar__author {
  gap: 10px;
  border-radius: 12px;
  padding: 9px 10px;
}

.blogs-sidebar__avatar {
  display: flex;
  overflow: hidden;
  height: 36px;
  width: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
}

.blogs-sidebar__avatar-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.blogs-sidebar__author-copy {
  min-width: 0;
}

.blogs-sidebar__author-name,
.blogs-sidebar__author-meta {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blogs-sidebar__author-name {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.blogs-sidebar__author-meta {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}
</style>
