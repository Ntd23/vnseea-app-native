<template>
  <article class="blogs-featured">
    <NuxtLink :to="article.href" class="blogs-featured__media group">
      <div class="blogs-featured__fallback" :style="{ background: article.imageFallback }" />
      <NuxtImg
        v-if="showCoverImage"
        :src="article.image"
        :alt="article.title"
        width="1400"
        height="820"
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 70vw, 760px"
        class="blogs-featured__image"
        loading="lazy"
        decoding="async"
        @error="handleImageError"
      />
      <span class="blogs-featured__read">
        <Icon name="i-ph-arrow-up-right-bold" class="h-4 w-4" />
      </span>
    </NuxtLink>

    <div class="blogs-featured__body">
      <div class="blogs-featured__meta">
        <span class="blogs-featured__category">
          <Icon name="i-ph-book-open-text-fill" class="h-3.5 w-3.5" />
          {{ article.categoryLabel }}
        </span>
        <span v-if="article.mine" class="blogs-featured__mine">
          <Icon name="i-ph-user-fill" class="h-3.5 w-3.5" />
          {{ $t("pages.blogsPage.mineBadge") }}
        </span>
      </div>

      <NuxtLink :to="article.href" class="blogs-featured__title-link">
        <h3 class="blogs-featured__title">{{ article.title }}</h3>
      </NuxtLink>

      <p class="blogs-featured__excerpt">{{ article.excerpt }}</p>

      <div class="blogs-featured__footer">
        <div class="blogs-featured__author">
          <span class="blogs-featured__avatar">
            <NuxtImg
              v-if="article.authorAvatarUrl"
              :src="article.authorAvatarUrl"
              :alt="article.author"
              class="blogs-featured__avatar-image"
              width="76"
              height="76"
              sizes="38px"
              loading="lazy"
            />
            <Icon v-else name="i-ph-user-circle-fill" class="h-6 w-6" />
          </span>
          <span class="min-w-0">
            <span class="blogs-featured__author-name">{{ article.author }}</span>
            <span class="blogs-featured__date">{{ article.publishedAt }}</span>
          </span>
        </div>

        <div class="blogs-featured__stats" aria-hidden="true">
          <span>
            <Icon name="i-ph-eye-fill" class="h-3.5 w-3.5" />
            {{ formatCompact(article.views) }}
          </span>
          <span>
            <Icon name="i-ph-clock-fill" class="h-3.5 w-3.5" />
            {{ article.readMinutes }}m
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{
  article: {
    href: string
    image: string
    imageFallback: string
    title: string
    categoryLabel: string
    author: string
    authorAvatarUrl: string
    publishedAt: string
    views: number
    readMinutes: number
    excerpt: string
    mine?: boolean
  }
  formatCompact: (value: number) => string
}>()

const hasImageError = ref(false)

watch(() => props.article.image, (value) => {
  hasImageError.value = !value.trim()
}, { immediate: true })

const showCoverImage = computed(() => Boolean(props.article.image.trim()) && !hasImageError.value)

const handleImageError = () => {
  hasImageError.value = true
}
</script>

<style scoped>
.blogs-featured {
  display: grid;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.blogs-featured__media {
  position: relative;
  display: block;
  min-height: 260px;
  overflow: hidden;
  background: #f1f5f9;
}

.blogs-featured__fallback,
.blogs-featured__image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.blogs-featured__image {
  object-fit: cover;
  transition: transform 0.4s ease;
}

.blogs-featured__media:hover .blogs-featured__image {
  transform: scale(1.04);
}

.blogs-featured__read {
  position: absolute;
  right: 14px;
  top: 14px;
  display: flex;
  height: 40px;
  width: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  color: #0000ff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
}

.blogs-featured__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px;
}

.blogs-featured__meta,
.blogs-featured__footer,
.blogs-featured__stats,
.blogs-featured__author {
  display: flex;
  align-items: center;
}

.blogs-featured__meta {
  flex-wrap: wrap;
  gap: 8px;
}

.blogs-featured__category,
.blogs-featured__mine,
.blogs-featured__stats span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.blogs-featured__category {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 7px 11px;
}

.blogs-featured__mine {
  background: #f1f5f9;
  color: #334155;
  padding: 7px 11px;
}

.blogs-featured__title-link {
  margin-top: 14px;
  color: inherit;
  text-decoration: none;
}

.blogs-featured__title {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.18;
}

.blogs-featured__excerpt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  margin: 10px 0 0;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.65;
}

.blogs-featured__footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.blogs-featured__author {
  min-width: 0;
  gap: 10px;
}

.blogs-featured__avatar {
  display: flex;
  overflow: hidden;
  height: 38px;
  width: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
}

.blogs-featured__avatar-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.blogs-featured__author-name,
.blogs-featured__date {
  display: block;
}

.blogs-featured__author-name {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blogs-featured__date {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.blogs-featured__stats {
  flex: 0 0 auto;
  gap: 8px;
}

.blogs-featured__stats span {
  background: #f8fafc;
  color: #475569;
  padding: 7px 9px;
}

@media (min-width: 768px) {
  .blogs-featured {
    grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
  }

  .blogs-featured__media {
    min-height: 360px;
  }

  .blogs-featured__body {
    padding: 24px;
  }
}
</style>
