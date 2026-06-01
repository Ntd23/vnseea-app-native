<template>
  <div class="space-y-4">
    <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
            {{ t("pages.pageDetailPage.feedEyebrow") }}
          </p>
          <h2 class="mt-2 text-[1.3rem] font-black tracking-[-0.04em] text-[#243b63]">
            {{ t("pages.pageDetailPage.feedTitle") }}
          </h2>
          <p class="mt-1 text-[14px] leading-6 text-slate-500">
            {{ t("pages.pageDetailPage.feedDescription", { owner: ownerLabel }) }}
          </p>
        </div>

        <UBadge color="neutral" variant="soft" class="rounded-full px-4 py-3 text-[12px] font-semibold text-slate-500">
          {{ responseLabel }}
        </UBadge>
      </div>
    </section>

    <FeedPublisherBox />

    <UAlert
      v-if="posts.length === 0"
      color="neutral"
      variant="subtle"
      icon="i-ph-newspaper-clipping-bold"
      :title="t('pages.pageDetailPage.feedEmptyTitle')"
      :description="t('pages.pageDetailPage.feedEmptyDescription')"
      class="rounded-[24px]"
    />

    <template v-else>
      <FeedPostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"
import FeedPublisherBox from "../../../feed/presentation/components/FeedPublisherBox.vue"
import type { CommunityPageRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

const props = defineProps<{
  page: CommunityPageRecord
  posts: Array<{
    id: number
    author: string
    role: string
    audience: string
    time: string
    text: string
    tags: string[]
    stats: { likes: number; comments: number; shares: number }
    media?: "double" | "single"
    comments: { id: number; author: string; role: string; text: string }[]
  }>
}>()

const ownerLabel = computed(() =>
  translateText(props.page.ownerLabel),
)

const responseLabel = computed(() =>
  translateText(props.page.responseLabel),
)
</script>
