<!-- Description: Displays a compact page list row aligned to the legacy PHP pages-list layout without extra dashboard metadata. -->
<template>
  <article class="page-card">
    <div class="page-card__cover" :style="{ background: page.banner }">
      <NuxtLink :to="pageTo" class="page-card__cover-link" :aria-label="pageName" />
      <span class="page-card__category">{{ categoryLabel }}</span>
      <NuxtLink v-if="page.canManage" :to="pageSettingsTo" class="page-card__action page-card__action--secondary">
        <Icon name="i-ph-gear-six-duotone" class="h-5 w-5" />
      </NuxtLink>
      <button 
        v-else 
        class="page-card__action"
        :class="localIsLiked ? 'page-card__action--primary' : 'page-card__action--secondary'"
        :disabled="likePending"
        @click.prevent="handleLike"
      >
        <Icon 
          :name="likePending ? 'i-ph-spinner-gap-bold' : (localIsLiked ? 'i-ph-thumbs-up-fill' : 'i-ph-thumbs-up-bold')" 
          class="mr-1.5 h-4 w-4" 
          :class="{'animate-spin': likePending}"
        />
        {{ localIsLiked ? t('pages.pageDetailPage.likedButton') : t('pages.pageDetailPage.likeButton') }}
      </button>
      <span v-if="page.canManage" class="page-card__owner-badge">
        <Icon name="i-ph-flag-fill" class="h-4 w-4" />
      </span>
      <div class="page-card__infor">
        <div class="page-card__identity">
          <NuxtLink :to="pageTo" class="page-card__avatar" :style="{ background: page.accent }" :aria-label="pageName">
            <img v-if="page.avatarUrl" :src="page.avatarUrl" :alt="pageName" class="page-card__avatar-img">
            <span v-else>{{ avatarLabel }}</span>
          </NuxtLink>

          <div class="page-card__title-wrap">
            <NuxtLink :to="pageTo" class="page-card__title">
              {{ pageName }}
            </NuxtLink>
          </div>
        </div>
      </div>
      <div class="page-card__stats">
        <span class="page-card__chip">
          <Icon name="i-ph-users-three-duotone" class="h-4 w-4" />
          {{ $t("community.pages.format.followers", { count: followerCountLabel }) }}
        </span>
        <span class="page-card__chip">
          <Icon name="i-ph-thumbs-up-duotone" class="h-4 w-4" />
          {{ $t("community.pages.format.likes", { count: likeCountLabel }) }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { getCommunityOptionLabel, getCommunityPagePath, getCommunityPageSettingsPath } from "../../domain/services/community-helpers.service"
import { communityPageCategoryOptions } from "../../domain/constants/community-options"
import type { CommunityPageRecord } from "../../domain/types/community.types"
import { useCommunityPageCardVM } from "../../application/view-models/useCommunityPageCardVM"

const props = withDefaults(defineProps<{
  page: CommunityPageRecord
  actionLabel?: string
}>(), {
  actionLabel: "",
})

const { t } = useI18n()

const {
  likePending,
  localIsLiked,
  likeCountLabel,
  followerCountLabel,
  handleLike,
} = useCommunityPageCardVM(() => props.page)

const pageName = computed(() => props.page.name)
const pageSummary = computed(() => props.page.summary)
const avatarLabel = computed(() => pageName.value.slice(0, 2).toUpperCase())

const categoryLabel = computed(() => {
  const label = getCommunityOptionLabel(
    communityPageCategoryOptions,
    props.page.category,
    "",
  )

  return label ? t(label) : ""
})

const resolvedActionLabel = computed(() =>
  props.actionLabel || t("community.pagesDirectory.actionSuggested"),
)

const pageTo = computed(() => getCommunityPagePath(props.page.slug))
const pageSettingsTo = computed(() => getCommunityPageSettingsPath(props.page.slug))
</script>

<style scoped>
.page-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.page-card:hover {
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.page-card__cover {
  position: relative;
  display: block;
  height: 300px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
}

.page-card__cover-link {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.page-card__cover::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.6) 100%);
  z-index: 0;
}

.page-card__category,
.page-card__owner-badge {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.3);
  color: #ffffff;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.page-card__category {
  top: 12px;
  left: 12px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.page-card__owner-badge {
  right: 12px;
  bottom: 12px;
  justify-content: center;
  width: 34px;
  height: 34px;
}

.page-card__content {
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.page-card__main {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.page-card__avatar {
  display: inline-flex;
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  background: var(--bg-surface-active);
  color: var(--text-brand);
  font-size: 18px;
  font-weight: 800;
  text-decoration: none;
}

.page-card__avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-card__content {
  min-width: 0;
  flex: 1;
}

.page-card__title {
  display: block;
  overflow: hidden;
  color: #ffffff;
  font-size: 18px;
  font-weight: 900;
  text-overflow: ellipsis;
  text-decoration: none;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.page-card__title:hover {
  color: #ffffff;
  opacity: 0.9;
}

.page-card__slug {
  margin: 1px 0 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.page-card__summary {
  display: -webkit-box;
  margin: 12px 0 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #334155;
  font-size: 13.5px;
  line-height: 1.55;
}

.page-card__tags,
.page-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.page-card__stats {
  position: absolute;
  bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  left: 12px;
  gap: 8px;
  z-index: 2;
}

.page-card__infor {
  position: absolute;
  bottom: 52px;
  left: 12px;
  right: 12px;
  display: grid;
  gap: 8px;
  z-index: 2;
}

.page-card__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.page-card__chip {
  background: rgba(15, 23, 42, 0.3);
  color: #ffffff;
  padding: 6px 12px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
}

.page-card__tag {
  border: 1px solid rgba(0, 0, 255, 0.12);
  color: #0000ff;
  padding: 5px 10px;
}

.page-card__meta {
  display: grid;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.page-card__meta p {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.page-card__summary {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.6;
}

.page-card__actions {
  display: flex;
  justify-content: flex-end;
}

.page-card__action {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
}

.page-card__action--secondary {
  background: rgba(255, 255, 255, 0.9);
  color: #334155;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: all 0.2s ease;
}

.page-card__action--secondary:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.page-card__action--primary {
  background: var(--color-primary-500, #3b82f6);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.page-card__action--primary:hover {
  background: var(--color-primary-600, #2563eb);
}
</style>