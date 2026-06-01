<!-- English description: Renders a single feed post detail view for notification and deep-link routes using the normalized feed post API. -->
<template>
  <section class="post-detail-page">
    <USkeleton v-if="pending" class="post-detail-page__skeleton" />

    <UAlert
      v-else-if="error || !post"
      color="warning"
      variant="subtle"
      icon="i-ph-warning-circle-fill"
      class="post-detail-page__alert"
      :title="t('feed.postDetail.notFoundTitle')"
      :description="t('feed.postDetail.notFoundDescription')"
    />

    <FeedPostCard v-else :post="post" />
  </section>
</template>

<script setup lang="ts">
import { useFeedPostDetailPageVM } from "../../application/view-models/useFeedPostDetailPageVM"
import FeedPostCard from "../components/PostCard.vue"

const { t } = useI18n()

const props = defineProps<{
  postId: number
}>()

const { post, pending, error } = useFeedPostDetailPageVM(toRef(props, "postId"))
</script>

<style scoped>
.post-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 16px 0 32px;
}

.post-detail-page__skeleton {
  height: 420px;
  border-radius: var(--radius-xl);
}

.post-detail-page__alert {
  border-radius: var(--radius-xl);
}
</style>
