<template>
  <UPopover :popper="{ placement: 'top-end' }">
    <UButton
      variant="soft"
      color="white"
      class="h-10 w-10 flex items-center justify-center text-[var(--text-primary)] hover:text-secondary-900 transition-colors shadow-none p-0"
      square
    >
      <Icon name="i-ph-smiley-duotone" class="h-6 w-6" />
    </UButton>

    <template #panel>
      <div class="p-4 grid grid-cols-6 gap-2 bg-white rounded-2xl shadow-2xl ring-1 ring-secondary-100 max-w-[280px]">
        <button
          v-for="emoji in popularEmojis"
          :key="emoji"
          class="text-xl transition-all hover:scale-125 active:scale-95 p-1"
          @click="$emit('select', emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const popularEmojis = ['😀', '😂', '🥰', '😍', '😎', '🤩', '😘', '😋', '😛', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴']

defineEmits<{
  select: [emoji: string]
}>()
</script>
