<template>
  <div class="space-y-4">
    <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
            {{ t("pages.groupDetailPage.feedEyebrow") }}
          </p>
          <h2 class="mt-2 text-[1.3rem] font-black tracking-[-0.04em] text-[#243b63]">
            {{ t("pages.groupDetailPage.feedTitle") }}
          </h2>
          <p class="mt-1 text-[14px] leading-6 text-slate-500">
            {{ t("pages.groupDetailPage.feedDescription", { activity: activityLabel }) }}
          </p>
        </div>

        <UBadge color="neutral" variant="soft" class="rounded-full px-4 py-3 text-[12px] font-semibold text-slate-500">
          {{ ownerLabel }}
        </UBadge>
      </div>
    </section>

    <FeedPublisherBox :group-id="group.id" @created="post => emit('created', post)" />

    <UAlert
      v-if="posts.length === 0"
      color="neutral"
      variant="subtle"
      icon="i-ph-newspaper-clipping-bold"
      :title="t('pages.groupDetailPage.feedEmptyTitle')"
      :description="t('pages.groupDetailPage.feedEmptyDescription')"
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
import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"
import type { CommunityGroupRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

const props = defineProps<{
  group: CommunityGroupRecord
  posts: FeedPostRecord[]
}>()

const emit = defineEmits<{
  created: [post: FeedPostRecord | null]
}>()

const activityLabel = computed(() =>
  translateText(props.group.activityLabel),
)

const ownerLabel = computed(() =>
  translateText(props.group.ownerLabel),
)
</script>
