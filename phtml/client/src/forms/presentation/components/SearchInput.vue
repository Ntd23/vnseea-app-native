<template>
  <div class="space-y-2">
    <label v-if="label" :for="inputId" class="block text-sm font-semibold text-slate-700">
      {{ label }}
    </label>

    <p v-if="description" class="text-sm text-slate-500">
      {{ description }}
    </p>

    <UInput
      :id="inputId"
      v-model="model"
      type="search"
      :placeholder="placeholder"
      :disabled="disabled"
      color="primary"
      size="lg"
      class="w-full"
      leading-icon="i-ph-magnifying-glass-bold"
      :ui="inputUi"
      v-bind="attrs"
      @keydown.esc.prevent="clearValue"
    >
      <template v-if="clearable && model" #trailing>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#eef3ff] hover:text-[#0000ff]"
          :aria-label="clearLabel"
          @click="clearValue"
        >
          <Icon name="i-ph-x-bold" class="h-4 w-4" />
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
  clearable?: boolean
  clearLabel?: string
}>(), {
  label: "",
  description: "",
  hint: "",
  error: "",
  id: "",
  placeholder: "",
  disabled: false,
  clearable: true,
  clearLabel: "Clear search",
})

const inputId = computed(() => props.id || generatedId)

const inputUi = {
  base: "h-11 rounded-full px-4 text-sm",
  leadingIcon: "text-[#8090d8]",
}

function clearValue() {
  model.value = ""
}
</script>
