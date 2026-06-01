<template>
  <UCard
    :as="as"
    class="rounded-[28px] border-dashed border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]"
    :ui="cardUi"
    v-bind="attrs"
  >
    <div
      :class="wrapperClass"
      role="status"
      aria-live="polite"
    >
      <div :class="iconWrapperClass">
        <Icon :name="icon" class="h-7 w-7" />
      </div>

      <div class="min-w-0 space-y-3">
        <div
          v-if="eyebrow || badge"
          :class="[
            'flex flex-wrap items-center gap-2',
            align === 'center' ? 'justify-center' : 'justify-start',
          ]"
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

        <div class="space-y-2">
          <h3 class="text-xl font-black tracking-[-0.03em] text-[var(--text-primary)] break-words">
            {{ title }}
          </h3>
          <p class="mx-auto max-w-2xl text-sm leading-6 text-[var(--text-secondary)] break-words">
            {{ description }}
          </p>
        </div>

        <slot />
      </div>

      <div
        v-if="hasActions"
        :class="[
          'flex flex-col gap-2 sm:flex-row',
          align === 'center' ? 'justify-center' : 'justify-start',
        ]"
      >
        <slot name="actions">
          <UButton
            v-if="secondaryLabel"
            type="button"
            color="neutral"
            variant="outline"
            class="justify-center rounded-full"
            :disabled="secondaryDisabled"
            @click="emit('secondary')"
          >
            {{ secondaryLabel }}
          </UButton>

          <UButton
            v-if="primaryLabel"
            type="button"
            :color="primaryColor"
            class="justify-center rounded-full"
            :loading="primaryLoading"
            :disabled="primaryDisabled"
            @click="emit('primary')"
          >
            {{ primaryLabel }}
          </UButton>
        </slot>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useAttrs, useSlots } from "vue"

defineOptions({ inheritAttrs: false })

type ShellColor = "neutral" | "primary" | "success" | "warning" | "error"
type EmptyStateAlign = "center" | "start"

const attrs = useAttrs()
const slots = useSlots()

const props = withDefaults(defineProps<{
  title: string
  description: string
  icon?: string
  eyebrow?: string
  badge?: string
  badgeColor?: ShellColor
  align?: EmptyStateAlign
  compact?: boolean
  as?: string
  primaryLabel?: string
  secondaryLabel?: string
  primaryColor?: ShellColor
  primaryLoading?: boolean
  primaryDisabled?: boolean
  secondaryDisabled?: boolean
}>(), {
  icon: "i-lucide-inbox",
  eyebrow: "",
  badge: "",
  badgeColor: "neutral",
  align: "center",
  compact: false,
  as: "section",
  primaryLabel: "",
  secondaryLabel: "",
  primaryColor: "primary",
  primaryLoading: false,
  primaryDisabled: false,
  secondaryDisabled: false,
})

const emit = defineEmits<{
  primary: []
  secondary: []
}>()

const cardUi = computed(() => ({
  body: props.compact ? "p-5 sm:p-6" : "p-6 sm:p-8",
}))

const wrapperClass = computed(() => [
  "space-y-5",
  props.align === "center" ? "text-center" : "text-left",
])

const iconWrapperClass = computed(() => [
  "flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--text-primary)]",
  props.align === "center" ? "mx-auto" : "",
])

const hasActions = computed(() => Boolean(slots.actions || props.primaryLabel || props.secondaryLabel))
</script>
