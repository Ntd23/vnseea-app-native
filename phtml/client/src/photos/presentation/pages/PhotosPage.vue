<!-- Description: Renders the photos route as a simple media-first gallery with real feed-backed images and a shared lightbox viewer. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <section class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <div class="space-y-1.5">
        <h1 class="text-heading text-[var(--text-primary)]">
          {{ t("pages.photosPage.heroTitle") }}
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

    <section
      v-if="loading && photos.length === 0"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <div class="flex items-center justify-center gap-3 text-sm font-bold text-[var(--text-secondary)]">
        <Icon name="i-lucide-loader-2" class="h-5 w-5 animate-spin" />
        <span>{{ t("pages.photosPage.heroTitle") }}</span>
      </div>
    </section>

    <section
      v-else-if="photos.length === 0"
      class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-14 text-center shadow-[var(--shadow-sm)]"
    >
      <FoundationEmptyState
        icon="i-ph-images-square-duotone"
        :title="t('pages.photosPage.emptyTitle')"
        :description="t('pages.photosPage.emptyDescription')"
      />
    </section>

    <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-3">
      <button
        v-for="photo in photos"
        :key="photo.id"
        type="button"
        class="overflow-hidden rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
        @click="openPhoto(photo.id)"
      >
        <img
          :src="photo.image"
          :alt="photo.title || photo.photographer"
          class="aspect-square h-full w-full object-cover"
          loading="lazy"
        >
      </button>
    </div>

    <div v-if="photos.length > 0" class="flex justify-center pt-2">
      <UButton
        v-if="hasMore"
        color="primary"
        variant="soft"
        class="rounded-full"
        :loading="loadingMore"
        @click="loadMore"
      >
        {{ t("pages.homeFeedPage.loadMore") }}
      </UButton>
      <p v-else class="text-caption-secondary">
        {{ t("pages.homeFeedPage.allCaughtUp") }}
      </p>
    </div>

    <LightboxModal
      :open="lightboxOpen"
      :items="lightboxItems"
      :current-index="currentLightboxIndex"
      :title="currentPhoto?.title || currentPhoto?.photographer || ''"
      :description="''"
      :author="currentPhoto?.photographer || ''"
      :author-avatar-url="currentPhoto?.authorAvatarUrl || ''"
      :author-path="currentPhoto?.authorPath || ''"
      :caption="currentPhoto?.albumTitle || ''"
      :time-label="currentPhoto?.timeLabel || ''"
      :like-count="currentPhotoLikeCount"
      :selected-reaction="currentPhotoReaction"
      :comments="currentPhoto?.commentItems || []"
      :current-user-name="currentAuthUserStore.user?.name"
      :current-user-avatar-url="currentAuthUserStore.user?.avatarUrl"
      :submitting-comment="commenting"
      @close="lightboxOpen = false"
      @change="handleLightboxChange"
      @share="currentPhoto?.companionTo ? navigateTo(currentPhoto.companionTo) : null"
      @download="noop"
      @like="noop"
      @react="reactToCurrentPhoto"
      @comment="currentPhoto?.companionTo ? navigateTo(currentPhoto.companionTo) : null"
      @submit-comment="submitComment"
    />
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import LightboxModal from "../../../lightbox/presentation/components/LightboxModal.vue"
import { usePhotosPageVM } from "../../application/view-models/usePhotosPageVM"

const { t } = useI18n()
const {
  currentAuthUserStore,
  loading,
  loadingMore,
  commenting,
  errorMessage,
  photos,
  hasMore,
  lightboxOpen,
  currentPhoto,
  currentPhotoReaction,
  currentPhotoLikeCount,
  lightboxItems,
  currentLightboxIndex,
  openPhoto,
  handleLightboxChange,
  loadMore,
  submitComment,
  reactToCurrentPhoto,
  fetchPhotos,
  hydrateCurrentUser,
} = usePhotosPageVM()
const noop = () => {}

useSeoMeta({
  title: () => t("pages.photosPage.seoTitle"),
  description: () => t("pages.photosPage.seoDescription"),
})

await fetchPhotos(true)
await hydrateCurrentUser()
</script>
