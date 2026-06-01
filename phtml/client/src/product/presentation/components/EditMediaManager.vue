<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-[1.02rem] font-black text-[#2f3542]">Ảnh hiện tại</p>
        <UBadge color="warning" variant="subtle" class="rounded-full px-3 py-1.5 text-[12px] font-semibold">
          {{ removedCount }} ảnh sẽ bị xóa
        </UBadge>
      </div>

      <div class="grid min-h-[104px] gap-3 rounded-[24px] border border-[#dbe3f2] bg-[#f8fbff] p-4 sm:grid-cols-2 xl:grid-cols-3">
        <template v-if="currentImages.length > 0">
          <UCard
            v-for="image in currentImages"
            :key="image.id"
            class="overflow-hidden rounded-[20px] border border-[#dbe3f2] bg-white"
            :ui="{ body: 'p-3' }"
          >
            <div class="relative overflow-hidden rounded-[16px]">
              <NuxtImg
                :src="image.src"
                :alt="image.alt"
                width="320"
                height="220"
                class="h-36 w-full object-cover"
              />
            </div>

            <div class="mt-3 flex items-start justify-between gap-3">
              <div>
                <p class="text-[13px] font-semibold text-[#243b63]">{{ image.alt }}</p>
                <p class="mt-1 text-[12px] text-slate-400">ID: {{ image.id }}</p>
              </div>

              <UButton
                color="error"
                variant="soft"
                size="xs"
                icon="i-ph-trash"
                @click="$emit('removeCurrentImage', image.id)"
              />
            </div>
          </UCard>
        </template>

        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-ph-image-broken"
          class="sm:col-span-2 xl:col-span-3"
          description="Không còn ảnh cũ nào được giữ lại."
        />
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-[1.02rem] font-black text-[#2f3542]">Ảnh mới</p>
        <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1.5">
          {{ imageButtonLabel }}
        </UBadge>
      </div>

      <UFileUpload
        v-model="filesModel"
        multiple
        accept="image/*"
        layout="grid"
        highlight
        label="Bổ sung ảnh mới"
        description="Ảnh local chỉ dùng cho preview UI trước khi nối upload thật."
        class="w-full"
      />

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-ph-images-square-fill"
        :description="`Đang thêm ${filesModel.length} ảnh mới. Ảnh cũ có thể bỏ khỏi tin đăng trước khi lưu.`"
        class="rounded-[20px]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductCurrentImage } from "../../domain/types/product-editor.types"

defineProps<{
  currentImages: ProductCurrentImage[]
  removedCount: number
  imageButtonLabel: string
}>()

const filesModel = defineModel<File[]>("files", {
  required: true,
  default: () => [],
})

defineEmits<{
  (e: "removeCurrentImage", imageId: string): void
}>()
</script>
