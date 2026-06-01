<template>
  <aside class="read-blog-sidebar">
    <section class="read-blog-sidebar__card read-blog-sidebar__author-card">
      <div class="read-blog-sidebar__author-band" aria-hidden="true" />
      <div class="read-blog-sidebar__author-body">
        <span class="read-blog-sidebar__avatar">
          <NuxtImg
            v-if="article.authorAvatarUrl"
            :src="article.authorAvatarUrl"
            :alt="article.author"
            class="read-blog-sidebar__avatar-image"
            width="116"
            height="116"
            sizes="58px"
            loading="lazy"
          />
          <Icon v-else name="i-ph-user-circle-fill" class="h-7 w-7" />
        </span>

        <p class="read-blog-sidebar__eyebrow">{{ $t("pages.readBlogPage.author") }}</p>
        <h2 class="read-blog-sidebar__author-name">{{ article.author }}</h2>
        <span class="read-blog-sidebar__category">{{ article.categoryLabel }}</span>

        <p class="read-blog-sidebar__description">
          {{ $t("pages.readBlogPage.authorDescription") }}
        </p>
      </div>
    </section>

    <section class="read-blog-sidebar__card" aria-labelledby="read-blog-related-title">
      <div class="read-blog-sidebar__header">
        <span class="read-blog-sidebar__header-icon">
          <Icon name="i-ph-books-fill" />
        </span>
        <h2 id="read-blog-related-title" class="read-blog-sidebar__title">
          {{ $t("pages.readBlogPage.relatedArticles") }}
        </h2>
      </div>

      <div v-if="relatedArticles.length > 0" class="read-blog-sidebar__related-list" role="list">
        <NuxtLink
          v-for="item in relatedArticles"
          :key="item.slug"
          :to="appRoutes.readBlog(item.slug)"
          class="read-blog-sidebar__related"
          role="listitem"
        >
          <span class="read-blog-sidebar__thumb">
            <span class="read-blog-sidebar__thumb-fallback" :style="{ background: item.imageFallback ?? 'linear-gradient(135deg,#1e3a8a,#38bdf8)' }" />
            <NuxtImg
              v-if="item.image"
              :src="item.image"
              :alt="item.title"
              class="read-blog-sidebar__thumb-image"
              width="180"
              height="120"
              sizes="90px"
              loading="lazy"
            />
          </span>

          <span class="read-blog-sidebar__related-copy">
            <span class="read-blog-sidebar__related-category">{{ item.categoryLabel }}</span>
            <span class="read-blog-sidebar__related-title">{{ item.title }}</span>
            <span class="read-blog-sidebar__related-meta">
              <Icon name="i-ph-clock-fill" />
              {{ $t("pages.blogsPage.readMinutes", { count: item.readMinutes }) }}
            </span>
          </span>
        </NuxtLink>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"

defineProps<{
  article: {
    author: string
    authorAvatarUrl: string
    categoryLabel: string
  }
  relatedArticles: ReadonlyArray<{
    slug: string
    categoryLabel: string
    title: string
    readMinutes: number
    image?: string
    imageFallback?: string
  }>
}>()
</script>

<style scoped>
.read-blog-sidebar {
  display: grid;
  gap: 16px;
}

.read-blog-sidebar__card {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.read-blog-sidebar__author-band {
  height: 62px;
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
}

.read-blog-sidebar__author-body {
  padding: 0 16px 16px;
}

.read-blog-sidebar__avatar {
  display: flex;
  overflow: hidden;
  height: 58px;
  width: 58px;
  align-items: center;
  justify-content: center;
  margin-top: -29px;
  border: 4px solid #ffffff;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
}

.read-blog-sidebar__avatar-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.read-blog-sidebar__eyebrow {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.read-blog-sidebar__author-name {
  margin: 3px 0 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0;
}

.read-blog-sidebar__category {
  display: inline-flex;
  margin-top: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
}

.read-blog-sidebar__description {
  margin: 12px 0 0;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.65;
}

.read-blog-sidebar__header {
  display: flex;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid #f1f5f9;
  padding: 14px 16px;
}

.read-blog-sidebar__header-icon {
  display: flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
}

.read-blog-sidebar__title {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
}

.read-blog-sidebar__related-list {
  display: grid;
}

.read-blog-sidebar__related {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 10px;
  border-top: 1px solid #f1f5f9;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease;
}

.read-blog-sidebar__related:first-child {
  border-top: 0;
}

.read-blog-sidebar__related:hover {
  background: rgba(0, 0, 255, 0.03);
}

.read-blog-sidebar__thumb {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 12px;
  background: #f1f5f9;
}

.read-blog-sidebar__thumb-fallback,
.read-blog-sidebar__thumb-image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.read-blog-sidebar__thumb-image {
  object-fit: cover;
}

.read-blog-sidebar__related-copy {
  min-width: 0;
}

.read-blog-sidebar__related-category {
  display: inline-flex;
  max-width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.read-blog-sidebar__related-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-top: 6px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
}

.read-blog-sidebar__related-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.read-blog-sidebar__related-meta :deep(svg) {
  height: 13px;
  width: 13px;
}

</style>
