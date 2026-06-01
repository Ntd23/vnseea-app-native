<template>
  <div
    class="rounded-[28px] border border-dashed border-[var(--border-strong)] bg-white px-6 py-14 text-center shadow-[var(--shadow-md)]"
    role="status"
    aria-live="polite"
  >
    <div class="relative mx-auto flex h-16 w-16 items-center justify-center">
      <div class="absolute inset-0 rounded-[20px] bg-[var(--color-primary-50)]" />
      <div class="absolute inset-0 animate-ping rounded-[20px] bg-[var(--color-primary-50)] opacity-60" />
      <Icon name="i-ph-newspaper-clipping-fill" class="relative h-8 w-8 text-[var(--color-primary-400)]" />
    </div>

    <h3 class="mt-5 text-[1.25rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">
      {{ $t("pages.blogsPage.emptyTitle") }}
    </h3>
    <p class="mx-auto mt-2 max-w-[380px] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
      {{ $t("pages.blogsPage.emptyDescription") }}
    </p>

    <button
      class="blogs-empty__reset mt-6 inline-flex items-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-primary-500)] px-6 py-3 text-[13.5px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)]"
      type="button"
      @click="$emit('reset')"
    >
      <Icon name="i-ph-arrow-counter-clockwise" class="h-4 w-4" />
      <span>{{ $t("pages.blogsPage.viewAll") }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  reset: []
}>()
</script>

<style scoped>
.blogs-empty__reset {
  position: relative;
  z-index: 2;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.blogs-empty__reset > * {
  pointer-events: none;
}
</style>
