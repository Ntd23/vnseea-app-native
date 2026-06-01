<template>
  <div class="space-y-3">
    <div
      v-if="!items.length"
      class="flex min-h-40 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dbe3f2] bg-[#f8fbff] px-5 py-8 text-center"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-[#0000ff] shadow-[0_10px_24px_rgba(15,35,110,0.1)]">
        <Icon name="i-ph-images-square-fill" class="h-7 w-7" />
      </div>
      <p class="mt-4 text-sm font-bold text-[#243b63]">
        {{ emptyTitle }}
      </p>
      <p class="mt-2 max-w-[340px] text-sm leading-6 text-slate-500">
        {{ emptyDescription }}
      </p>
    </div>

    <div v-else class="grid gap-3" :class="items.length > 1 ? 'md:grid-cols-2' : ''">
      <UCard
        v-for="(item, index) in items"
        :key="item.id ?? `${item.name}-${index}`"
        class="overflow-hidden rounded-[24px] border border-[#dbe3f2] bg-white shadow-[0_10px_24px_rgba(15,35,110,0.06)]"
        :ui="{ body: 'p-0' }"
      >
        <div class="flex min-h-full flex-col">
          <div class="relative min-h-40 overflow-hidden bg-[linear-gradient(135deg,#eff4ff_0%,#f8fbff_100%)]">
            <img
              v-if="getKind(item) === 'image' && item.previewUrl"
              :src="item.previewUrl"
              :alt="item.name"
              class="h-40 w-full object-cover"
            >
            <video
              v-else-if="getKind(item) === 'video' && item.previewUrl"
              :src="item.previewUrl"
              class="h-40 w-full object-cover"
              controls
              muted
              playsinline
            />
            <div
              v-else
              class="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_40%),linear-gradient(135deg,#eff4ff_0%,#f8fbff_100%)] text-[#0000ff]"
            >
              <Icon :name="previewIcon(item)" class="h-10 w-10" />
            </div>

            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
              <UBadge
                color="primary"
                variant="subtle"
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              >
                {{ previewLabelForKind(item) }}
              </UBadge>

              <UBadge
                v-if="item.badge"
                color="neutral"
                variant="soft"
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              >
                {{ item.badge }}
              </UBadge>
            </div>

            <div v-if="item.status === 'uploading'" class="absolute inset-x-3 bottom-3">
              <UProgress
                :model-value="typeof item.progress === 'number' ? item.progress : 45"
                color="primary"
              />
            </div>
          </div>

          <div class="space-y-3 p-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-[#243b63]">
                {{ item.name }}
              </p>
              <p v-if="item.description || itemMeta(item)" class="mt-1 text-sm leading-6 text-slate-500">
                {{ item.description || itemMeta(item) }}
              </p>
            </div>

            <UAlert
              v-if="item.status === 'error' && item.error"
              color="error"
              variant="subtle"
              icon="i-ph-warning-octagon-fill"
              :description="item.error"
              class="rounded-[18px]"
            />

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                <Icon :name="statusIcon(item)" class="h-4 w-4" />
                <span>{{ statusLabel(item) }}</span>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  v-if="item.previewUrl && item.previewable !== false"
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="rounded-full"
                  @click="$emit('preview', { item, index })"
                >
                  {{ previewLabel }}
                </UButton>

                <UButton
                  v-if="item.removable !== false"
                  color="error"
                  variant="ghost"
                  size="sm"
                  class="rounded-full"
                  @click="$emit('remove', { item, index })"
                >
                  {{ removeLabel }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
    </div>
</template>

<script setup lang="ts">
type MediaPreviewStatus = "idle" | "uploading" | "ready" | "error"
type MediaPreviewKind = "image" | "video" | "file"

type MediaPreviewItem = {
  id?: string | number
  name: string
  kind?: MediaPreviewKind
  previewUrl?: string
  description?: string
  meta?: string
  sizeLabel?: string
  badge?: string
  removable?: boolean
  previewable?: boolean
  status?: MediaPreviewStatus
  progress?: number
  error?: string
}

const props = withDefaults(defineProps<{
  items?: MediaPreviewItem[]
  emptyTitle?: string
  emptyDescription?: string
  previewLabel?: string
  removeLabel?: string
}>(), {
  items: () => [],
  emptyTitle: "Chưa có tệp nào",
  emptyDescription: "Ảnh, video hoặc tệp đính kèm sẽ xuất hiện ở đây để kiểm tra trước khi gửi.",
  previewLabel: "Xem trước",
  removeLabel: "Gỡ",
})

defineEmits<{
  (e: "preview", payload: { item: MediaPreviewItem, index: number }): void
  (e: "remove", payload: { item: MediaPreviewItem, index: number }): void
}>()

function getKind(item: MediaPreviewItem): MediaPreviewKind {
  if (item.kind) return item.kind

  const source = `${item.previewUrl ?? ""} ${item.name}`.toLowerCase()

  if (/\.(mp4|mov|avi|webm|m4v)/.test(source)) return "video"
  if (/\.(png|jpe?g|gif|webp|svg|avif)/.test(source)) return "image"

  return "file"
}

function itemMeta(item: MediaPreviewItem) {
  return [item.meta, item.sizeLabel].filter(Boolean).join(" • ")
}

function previewLabelForKind(item: MediaPreviewItem) {
  switch (getKind(item)) {
    case "image":
      return "Ảnh"
    case "video":
      return "Video"
    default:
      return "Tệp"
  }
}

function previewIcon(item: MediaPreviewItem) {
  switch (getKind(item)) {
    case "image":
      return "i-ph-image-fill"
    case "video":
      return "i-ph-video-fill"
    default:
      return "i-ph-file-fill"
  }
}

function statusLabel(item: MediaPreviewItem) {
  switch (item.status) {
    case "uploading":
      return "Đang xử lý"
    case "error":
      return "Có lỗi"
    case "ready":
      return "Sẵn sàng"
    default:
      return "Chưa gửi"
  }
}

function statusIcon(item: MediaPreviewItem) {
  switch (item.status) {
    case "uploading":
      return "i-ph-spinner-gap-bold"
    case "error":
      return "i-ph-warning-circle-fill"
    case "ready":
      return "i-ph-check-circle-fill"
    default:
      return "i-ph-clock-countdown-fill"
  }
}
</script>
