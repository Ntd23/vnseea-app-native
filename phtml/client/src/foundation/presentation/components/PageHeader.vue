<template>
  <component
    :is="as"
    :class="wrapperClass"
    v-bind="attrs"
  >
    <div :class="contentClass">
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

      <div
        :class="[
          'flex gap-3',
          compact ? 'items-start' : 'items-start sm:items-center',
          align === 'center' ? 'flex-col text-center' : 'flex-row text-left',
        ]"
      >
        <div
          v-if="icon"
          :class="[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--text-primary)]',
            align === 'center' ? 'mx-auto' : '',
          ]"
        >
          <Icon :name="icon" class="h-6 w-6" />
        </div>

        <div class="min-w-0 flex-1 space-y-2">
          <component
            :is="titleTag"
            class="text-[2rem] font-black leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.6rem]"
          >
            {{ title }}
          </component>

          <p
            v-if="description"
            class="max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base"
          >
            {{ description }}
          </p>

          <div v-if="$slots.meta" class="pt-1">
            <slot name="meta" />
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="$slots.trailing"
      :class="[
        'shrink-0',
        align === 'center' ? 'mx-auto' : '',
      ]"
    >
      <slot name="trailing" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ inheritAttrs: false })

type ShellColor = "neutral" | "primary" | "success" | "warning" | "error"
type HeaderAlign = "start" | "center"
type HeaderTag = "h1" | "h2" | "h3"

const attrs = useAttrs()

const props = withDefaults(defineProps<{
  title: string
  eyebrow?: string
  description?: string
  badge?: string
  badgeColor?: ShellColor
  icon?: string
  align?: HeaderAlign
  compact?: boolean
  as?: string
  titleTag?: HeaderTag
}>(), {
  eyebrow: "",
  description: "",
  badge: "",
  badgeColor: "primary",
  icon: "",
  align: "start",
  compact: false,
  as: "header",
  titleTag: "h1",
})

const wrapperClass = computed(() => [
  "mb-6 flex flex-col gap-4",
  props.align === "center"
    ? "text-center"
    : "md:flex-row md:items-end md:justify-between",
])

const contentClass = computed(() => [
  "min-w-0 space-y-3",
  props.align === "center" ? "mx-auto max-w-3xl" : "flex-1",
])
</script>
