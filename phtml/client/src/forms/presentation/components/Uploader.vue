<template>
  <UCard
    class="rounded-[28px] border border-dashed border-[#0000ff]/20 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_14px_34px_rgba(15,35,110,0.05)]"
    :ui="{ body: 'p-4 sm:p-5' }"
    v-bind="attrs"
  >
    <div class="space-y-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <p v-if="eyebrow" class="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0000ff]/70">
            {{ eyebrow }}
          </p>
          <h3 class="mt-1 text-lg font-black tracking-[-0.03em] text-[#243b63]">
            {{ title }}
          </h3>
          <p v-if="description" class="mt-1 text-sm leading-6 text-slate-500">
            {{ description }}
          </p>
        </div>

        <UBadge
          color="primary"
          variant="subtle"
          class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold"
        >
          <Icon name="i-ph-images-square-fill" class="h-4 w-4 text-[#0000ff]" />
          {{ counterLabel }}
        </UBadge>
      </div>

      <UAlert
        v-if="alertDescription"
        :color="alertColor"
        variant="subtle"
        :icon="alertIcon"
        :title="alertTitle || undefined"
        :description="alertDescription"
        class="rounded-[20px]"
      />

      <div class="flex flex-wrap gap-3">
        <input
          ref="imageInputRef"
          :accept="imageAccept"
          :multiple="multiple"
          class="hidden"
          type="file"
          @change="handleSelection($event, 'image')"
        >
        <input
          ref="videoInputRef"
          :accept="videoAccept"
          :multiple="multiple"
          class="hidden"
          type="file"
          @change="handleSelection($event, 'video')"
        >

        <UButton
          v-if="allowImages"
          color="primary"
          variant="solid"
          class="rounded-full"
          :disabled="disabled || loading"
          :loading="loading && activePicker === 'image'"
          @click="openPicker('image')"
        >
          <Icon name="i-ph-image-fill" class="mr-2 h-4 w-4" />
          {{ imageButtonLabel }}
        </UButton>

        <UButton
          v-if="allowVideos"
          color="neutral"
          variant="outline"
          class="rounded-full"
          :disabled="disabled || loading"
          :loading="loading && activePicker === 'video'"
          @click="openPicker('video')"
        >
          <Icon name="i-ph-video-fill" class="mr-2 h-4 w-4" />
          {{ videoButtonLabel }}
        </UButton>
      </div>

      <FormsMediaPreviewList
        :items="items"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
        :remove-label="removeLabel"
        @remove="$emit('remove', $event)"
        @preview="$emit('preview', $event)"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useAttrs } from "vue"
import FormsMediaPreviewList from "./MediaPreviewList.vue"

defineOptions({ inheritAttrs: false })

type UploaderStatus = "idle" | "loading" | "success" | "error"
type UploaderMediaKind = "image" | "video"

type UploaderItem = {
  id?: string | number
  name: string
  kind?: "image" | "video" | "file"
  previewUrl?: string
  description?: string
  meta?: string
  sizeLabel?: string
  badge?: string
  removable?: boolean
  previewable?: boolean
  status?: "idle" | "uploading" | "ready" | "error"
  progress?: number
  error?: string
}

const attrs = useAttrs()

const props = withDefaults(defineProps<{
  items?: UploaderItem[]
  title?: string
  description?: string
  eyebrow?: string
  hint?: string
  error?: string
  disabled?: boolean
  loading?: boolean
  status?: UploaderStatus
  allowImages?: boolean
  allowVideos?: boolean
  multiple?: boolean
  imageAccept?: string
  videoAccept?: string
  imageButtonLabel?: string
  videoButtonLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  removeLabel?: string
}>(), {
  items: () => [],
  title: "Thêm media",
  description: "Chọn ảnh hoặc video để xem trước trước khi lưu.",
  eyebrow: "Media",
  hint: "Upload hiện dùng local preview. Bạn có thể nối API thật từ event emit của component này.",
  error: "",
  disabled: false,
  loading: false,
  status: "idle",
  allowImages: true,
  allowVideos: true,
  multiple: true,
  imageAccept: "image/*",
  videoAccept: "video/*",
  imageButtonLabel: "Chọn ảnh",
  videoButtonLabel: "Thêm video",
  emptyTitle: "Chưa có media nào",
  emptyDescription: "Ảnh hoặc video vừa chọn sẽ xuất hiện ở đây để kiểm tra thứ tự và trạng thái.",
  removeLabel: "Gỡ",
})

const emit = defineEmits<{
  (e: "select", payload: { kind: UploaderMediaKind, files: File[] }): void
  (e: "select-image", files: File[]): void
  (e: "select-video", files: File[]): void
  (e: "remove", payload: { item: UploaderItem, index: number }): void
  (e: "preview", payload: { item: UploaderItem, index: number }): void
}>()

const imageInputRef = ref<HTMLInputElement | null>(null)
const videoInputRef = ref<HTMLInputElement | null>(null)
const activePicker = ref<UploaderMediaKind | null>(null)

const counterLabel = computed(() => {
  if (!props.items.length) return "0 mục"
  if (props.items.length === 1) return "1 mục"
  return `${props.items.length} mục`
})

const alertColor = computed(() => {
  if (props.error || props.status === "error") return "error"
  if (props.status === "success") return "success"
  if (props.status === "loading") return "primary"
  return "primary"
})

const alertIcon = computed(() => {
  if (props.error || props.status === "error") return "i-ph-warning-octagon-fill"
  if (props.status === "success") return "i-ph-check-circle-fill"
  if (props.status === "loading") return "i-ph-spinner-gap-bold"
  return "i-ph-info-fill"
})

const alertTitle = computed(() => {
  if (props.error || props.status === "error") return "Có lỗi trong quá trình tải lên"
  if (props.status === "success") return "Media đã sẵn sàng"
  if (props.status === "loading") return "Đang xử lý media"
  return ""
})

const alertDescription = computed(() => props.error || props.hint)

function openPicker(kind: UploaderMediaKind) {
  activePicker.value = kind

  if (kind === "image") {
    imageInputRef.value?.click()
    return
  }

  videoInputRef.value?.click()
}

function handleSelection(event: Event, kind: UploaderMediaKind) {
  const target = event.target as HTMLInputElement | null
  const files = Array.from(target?.files ?? [])

  activePicker.value = null

  if (!files.length) return

  emit("select", { kind, files })

  if (kind === "image") emit("select-image", files)
  else emit("select-video", files)

  if (target) target.value = ""
}
</script>
