<template>
  <div class="space-y-2">
    <div class="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-4">
      <USwitch
        v-model="model"
        :label="label"
        :description="description"
        :disabled="disabled"
        color="primary"
        size="lg"
        class="items-start"
      />
    </div>

    <p v-if="error" class="text-sm font-medium text-rose-600">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-sm text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ default: false })

withDefaults(defineProps<{
  label: string
  description?: string
  hint?: string
  error?: string
  disabled?: boolean
}>(), {
  description: "",
  hint: "",
  error: "",
  disabled: false,
})
</script>
