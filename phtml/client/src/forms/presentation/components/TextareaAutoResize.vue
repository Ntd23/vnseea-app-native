<template>
  <div class="space-y-2">
    <label v-if="label" :for="inputId" class="block text-sm font-semibold text-slate-700">
      {{ label }}
    </label>

    <p v-if="description" class="text-sm text-slate-500">
      {{ description }}
    </p>

    <UTextarea
      :id="inputId"
      v-model="model"
      autoresize
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      color="primary"
      size="xl"
      class="w-full"
      :ui="textareaUi"
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
  placeholder?: string
  rows?: number
  disabled?: boolean
}>(), {
  label: "",
  description: "",
  hint: "",
  error: "",
  id: "",
  placeholder: "",
  rows: 4,
  disabled: false,
})

const inputId = computed(() => props.id || generatedId)

const textareaUi = {
  base: "min-h-28 rounded-[1.25rem] px-4 py-4 text-[0.98rem] leading-7",
}
</script>
