<!-- Description: Renders popular posts as a simple legacy-style ranked feed list without extra dashboard sections or sidebar widgets. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-16 sm:px-5 lg:px-6">
    <UAlert
      v-if="errorMessage"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      class="rounded-[22px]"
      :description="errorMessage"
    />

    <section
      v-if="loading"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <div class="flex items-center justify-center gap-3 text-sm font-bold text-[var(--text-secondary)]">
        <Icon name="i-lucide-loader-2" class="h-5 w-5 animate-spin" />
        <span>{{ t("pages.popularPage.heroTitle") }}</span>
      </div>
    </section>

    <section
      v-else-if="posts.length === 0"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <FoundationEmptyState
        icon="i-ph-fire-duotone"
        :title="t('pages.popularPage.emptyTitle')"
        :description="t('pages.popularPage.emptyDescription')"
      />
    </section>

    <div v-else class="space-y-4">
      <article
        v-for="(post, index) in posts"
        :key="post.id"
        class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-sm)]"
      >
        <FeedPostCard :post="post" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import { usePopularPageVM } from "../../application/view-models/usePopularPageVM"

const { t } = useI18n()
const { loading, errorMessage, posts, fetchPopularPosts } = usePopularPageVM()

useSeoMeta({
  title: () => t("pages.popularPage.seoTitle"),
  description: () => t("pages.popularPage.seoDescription"),
})

await fetchPopularPosts()
</script>
