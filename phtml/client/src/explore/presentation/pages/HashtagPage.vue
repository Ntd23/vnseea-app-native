<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-16 sm:px-5 lg:px-6">
    <section class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <div class="space-y-1.5">
        <p class="text-label-secondary">
          {{ t("pages.hashtagPage.heroEyebrow") }}
        </p>
        <h1 class="text-heading text-[var(--text-primary)]">
          {{ hashtagLabel }}
        </h1>
      </div>
    </section>

    <UAlert
      v-if="errorMessage"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      class="rounded-[22px]"
      :description="errorMessage"
    />

    <div v-if="loading" class="space-y-4">
      <div
        v-for="item in 3"
        :key="item"
        class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
      >
        <div class="flex items-start gap-4">
          <USkeleton class="h-12 w-12 rounded-full" />
          <div class="min-w-0 flex-1 space-y-3">
            <USkeleton class="h-5 w-44 rounded-xl" />
            <USkeleton class="h-4 w-full rounded-xl" />
            <USkeleton class="h-4 w-[80%] rounded-xl" />
            <USkeleton class="aspect-video w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>

    <section
      v-else-if="matchingPosts.length === 0"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <FoundationEmptyState
        icon="i-ph-hash-bold"
        :title="t('pages.hashtagPage.emptyTitle', { tag: hashtagLabel })"
        :description="t('pages.hashtagPage.emptyDescription', { tag: hashtagLabel })"
      />
    </section>

    <div v-else class="space-y-4">
      <FeedPostCard
        v-for="post in matchingPosts"
        :key="post.id"
        :post="post"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import { useHashtagPageVM } from "../../application/view-models/useHashtagPageVM"

const { t } = useI18n()
const {
  loading,
  errorMessage,
  matchingPosts,
  hashtagLabel,
} = useHashtagPageVM()
</script>
