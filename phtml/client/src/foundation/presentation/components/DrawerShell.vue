<template>
  <UDrawer
    :open="open"
    :title="title"
    :description="description || undefined"
    :direction="direction"
    :dismissible="resolvedDismissible"
    :overlay="overlay"
    :handle="handle"
    :inset="inset"
    :class="drawerClass"
    v-bind="attrs"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div :class="bodyClass">
        <UAlert
          v-if="notice"
          :color="notice.color"
          variant="subtle"
          :icon="notice.icon"
          :title="notice.title"
          :description="notice.description"
          class="rounded-[22px]"
          aria-live="polite"
        />

        <slot />
      </div>
    </template>

    <template v-if="hasFooter" #footer>
      <div :class="footerClass">
        <slot name="footer">
          <UButton
            v-if="cancelLabel"
            type="button"
            color="neutral"
            variant="outline"
            class="justify-center rounded-full"
            :disabled="cancelDisabled || isBusy"
            @click="handleCancel"
          >
            {{ cancelLabel }}
          </UButton>

          <UButton
            v-if="confirmLabel"
            type="button"
            :color="confirmColor"
            class="justify-center rounded-full"
            :loading="confirmLoading"
            :disabled="confirmDisabled || isBusy"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </UButton>
        </slot>
      </div>
    </template>
  </UDrawer>
</template>

<script setup lang="ts">
import { useAttrs, useSlots } from "vue"

defineOptions({ inheritAttrs: false })

type ShellStatus = "idle" | "loading" | "success" | "error"
type ShellColor = "neutral" | "primary" | "success" | "warning" | "error"
type DrawerDirection = "top" | "right" | "bottom" | "left"

const attrs = useAttrs()
const slots = useSlots()

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  direction?: DrawerDirection
  dismissible?: boolean
  overlay?: boolean
  handle?: boolean
  inset?: boolean
  bodyClass?: string
  footerClass?: string
  cancelLabel?: string
  confirmLabel?: string
  cancelDisabled?: boolean
  confirmDisabled?: boolean
  confirmLoading?: boolean
  confirmColor?: ShellColor
  status?: ShellStatus
  statusTitle?: string
  statusDescription?: string
}>(), {
  description: "",
  direction: "bottom",
  dismissible: true,
  overlay: true,
  handle: true,
  inset: false,
  bodyClass: "space-y-5",
  footerClass: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
  cancelLabel: "",
  confirmLabel: "",
  cancelDisabled: false,
  confirmDisabled: false,
  confirmLoading: false,
  confirmColor: "primary",
  status: "idle",
  statusTitle: "",
  statusDescription: "",
})

const emit = defineEmits<{
  close: []
  cancel: []
  confirm: []
  "update:open": [open: boolean]
}>()

const statusMeta: Record<Exclude<ShellStatus, "idle">, { color: ShellColor, icon: string, title: string }> = {
  loading: {
    color: "primary",
    icon: "i-ph-spinner-gap-bold",
    title: "Dang xu ly",
  },
  success: {
    color: "success",
    icon: "i-ph-check-circle-fill",
    title: "Hoan tat",
  },
  error: {
    color: "warning",
    icon: "i-ph-warning-circle-fill",
    title: "Can kiem tra lai",
  },
}

const isBusy = computed(() => props.confirmLoading || props.status === "loading")

const resolvedDismissible = computed(() => props.dismissible && !isBusy.value)

const drawerClass = computed(() => [
  "w-full sm:max-w-xl",
  props.inset ? "px-2 sm:px-4" : "",
])

const hasFooter = computed(() => Boolean(slots.footer || props.cancelLabel || props.confirmLabel))

const notice = computed(() => {
  if (props.status === "idle" && !props.statusTitle && !props.statusDescription) {
    return null
  }

  if (props.status === "idle") {
    return {
      color: "neutral" as const,
      icon: "i-ph-info-fill",
      title: props.statusTitle,
      description: props.statusDescription,
    }
  }

  const meta = statusMeta[props.status]

  return {
    color: meta.color,
    icon: meta.icon,
    title: props.statusTitle || meta.title,
    description: props.statusDescription,
  }
})

function handleOpenChange(nextOpen: boolean) {
  emit("update:open", nextOpen)

  if (!nextOpen) {
    emit("close")
  }
}

function handleCancel() {
  emit("cancel")
  handleOpenChange(false)
}
</script>
