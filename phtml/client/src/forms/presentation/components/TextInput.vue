<template>
  <div class="space-y-2">
    <div v-if="label || $slots.meta" class="flex items-center justify-between gap-3">
      <label v-if="label" :for="inputId" class="text-sm font-semibold text-slate-700">
        {{ label }}
      </label>
      <slot name="meta" />
    </div>

    <p v-if="description" class="text-sm text-slate-500">
      {{ description }}
    </p>

    <UInput
      :id="inputId"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      color="primary"
      size="xl"
      class="w-full"
      :ui="inputUi"
      v-bind="attrs"
    />

    <p v-if="error" class="text-sm font-medium text-rose-600">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-sm text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAttrs, useId } from "vue"

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ default: "" })
const attrs = useAttrs()
const generatedId = useId()

const props = withDefaults(defineProps<{
  label?: string
  description?: string
  hint?: string
  error?: string
  id?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  label: "",
  description: "",
  hint: "",
  error: "",
  id: "",
  type: "text",
  placeholder: "",
  disabled: false,
})

const inputId = computed(() => props.id || generatedId)

const inputUi = {
  base: "h-[3.25rem] rounded-[1.1rem] px-4 text-[0.98rem]",
}
</script>
