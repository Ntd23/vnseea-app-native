<template>
  <UDropdownMenu
    :items="items"
    :size="size"
    :disabled="disabled"
    :arrow="arrow"
    :portal="portal"
    :content="resolvedContent"
    :filter="filter"
    :filter-fields="filterFields"
    :search-term="searchTerm"
    v-bind="attrs"
    @update:open="emit('update:open', $event)"
    @update:search-term="emit('update:searchTerm', $event)"
  >
    <template #default="{ open }">
      <slot :open="open">
        <UButton
          :color="color"
          :variant="variant"
          :size="size"
          class="justify-between rounded-full"
          :aria-label="ariaLabel || label"
          :disabled="disabled"
        >
          <span class="flex items-center gap-2">
            <Icon :name="icon" class="h-4 w-4" />
            <span class="truncate">{{ label }}</span>
          </span>

          <Icon
            :name="open ? 'i-ph-caret-up-bold' : 'i-ph-caret-down-bold'"
            class="h-4 w-4"
          />
        </UButton>
      </slot>
    </template>

    <template #empty="{ searchTerm: term }">
      <slot name="empty" :search-term="term">
        <div class="w-72 space-y-1 px-2 py-1.5" role="status" aria-live="polite">
          <p class="text-sm font-bold text-[var(--text-primary)]">
            {{ emptyTitle }}
          </p>
          <p class="text-[13px] leading-5 text-[var(--text-secondary)]">
            {{ term ? emptyDescription : emptyIdleDescription }}
          </p>
        </div>
      </slot>
    </template>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ inheritAttrs: false })

type ShellColor = "neutral" | "primary" | "success" | "warning" | "error"
type ButtonVariant = "solid" | "outline" | "soft" | "subtle" | "ghost" | "link"
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl"
type DropdownShellItem = {
  label?: string
  description?: string
  icon?: string
  type?: "label" | "separator" | "link" | "checkbox"
  disabled?: boolean
  checked?: boolean
  loading?: boolean
  slot?: string
  kbds?: Array<string | Record<string, unknown>>
  children?: DropdownShellItem[] | DropdownShellItem[][]
  onSelect?: (event: Event) => void
  onUpdateChecked?: (checked: boolean) => void
  [key: string]: unknown
}

const attrs = useAttrs()

const props = withDefaults(defineProps<{
  items?: DropdownShellItem[] | DropdownShellItem[][]
  label?: string
  icon?: string
  color?: ShellColor
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  arrow?: boolean | Record<string, unknown>
  portal?: boolean | string
  filter?: boolean | Record<string, unknown>
  filterFields?: string[]
  searchTerm?: string
  content?: Record<string, unknown>
  ariaLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyIdleDescription?: string
}>(), {
  items: () => [],
  label: "Tuy chon",
  icon: "i-ph-dots-three-outline-fill",
  color: "neutral",
  variant: "outline",
  size: "md",
  disabled: false,
  arrow: false,
  portal: true,
  filter: false,
  filterFields: () => [],
  searchTerm: "",
  content: () => ({}),
  ariaLabel: "",
  emptyTitle: "Khong co muc phu hop",
  emptyDescription: "Thu thay tu khoa khac hoac bo bot bo loc.",
  emptyIdleDescription: "Chua co hanh dong nao kha dung trong menu nay.",
})

const emit = defineEmits<{
  "update:open": [open: boolean]
  "update:searchTerm": [value: string]
}>()

const resolvedContent = computed(() => ({
  side: "bottom",
  sideOffset: 8,
  collisionPadding: 12,
  ...props.content,
}))
</script>
