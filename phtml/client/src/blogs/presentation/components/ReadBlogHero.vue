<template>
  <header class="read-blog-hero">
    <div class="read-blog-hero__media">
      <div class="read-blog-hero__fallback" :style="{ background: article.imageFallback }" aria-hidden="true" />
      <NuxtImg
        v-if="showCoverImage"
        :src="article.image"
        :alt="article.title"
        class="read-blog-hero__image"
        width="1600"
        height="900"
        loading="eager"
        sizes="100vw lg:1180px"
        @error="imageFailed = true"
      />
    </div>

    <div class="read-blog-hero__content">
      <div class="read-blog-hero__meta">
        <span class="read-blog-hero__chip">
          <Icon name="i-ph-book-open-text-fill" class="read-blog-hero__chip-icon" />
          {{ article.categoryLabel }}
        </span>
        <span class="read-blog-hero__chip read-blog-hero__chip--muted">
          <Icon name="i-ph-clock-fill" class="read-blog-hero__chip-icon" />
          {{ $t("pages.blogsPage.readMinutes", { count: article.readMinutes }) }}
        </span>
      </div>

      <h1 id="read-blog-title" class="read-blog-hero__title">
        {{ article.title }}
      </h1>

      <p v-if="article.excerpt" class="read-blog-hero__excerpt">
        {{ article.excerpt }}
      </p>

      <div class="read-blog-hero__footer">
        <div class="read-blog-hero__author">
          <span class="read-blog-hero__avatar">
            <NuxtImg
              v-if="article.authorAvatarUrl"
              :src="article.authorAvatarUrl"
              :alt="article.author"
              class="read-blog-hero__avatar-image"
              width="84"
              height="84"
              sizes="42px"
              loading="lazy"
            />
            <Icon v-else name="i-ph-user-circle-fill" class="h-6 w-6" />
          </span>
          <span class="read-blog-hero__author-copy">
            <span class="read-blog-hero__author-name">{{ article.author }}</span>
            <span class="read-blog-hero__date">{{ article.publishedAt }}</span>
          </span>
        </div>

        <div class="read-blog-hero__stats" aria-label="Article statistics">
          <span>
            <Icon name="i-ph-eye-fill" class="read-blog-hero__stat-icon" />
            {{ $t("pages.readBlogPage.views", { count: formatCompact(article.views) }) }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  article: {
    title: string
    excerpt: string
    categoryLabel: string
    author: string
    authorAvatarUrl: string
    publishedAt: string
    views: number
    readMinutes: number
    image: string
    imageFallback: string
  }
  formatCompact: (value: number) => string
}>()

const imageFailed = ref(false)

watch(() => props.article.image, () => {
  imageFailed.value = false
}, { immediate: true })

const showCoverImage = computed(() => Boolean(props.article.image.trim()) && !imageFailed.value)
</script>

<style scoped>
.read-blog-hero {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.read-blog-hero__media {
  position: relative;
  min-height: 260px;
  overflow: hidden;
  background: #f1f5f9;
}

.read-blog-hero__fallback,
.read-blog-hero__image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.read-blog-hero__image {
  object-fit: cover;
}

.read-blog-hero__content {
  padding: 18px;
}

.read-blog-hero__meta,
.read-blog-hero__footer,
.read-blog-hero__author,
.read-blog-hero__stats,
.read-blog-hero__chip,
.read-blog-hero__stats span {
  display: flex;
  align-items: center;
}

.read-blog-hero__meta {
  flex-wrap: wrap;
  gap: 8px;
}

.read-blog-hero__chip,
.read-blog-hero__stats span {
  gap: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.read-blog-hero__chip {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 7px 11px;
}

.read-blog-hero__chip--muted {
  background: #f1f5f9;
  color: #475569;
}

.read-blog-hero__chip-icon,
.read-blog-hero__stat-icon {
  height: 14px;
  width: 14px;
}

.read-blog-hero__title {
  margin: 14px 0 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.15;
}

.read-blog-hero__excerpt {
  max-width: 760px;
  margin: 12px 0 0;
  color: #475569;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.7;
}

.read-blog-hero__footer {
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

.read-blog-hero__author {
  min-width: 0;
  gap: 10px;
}

.read-blog-hero__avatar {
  display: flex;
  overflow: hidden;
  height: 42px;
  width: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
}

.read-blog-hero__avatar-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.read-blog-hero__author-copy {
  min-width: 0;
}

.read-blog-hero__author-name,
.read-blog-hero__date {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.read-blog-hero__author-name {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.read-blog-hero__date {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.read-blog-hero__stats {
  flex: 0 0 auto;
  gap: 8px;
}

.read-blog-hero__stats span {
  background: #f8fafc;
  color: #475569;
  padding: 8px 10px;
}

@media (min-width: 768px) {
  .read-blog-hero__media {
    min-height: 420px;
  }

  .read-blog-hero__content {
    padding: 24px;
  }

  .read-blog-hero__title {
    font-size: 42px;
  }
}
</style>
