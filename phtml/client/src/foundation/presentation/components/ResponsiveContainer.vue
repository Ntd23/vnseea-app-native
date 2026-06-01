<template>
  <UContainer
    :as="as"
    :class="containerClass"
    v-bind="attrs"
  >
    <slot />
  </UContainer>
</template>

<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ inheritAttrs: false })

type ContainerSize = "default" | "wide" | "reading" | "full"
type ContainerGutter = "compact" | "default" | "relaxed"

const attrs = useAttrs()

const props = withDefaults(defineProps<{
  as?: string
  padded?: boolean
  size?: ContainerSize
  gutter?: ContainerGutter
}>(), {
  as: "div",
  padded: false,
  size: "default",
  gutter: "default",
})

const sizeClassMap: Record<ContainerSize, string> = {
  default: "max-w-7xl",
  wide: "max-w-[90rem]",
  reading: "max-w-4xl",
  full: "max-w-none",
}

const gutterClassMap: Record<ContainerGutter, string> = {
  compact: "px-4 sm:px-5",
  default: "px-4 sm:px-6 xl:px-8",
  relaxed: "px-5 sm:px-8 xl:px-10",
}

const containerClass = computed(() => [
  "w-full",
  sizeClassMap[props.size],
  gutterClassMap[props.gutter],
  props.padded ? "py-6 md:py-8" : "",
])
</script>
