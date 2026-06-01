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
      :type="show ? 'text' : 'password'"
      :placeholder="placeholder"
      :disabled="disabled"
      color="primary"
      size="xl"
      class="w-full"
      :ui="inputUi"
      v-bind="attrs"
    >
      <template #trailing>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#eef3ff] hover:text-[#0000ff]"
          :aria-label="show ? hideLabel : showLabel"
          @click="show = !show"
        >
          <Icon :name="show ? 'i-ph-eye-slash-bold' : 'i-ph-eye-bold'" class="h-5 w-5" />
        </button>
      </template>
    </UInput>

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
const show = ref(false)
const attrs = useAttrs()
const generatedId = useId()

const props = withDefaults(defineProps<{
  label?: string
  description?: string
  hint?: string
  error?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  showLabel?: string
  hideLabel?: string
}>(), {
  label: "",
  description: "",
  hint: "",
  error: "",
  id: "",
  placeholder: "",
  disabled: false,
  showLabel: "Show password",
  hideLabel: "Hide password",
})

const inputId = computed(() => props.id || generatedId)

const inputUi = {
  base: "h-[3.25rem] rounded-[1.1rem] px-4 pe-14 text-[0.98rem]",
}
</script>
