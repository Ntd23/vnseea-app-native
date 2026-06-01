<template>
  <div class="space-y-4" role="status" aria-live="polite" aria-busy="true">
    <span class="sr-only">{{ label }}</span>

    <UCard
      v-for="item in skeletonItems"
      :key="item"
      class="rounded-[28px] border border-[var(--border-light)] bg-white shadow-[var(--shadow-md)]"
      :ui="cardUi"
    >
      <template v-if="variant === 'detail'">
        <div class="space-y-5">
          <USkeleton class="h-56 w-full rounded-[24px]" />

          <div class="space-y-3">
            <USkeleton class="h-5 w-2/3 rounded-full" />
            <USkeleton class="h-4 w-1/3 rounded-full" />
          </div>

          <div class="space-y-3">
            <USkeleton
              v-for="width in lineWidths"
              :key="`${item}-${width}`"
              :class="['h-4 rounded-full', width]"
            />
          </div>
        </div>
      </template>

      <template v-else-if="variant === 'list'">
        <div class="flex gap-4">
          <USkeleton class="h-16 w-16 shrink-0 rounded-2xl" />

          <div class="min-w-0 flex-1 space-y-3">
            <USkeleton class="h-4 w-2/5 rounded-full" />
            <USkeleton
              v-for="width in lineWidths"
              :key="`${item}-${width}`"
              :class="['h-4 rounded-full', width]"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="space-y-5">
          <div class="flex items-center gap-3">
            <USkeleton
              v-if="showAvatar"
              class="h-11 w-11 rounded-full"
            />

            <div class="min-w-0 flex-1 space-y-2">
              <USkeleton class="h-4 w-32 rounded-full" />
              <USkeleton class="h-3 w-24 rounded-full" />
            </div>
          </div>

          <div class="space-y-3">
            <USkeleton
              v-for="width in lineWidths"
              :key="`${item}-${width}`"
              :class="['h-4 rounded-full', width]"
            />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
type SkeletonVariant = "card" | "list" | "detail"

const props = withDefaults(defineProps<{
  count?: number
  rows?: number
  variant?: SkeletonVariant
  label?: string
  showAvatar?: boolean
}>(), {
  count: 1,
  rows: 3,
  variant: "card",
  label: "Loading content",
  showAvatar: true,
})

const skeletonItems = computed(() =>
  Array.from({ length: Math.max(props.count, 1) }, (_, index) => index),
)

const lineWidths = computed(() => {
  const presets = ["w-full", "w-[92%]", "w-[74%]", "w-[58%]"]
  return presets.slice(0, Math.min(Math.max(props.rows, 1), presets.length))
})

const cardUi = computed(() => ({
  body: props.variant === "detail" ? "p-6" : "p-5",
}))
</script>
