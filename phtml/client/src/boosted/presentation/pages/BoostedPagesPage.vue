<!-- English description: Displays backend-backed pages currently boosted by the authenticated Pro user. -->
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

    <section v-else>
      <div v-if="pending" class="boosted-page__grid">
        <USkeleton v-for="item in 6" :key="item" class="h-56 rounded-[18px]" />
      </div>

      <div v-else-if="pages.length" class="boosted-page__grid">
        <article v-for="page in pages" :key="page.id" class="boosted-page-card">
          <div class="boosted-page-card__cover" :style="{ background: page.banner }">
            <span class="boosted-page-card__badge">
              <Icon name="i-ph-lightning-fill" class="h-3.5 w-3.5" />
              {{ copy.boosted }}
            </span>
          </div>
          <div class="boosted-page-card__body">
            <NuxtImg
              v-if="page.avatarUrl"
              :src="page.avatarUrl"
              :alt="page.name"
              class="boosted-page-card__avatar"
              width="64"
              height="64"
              loading="lazy"
            />
            <div v-else class="boosted-page-card__avatar boosted-page-card__avatar--fallback">
              {{ page.name.slice(0, 2).toUpperCase() }}
            </div>
            <div class="boosted-page-card__copy">
              <h2>{{ page.name }}</h2>
              <p>{{ page.summary || page.ownerLabel || copy.noSummary }}</p>
              <span>{{ copy.likes(page.likes) }}</span>
            </div>
            <NuxtLink :to="appRoutes.pageDetail(page.slug)" class="boosted-page-card__link">
              {{ copy.openPage }}
            </NuxtLink>
          </div>
        </article>
      </div>

      <div v-else class="boosted-page__empty">
        <Icon name="i-ph-flag-banner-fold-duotone" class="boosted-page__empty-icon" />
        <h2>{{ copy.emptyTitle }}</h2>
        <p>{{ copy.emptyDescription }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { apiRoutes, appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import type { CommunityPageRecord } from "../../../community/domain/types/community.types"
import type { GoProCatalog } from "../../../go-pro/domain/types/go-pro.types"

const { n, t } = useI18n()

const { data, pending, error } = await useAsyncData("boosted-pages", async () => {
  const [boosted, catalog] = await Promise.all([
    $fetch<{ pages: CommunityPageRecord[] }>(`/_api/${apiRoutes.boosted.pages}`),
    $fetch<GoProCatalog>("/_api/go-pro"),
  ])

  return { boosted, catalog }
},
)

const pages = computed(() => data.value?.boosted.pages ?? [])
const currentPackage = computed(() => data.value?.catalog.packages.find(item => item.isCurrent))
const canBoost = computed(() => Number(currentPackage.value?.features.pages_promotion ?? 0))
const copy = computed(() => ({
  title: t("boostedPage.pages.title"),
  description: t("boostedPage.pages.description"),
  managePlan: t("boostedPage.pages.managePlan"),
  packageNotice: t("boostedPage.pages.packageNotice", {
    typeName: currentPackage.value?.name || "PRO",
    canBoost: n(canBoost.value),
  }),
  visibilityNotice: t("boostedPage.pages.visibilityNotice"),
  unavailableTitle: t("boostedPage.pages.unavailableTitle"),
  emptyTitle: t("boostedPage.pages.emptyTitle"),
  emptyDescription: t("boostedPage.pages.emptyDescription"),
  boosted: t("boostedPage.pages.boosted"),
  openPage: t("boostedPage.pages.openPage"),
  noSummary: t("boostedPage.pages.noSummary"),
  likes: (count: number) => t("boostedPage.pages.likes", { count: n(count) }),
}))
</script>

<style scoped>
.boosted-page {
  display: flex;
  width: min(100%, 1120px);
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

.boosted-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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

.boosted-page-card,
.boosted-page__empty {
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 35, 110, 0.08);
}

.boosted-page-card__cover {
  position: relative;
  height: 122px;
}

.boosted-page-card__badge {
  position: absolute;
  right: 12px;
  top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  padding: 6px 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.boosted-page-card__body {
  position: relative;
  padding: 42px 16px 16px;
}

.boosted-page-card__avatar {
  position: absolute;
  left: 16px;
  top: -32px;
  height: 64px;
  width: 64px;
  border: 4px solid #fff;
  border-radius: 18px;
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.boosted-page-card__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0000ff;
  color: #fff;
  font-weight: 900;
}

.boosted-page-card__copy h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
}

.boosted-page-card__copy p {
  display: -webkit-box;
  min-height: 42px;
  margin: 8px 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.boosted-page-card__copy span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.boosted-page-card__link {
  display: inline-flex;
  margin-top: 14px;
  border-radius: 999px;
  background: #eff6ff;
  padding: 8px 13px;
  color: #0000ff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.boosted-page__empty {
  padding: 36px 20px;
  text-align: center;
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
