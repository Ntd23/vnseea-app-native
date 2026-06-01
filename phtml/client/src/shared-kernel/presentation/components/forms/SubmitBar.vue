<template>
  <UCard
    class="rounded-[28px] border border-[#dbe3f2] bg-white/90 shadow-[0_14px_34px_rgba(15,35,110,0.07)]"
    :ui="{ body: 'p-4 sm:p-5' }"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0 flex-1 space-y-3">
        <UAlert
          v-if="noticeDescription"
          :color="noticeColor"
          variant="subtle"
          :icon="noticeIcon"
          :title="noticeTitle || undefined"
          :description="noticeDescription"
          class="rounded-[20px]"
        />

        <UProgress
          v-if="status === 'saving' || status === 'submitting'"
          :model-value="typeof progress === 'number' ? progress : 48"
          color="primary"
        />
      </div>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <UButton
          v-if="showSave"
          color="neutral"
          variant="outline"
          class="justify-center rounded-full btn-primary"
          :disabled="disabled || saveDisabled"
          :loading="saveLoading || status === 'saving'"
          @click="$emit('save')"
        >
          {{ saveLabel }}
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          class="justify-center rounded-full btn-primary"
          :disabled="disabled || submitDisabled"
          :loading="loading || status === 'submitting'"
          @click="$emit('submit')"
        >
          {{ submitText }}
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
type SubmitBarStatus = "idle" | "saving" | "submitting" | "success" | "error"

const props = withDefaults(defineProps<{
  hint?: string
  cta?: string
  saveLabel?: string
  submitLabel?: string
  showSave?: boolean
  disabled?: boolean
  loading?: boolean
  saveDisabled?: boolean
  submitDisabled?: boolean
  saveLoading?: boolean
  status?: SubmitBarStatus
  statusTitle?: string
  statusDescription?: string
  progress?: number | null
}>(), {
  hint: "",
  cta: "Tiếp tục",
  saveLabel: "Lưu nháp",
  submitLabel: "",
  showSave: true,
  disabled: false,
  loading: false,
  saveDisabled: false,
  submitDisabled: false,
  saveLoading: false,
  status: "idle",
  statusTitle: "",
  statusDescription: "",
  progress: null,
})

defineEmits<{
  (e: "save"): void
  (e: "submit"): void
}>()

const submitText = computed(() => props.submitLabel || props.cta)

const noticeColor = computed(() => {
  if (props.status === "error") return "error"
  if (props.status === "success") return "success"
  if (props.status === "saving" || props.status === "submitting") return "primary"
  return "primary"
})

const noticeIcon = computed(() => {
  if (props.status === "error") return "i-ph-warning-octagon-fill"
  if (props.status === "success") return "i-ph-check-circle-fill"
  if (props.status === "saving") return "i-ph-floppy-disk-back-fill"
  if (props.status === "submitting") return "i-ph-paper-plane-tilt-fill"
  return "i-ph-info-fill"
})

const noticeTitle = computed(() => {
  if (props.statusTitle) return props.statusTitle
  if (props.status === "saving") return "Đang lưu nháp"
  if (props.status === "submitting") return "Đang xử lý"
  if (props.status === "success") return "Hoàn tất"
  if (props.status === "error") return "Cần kiểm tra lại"
  return ""
})

const noticeDescription = computed(() => props.statusDescription || props.hint)
</script>
