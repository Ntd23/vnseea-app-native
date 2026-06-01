<template>
  <article class="blog-card">
    <NuxtLink :to="article.href" class="blog-card__media">
      <div class="blog-card__fallback" :style="{ background: article.imageFallback }" aria-hidden="true" />
      <NuxtImg
        v-if="showCoverImage"
        :src="article.image"
        :alt="article.title"
        width="1200"
        height="750"
        sizes="(max-width: 639px) 100vw, 50vw"
        class="blog-card__image"
        loading="lazy"
        decoding="async"
        @error="handleImageError"
      />

      <div class="blog-card__badges">
        <span class="blog-card__category">
          <span class="blog-card__dot" :style="{ background: categoryAccentColor }" />
          {{ article.categoryLabel }}
        </span>
        <span v-if="article.mine" class="blog-card__mine">
          <Icon name="i-ph-user-fill" class="h-3 w-3" />
          {{ $t("pages.blogsPage.mineBadge") }}
        </span>
      </div>
    </NuxtLink>

    <div class="blog-card__body">
      <NuxtLink :to="article.href" class="blog-card__title-link">
        <h3 class="blog-card__title">{{ article.title }}</h3>
      </NuxtLink>

      <p class="blog-card__excerpt">{{ article.excerpt }}</p>

      <div class="blog-card__footer">
        <div class="blog-card__author">
          <span class="blog-card__avatar">
            <NuxtImg
              v-if="article.authorAvatarUrl"
              :src="article.authorAvatarUrl"
              :alt="article.author"
              class="blog-card__avatar-image"
              width="64"
              height="64"
              sizes="32px"
              loading="lazy"
            />
            <Icon v-else name="i-ph-user-circle-fill" class="h-5 w-5" />
          </span>
          <span class="blog-card__author-copy">
            <span class="blog-card__author-name">{{ article.author }}</span>
            <span class="blog-card__date">{{ article.publishedAt }}</span>
          </span>
        </div>

        <div class="blog-card__stats">
          <span class="blog-card__read">
            <Icon name="i-ph-eye-fill" class="h-3.5 w-3.5" />
            {{ formatCompact(article.views) }}
          </span>
          <span class="blog-card__read">
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
    category?: string
    author: string
    authorAvatarUrl: string
    publishedAt: string
    views: number
    readMinutes: number
    excerpt: string
    tags: string[]
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

const categoryColorMap: Record<string, string> = {
  business: "linear-gradient(90deg,#3b82f6,#06b6d4)",
  vehicles: "linear-gradient(90deg,#64748b,#334155)",
  education: "linear-gradient(90deg,#8b5cf6,#6366f1)",
  movies: "linear-gradient(90deg,#f59e0b,#ef4444)",
  gaming: "linear-gradient(90deg,#a855f7,#6366f1)",
  history: "linear-gradient(90deg,#b45309,#f59e0b)",
  lifestyle: "linear-gradient(90deg,#10b981,#06b6d4)",
  pets: "linear-gradient(90deg,#f472b6,#fb7185)",
  science: "linear-gradient(90deg,#6366f1,#8b5cf6)",
  sports: "linear-gradient(90deg,#22c55e,#16a34a)",
  travel: "linear-gradient(90deg,#0ea5e9,#38bdf8)",
  people: "linear-gradient(90deg,#f97316,#fb923c)",
  other: "linear-gradient(90deg,#94a3b8,#64748b)",
}

const categoryAccentColor = computed(() =>
  categoryColorMap[props.article.category ?? ""] ?? "linear-gradient(90deg,#6366f1,#4f46e5)",
)
</script>

<style scoped>
.blog-card {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.blog-card:hover {
  border-color: rgba(0, 0, 255, 0.12);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.blog-card__media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f1f5f9;
}

.blog-card__fallback,
.blog-card__image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.blog-card__image {
  object-fit: cover;
  transition: transform 0.4s ease;
}

.blog-card__media:hover .blog-card__image {
  transform: scale(1.04);
}

.blog-card__badges {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.blog-card__category,
.blog-card__mine,
.blog-card__read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.blog-card__category,
.blog-card__mine {
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  padding: 6px 9px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.blog-card__dot {
  height: 7px;
  width: 7px;
  flex: 0 0 7px;
  border-radius: 999px;
}

.blog-card__body {
  padding: 14px;
}

.blog-card__title-link {
  color: inherit;
  text-decoration: none;
}

.blog-card__title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.blog-card__excerpt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  min-height: 42px;
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
}

.blog-card__footer,
.blog-card__stats,
.blog-card__author {
  display: flex;
  align-items: center;
}

.blog-card__footer {
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.blog-card__author {
  min-width: 0;
  gap: 9px;
}

.blog-card__stats {
  flex: 0 0 auto;
  gap: 6px;
}

.blog-card__avatar {
  display: flex;
  overflow: hidden;
  height: 32px;
  width: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
}

.blog-card__avatar-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.blog-card__author-copy {
  min-width: 0;
}

.blog-card__author-name,
.blog-card__date {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blog-card__author-name {
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.blog-card__date {
  margin-top: 1px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
}

.blog-card__read {
  flex: 0 0 auto;
  background: #f8fafc;
  color: #475569;
  padding: 7px 9px;
}
</style>
