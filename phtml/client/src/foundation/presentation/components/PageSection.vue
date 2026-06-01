<template>
  <UCard
    :as="as"
    :class="sectionClass"
    :ui="cardUi"
    v-bind="attrs"
  >
    <template v-if="hasHeader" #header>
      <slot v-if="$slots.header" name="header" />

      <div
        v-else
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0 flex-1 space-y-3">
          <div
            v-if="eyebrow || badge"
            class="flex flex-wrap items-center gap-2"
          >
            <p
              v-if="eyebrow"
              class="text-label-secondary text-[var(--text-primary)]"
            >
              {{ eyebrow }}
            </p>

            <UBadge
              v-if="badge"
              :color="badgeColor"
              variant="subtle"
              class="rounded-full px-3 py-1 text-[11px] font-semibold"
            >
              {{ badge }}
            </UBadge>
          </div>

          <div class="flex items-start gap-3">
            <div
              v-if="icon"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--text-primary)]"
            >
              <Icon :name="icon" class="h-5 w-5" />
            </div>

            <div class="min-w-0 space-y-2">
              <h2
                v-if="title"
                class="text-2xl font-black tracking-[-0.03em] text-[var(--text-primary)]"
              >
                {{ title }}
              </h2>

              <p
                v-if="description"
                class="text-sm leading-6 text-[var(--text-secondary)]"
              >
                {{ description }}
              </p>
            </div>
          </div>
        </div>

        <slot name="actions" />
      </div>
    </template>

    <div :class="contentClass">
      <UAlert
        v-if="noticeTitle || noticeDescription"
        :color="noticeColor"
        variant="subtle"
        :icon="noticeIcon || 'i-ph-info-fill'"
        :title="noticeTitle || undefined"
        :description="noticeDescription || undefined"
        class="rounded-[20px]"
        aria-live="polite"
      />

      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { useAttrs, useSlots } from "vue"

defineOptions({ inheritAttrs: false })

type SectionTone = "default" | "soft" | "muted"
type ShellColor = "neutral" | "primary" | "success" | "warning" | "error"

const attrs = useAttrs()
const slots = useSlots()

const props = withDefaults(defineProps<{
  as?: string
  tone?: SectionTone
  compact?: boolean
  title?: string
  description?: string
  eyebrow?: string
  badge?: string
  badgeColor?: ShellColor
  icon?: string
  noticeTitle?: string
  noticeDescription?: string
  noticeColor?: ShellColor
  noticeIcon?: string
}>(), {
  as: "section",
  tone: "default",
  compact: false,
  title: "",
  description: "",
  eyebrow: "",
  badge: "",
  badgeColor: "neutral",
  icon: "",
  noticeTitle: "",
  noticeDescription: "",
  noticeColor: "neutral",
  noticeIcon: "",
})

const toneClassMap: Record<SectionTone, string> = {
  default: "border-[var(--border-light)] bg-white",
  soft: "border-[var(--border-light)] bg-white/92",
  muted: "border-[var(--border-default)] bg-[var(--bg-surface-hover)]",
}

const hasHeader = computed(() =>
  Boolean(
    slots.header
    || slots.actions
    || props.title
    || props.description
    || props.eyebrow
    || props.badge
    || props.icon,
  ),
)

const sectionClass = computed(() => [
  "rounded-[28px] shadow-[var(--shadow-md)]",
  toneClassMap[props.tone],
])

const contentClass = computed(() => (props.compact ? "space-y-4" : "space-y-5"))

const cardUi = computed(() => {
  const headerPadding = props.compact
    ? "px-4 pt-4 pb-0 sm:px-5 sm:pt-5"
    : "px-4 pt-4 pb-0 sm:px-6 sm:pt-6"
  const bodyPadding = hasHeader.value
    ? (props.compact ? "px-4 pt-4 pb-4 sm:px-5 sm:pb-5" : "px-4 pt-4 pb-4 sm:px-6 sm:pb-6")
    : (props.compact ? "p-4 sm:p-5" : "p-4 sm:p-6")
  const footerPadding = props.compact
    ? "px-4 pt-0 pb-4 sm:px-5 sm:pb-5"
    : "px-4 pt-0 pb-4 sm:px-6 sm:pb-6"

  return {
    header: headerPadding,
    body: bodyPadding,
    footer: footerPadding,
  }
})
</script>
