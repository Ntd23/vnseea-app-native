// English description: Loads the photos gallery, coordinates lightbox state, and handles comment or reaction actions for the photos route.

import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"
import type { FeedCommentRecord, FeedCommentSubmitPayload, FeedStoryReactionType } from "../../../feed/domain/types/feed.types"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"
import type { PhotoRecord } from "../composables/usePhotosData"
import { mapFeedPostsToPhotos } from "../composables/usePhotosData"

export function usePhotosPageVM(
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()
  const currentAuthUserStore = useCurrentAuthUserStore()

  const loading = ref(true)
  const loadingMore = ref(false)
  const commenting = ref(false)
  const errorMessage = ref("")
  const photos = ref<PhotoRecord[]>([])
  const hasMore = ref(false)
  const nextOffset = ref<number | null>(null)
  const lightboxOpen = ref(false)
  const currentPhotoId = ref("")
  const photoReactions = ref<Record<string, { selectedReaction: FeedStoryReactionType | null; likes: number }>>({})

  async function fetchPhotos(reset = true) {
    errorMessage.value = ""

    try {
      const response = await repository.getPhotos({
        limit: 24,
        afterPostId: reset ? undefined : nextOffset.value ?? undefined,
      })

      const mapped = mapFeedPostsToPhotos(response.posts)

      hasMore.value = response.hasMore
      nextOffset.value = response.nextOffset
      photos.value = reset
        ? mapped
        : [...photos.value, ...mapped.filter(photo => !photos.value.some(existing => existing.id === photo.id))]

      for (const photo of mapped) {
        photoReactions.value[photo.id] ??= {
          selectedReaction: null,
          likes: photo.likes,
        }
      }

      if (!currentPhotoId.value && photos.value.length > 0) {
        currentPhotoId.value = photos.value[0].id
      }
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.photosPage.emptyDescription")
    }
    finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function replaceCurrentPhoto(mutator: (photo: PhotoRecord) => PhotoRecord) {
    const photo = currentPhoto.value

    if (!photo) {
      return
    }

    photos.value = photos.value.map(item =>
      item.id === photo.id ? mutator(item) : item,
    )
  }

  const currentPhoto = computed(() =>
    photos.value.find(photo => photo.id === currentPhotoId.value) ?? photos.value[0] ?? null,
  )

  const currentPhotoReaction = computed(() => {
    const photo = currentPhoto.value
    return photo ? photoReactions.value[photo.id]?.selectedReaction ?? null : null
  })

  const currentPhotoLikeCount = computed(() => {
    const photo = currentPhoto.value
    return photo ? photoReactions.value[photo.id]?.likes ?? photo.likes : 0
  })

  const lightboxItems = computed(() =>
    photos.value.map(photo => ({
      type: "image" as const,
      src: photo.image,
      alt: photo.title || photo.photographer,
    })),
  )

  const currentLightboxIndex = computed(() => {
    const index = photos.value.findIndex(photo => photo.id === currentPhotoId.value)
    return index >= 0 ? index : 0
  })

  function openPhoto(id: string) {
    currentPhotoId.value = id
    lightboxOpen.value = true
  }

  function handleLightboxChange(index: number) {
    currentPhotoId.value = photos.value[index]?.id ?? photos.value[0]?.id ?? ""
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) {
      return
    }

    loadingMore.value = true
    await fetchPhotos(false)
  }

  async function submitComment(payload: FeedCommentSubmitPayload) {
    const photo = currentPhoto.value

    if (!photo || commenting.value) {
      return
    }

    commenting.value = true

    try {
      const response = await repository.runPostAction({
        action: "comment",
        postId: photo.postId,
        text: payload.text,
        imageFile: payload.imageFile,
        gifFile: payload.gifFile,
        audioFile: payload.audioFile,
      })

      const user = currentAuthUserStore.user
      const comment: FeedCommentRecord = {
        id: response.commentId ?? Date.now(),
        author: user?.name || t("feed.postCard.commentAuthor"),
        authorAvatarUrl: user?.avatarUrl || "",
        authorPath: user?.username ? appRoutes.profile(user.username) : undefined,
        role: user?.username ? `@${user.username}` : t("feed.postCard.commentRole"),
        text: payload.text,
        time: t("feed.postCard.justNow"),
        attachment: response.attachment ?? payload.attachmentPreview,
      }

      replaceCurrentPhoto(current => ({
        ...current,
        comments: current.comments + 1,
        commentItems: [...current.commentItems, comment],
      }))
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : t("pages.photosPage.emptyDescription")
    }
    finally {
      commenting.value = false
    }
  }

  async function reactToCurrentPhoto(reaction: FeedStoryReactionType) {
    const photo = currentPhoto.value

    if (!photo) {
      return
    }

    const currentState = photoReactions.value[photo.id] ?? {
      selectedReaction: null,
      likes: photo.likes,
    }

    await repository.runPostAction({
      action: "reaction",
      postId: photo.postId,
      reaction,
    })

    photoReactions.value[photo.id] = {
      selectedReaction: reaction,
      likes: currentState.selectedReaction ? currentState.likes : currentState.likes + 1,
    }

    replaceCurrentPhoto(current => ({
      ...current,
      likes: photoReactions.value[current.id]?.likes ?? current.likes,
    }))
  }

  async function hydrateCurrentUser() {
    await currentAuthUserStore.hydrate()
  }

  return {
    currentAuthUserStore,
    loading,
    loadingMore,
    commenting,
    errorMessage,
    photos,
    hasMore,
    nextOffset,
    lightboxOpen,
    currentPhotoId,
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
  }
}
