<!-- English description: Displays backend-backed posts currently boosted by the authenticated Pro user. -->
<template>
  <main class="boosted-page">
    <section class="boosted-page__hero">
      <div>
        <p class="boosted-page__eyebrow">PRO</p>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.description }}</p>
      </div>
      <NuxtLink :to="appRoutes.goPro" class="boosted-page__hero-link">
        <Icon name="i-ph-crown-simple-fill" class="h-4 w-4" />
        <span>{{ copy.managePlan }}</span>
      </NuxtLink>
    </section>

    <section class="boosted-page__notices">
      <div class="boosted-page__notice boosted-page__notice--warning">
        <Icon name="i-ph-rocket-launch-fill" class="boosted-page__notice-icon" />
        <span>{{ copy.packageNotice }}</span>
      </div>
      <div class="boosted-page__notice boosted-page__notice--info">
        <Icon name="i-ph-check-bold" class="boosted-page__notice-icon" />
        <span>{{ copy.visibilityNotice }}</span>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="warning"
      variant="soft"
      icon="i-ph-warning-circle-fill"
      :title="copy.unavailableTitle"
      :description="String(error.message || error)"
    />

    <section v-else class="boosted-page__content">
      <div v-if="pending" class="boosted-page__skeletons">
        <USkeleton v-for="item in 3" :key="item" class="h-52 rounded-[18px]" />
      </div>

      <div v-else-if="posts.length" class="boosted-page__posts">
        <FeedPostCard v-for="post in posts" :key="post.id" :post="post" />
      </div>

      <div v-else class="boosted-page__empty">
        <Icon name="i-ph-lightning-slash-duotone" class="boosted-page__empty-icon" />
        <h2>{{ copy.emptyTitle }}</h2>
        <p>{{ copy.emptyDescription }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { apiRoutes, appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import type { FeedPostsResponse } from "../../../feed/domain/types/feed.types"
import type { GoProCatalog } from "../../../go-pro/domain/types/go-pro.types"

const { n, t } = useI18n()

const { data, pending, error } = await useAsyncData("boosted-posts", async () => {
  const [boosted, catalog] = await Promise.all([
    $fetch<FeedPostsResponse>(`/_api/${apiRoutes.boosted.posts}`),
    $fetch<GoProCatalog>("/_api/go-pro"),
  ])

  return { boosted, catalog }
},
)

const posts = computed(() => data.value?.boosted.posts ?? [])
const currentPackage = computed(() => data.value?.catalog.packages.find(item => item.isCurrent))
const canBoost = computed(() => Number(currentPackage.value?.features.posts_promotion ?? 0))
const copy = computed(() => ({
  title: t("boostedPage.posts.title"),
  description: t("boostedPage.posts.description"),
  managePlan: t("boostedPage.posts.managePlan"),
  packageNotice: t("boostedPage.posts.packageNotice", {
    typeName: currentPackage.value?.name || "PRO",
    canBoost: n(canBoost.value),
  }),
  visibilityNotice: t("boostedPage.posts.visibilityNotice"),
  unavailableTitle: t("boostedPage.posts.unavailableTitle"),
  emptyTitle: t("boostedPage.posts.emptyTitle"),
  emptyDescription: t("boostedPage.posts.emptyDescription"),
}))
</script>

<style scoped>
.boosted-page {
  display: flex;
  width: min(100%, 920px);
  flex-direction: column;
  gap: 18px;
  margin: 0 auto;
  padding: 18px 12px 40px;
}

.boosted-page__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-radius: 18px;
  background: #fff;
  padding: 22px;
  box-shadow: 0 12px 32px rgba(15, 35, 110, 0.08);
}

.boosted-page__eyebrow {
  margin: 0 0 6px;
  color: #0000ff;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.boosted-page__hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: 28px;
  font-weight: 900;
}

.boosted-page__hero p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.boosted-page__hero-link {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: #0000ff;
  padding: 10px 16px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.boosted-page__posts,
.boosted-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.boosted-page__notices {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.boosted-page__notice {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  padding: 20px 24px;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.boosted-page__notice--warning {
  background: #f4e9ea;
  color: #fb923c;
}

.boosted-page__notice--info {
  background: #dbeafe;
  color: #1d8cf8;
}

.boosted-page__notice-icon {
  height: 22px;
  width: 22px;
  flex-shrink: 0;
}

.boosted-page__empty {
  border-radius: 18px;
  background: #fff;
  padding: 36px 20px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(15, 35, 110, 0.08);
}

.boosted-page__empty-icon {
  margin: 0 auto 10px;
  height: 42px;
  width: 42px;
  color: #94a3b8;
}

.boosted-page__empty h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 900;
}

.boosted-page__empty p {
  margin: 8px 0 0;
  color: #64748b;
}

@media (max-width: 640px) {
  .boosted-page__hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
