<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-[1.02rem] font-black text-[#2f3542]">Hình ảnh</p>
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
      :label="uploadLabel"
      description="Mock UI: chọn ảnh local để kiểm tra flow hiển thị và preview."
      class="w-full"
    />

    <UProgress
      :model-value="Math.min((filesModel.length / fileLimit) * 100, 100)"
      color="primary"
      size="sm"
    />

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-ph-images-fill"
      :description="`Đang chọn ${filesModel.length}/${fileLimit} ảnh. Ảnh local chỉ phục vụ preview UI.`"
      class="rounded-[20px]"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  imageButtonLabel: string
  fileLimit?: number
  uploadLabel?: string
}>(), {
  fileLimit: 10,
  uploadLabel: "Tải ảnh sản phẩm",
})

const filesModel = defineModel<File[]>("files", {
  required: true,
  default: () => [],
})
</script>
