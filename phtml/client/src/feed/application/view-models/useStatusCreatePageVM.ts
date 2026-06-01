// English description: Manages the upload-first story creation flow, preview state, and backend submission for the status create page.

import { useDropZone, useTextareaAutosize } from "@vueuse/core"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"
import {
  feedStoryAcceptedMimeTypes,
  feedStoryCaptionMaxLength,
  feedStoryCaptionWarningLength,
  feedStoryCreateRedirectDelay,
  feedStoryDropZoneDataTypes,
  feedStoryImageMimePrefix,
  feedStoryPreviewProgressWidths,
  feedStoryVideoMimePrefix,
} from "../constants/story-carousel"
import type { FeedStoryRecord } from "../../domain/types/feed.types"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"

type MediaType = "image" | "video" | null

export function useStatusCreatePageVM(
  repository = createApiFeedRepository(),
) {
  const { t } = useI18n()
  const router = useRouter()
  const currentAuthUserStore = useCurrentAuthUserStore()
  const pendingCreatedStory = useState<FeedStoryRecord | null>("feed-pending-created-story", () => null)

  const fileInputRef = ref<HTMLInputElement | null>(null)
  const dropZoneRef = ref<HTMLDivElement | null>(null)
  const selectedFile = ref<File | null>(null)
  const previewUrl = ref("")
  const mediaType = ref<MediaType>(null)
  const caption = ref("")

  const { isOverDropZone } = useDropZone(dropZoneRef, {
    dataTypes: [...feedStoryDropZoneDataTypes],
    onDrop(files) {
      const file = files?.[0]

      if (file && (file.type.startsWith(feedStoryImageMimePrefix) || file.type.startsWith(feedStoryVideoMimePrefix))) {
        applyFile(file)
      }
    },
  })

  const dropZoneAttrs = { ref: dropZoneRef }
  const captionRef = ref<HTMLTextAreaElement | null>(null)
  useTextareaAutosize({ element: captionRef, input: caption })

  const submitting = ref(false)
  const submitStatus = ref<"idle" | "submitting" | "success" | "error">("idle")
  const statusDescription = ref("")

  const currentUserName = computed(() => currentAuthUserStore.user?.name || "")
  const currentUserAvatar = computed(() => currentAuthUserStore.user?.avatarUrl || "")
  const currentUserInitials = computed(() =>
    currentUserName.value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || "")
      .join("") || t("pages.statusCreatePage.previewInitialsFallback"),
  )

  const previewBarWidth = computed(() =>
    selectedFile.value
      ? feedStoryPreviewProgressWidths.ready
      : feedStoryPreviewProgressWidths.empty,
  )

  const revokePreview = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = ""
    }
  }

  const applyFile = (file: File | null) => {
    revokePreview()
    selectedFile.value = file

    if (!file) {
      mediaType.value = null
      return
    }

    mediaType.value = file.type.startsWith(feedStoryVideoMimePrefix) ? "video" : "image"
    previewUrl.value = URL.createObjectURL(file)
  }

  const openPicker = () => fileInputRef.value?.click()

  const handleFileSelection = (event: Event) =>
    applyFile((event.target as HTMLInputElement).files?.[0] ?? null)

  const removeFile = () => {
    applyFile(null)
    caption.value = ""

    if (fileInputRef.value) {
      fileInputRef.value.value = ""
    }
  }

  onMounted(async () => {
    await currentAuthUserStore.hydrate()
  })

  onUnmounted(() => {
    revokePreview()
  })

  async function submitStory() {
    if (!selectedFile.value || !mediaType.value || submitting.value) {
      return
    }

    submitting.value = true
    submitStatus.value = "submitting"
    statusDescription.value = t("pages.statusCreatePage.submittingStatus")

    try {
      const normalizedCaption = caption.value.trim()
      const response = await repository.createStory({
        file: selectedFile.value,
        fileType: mediaType.value,
        description: normalizedCaption || undefined,
      })

      pendingCreatedStory.value = response.story
      submitStatus.value = "idle"
      statusDescription.value = ""

      window.setTimeout(() => {
        void router.push(appRoutes.feed)
      }, feedStoryCreateRedirectDelay)
    }
    catch (error) {
      console.error(error)
      pendingCreatedStory.value = null
      submitStatus.value = "error"
      statusDescription.value = t("pages.statusCreatePage.errorStatus")
    }
    finally {
      submitting.value = false
    }
  }

  return {
    fileInputRef,
    dropZoneAttrs,
    isOverDropZone,
    selectedFile,
    previewUrl,
    mediaType,
    caption,
    captionRef,
    submitting,
    submitStatus,
    statusDescription,
    currentUserName,
    currentUserAvatar,
    currentUserInitials,
    previewBarWidth,
    openPicker,
    handleFileSelection,
    removeFile,
    submitStory,
    appRoutes,
    feedStoryAcceptedMimeTypes,
    feedStoryCaptionMaxLength,
    feedStoryCaptionWarningLength,
  }
}
