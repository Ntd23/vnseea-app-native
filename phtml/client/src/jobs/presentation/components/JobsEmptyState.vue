<!-- English description: Shows the empty state for the jobs directory when the active filters return no backend jobs. -->
<template>
  <UCard
    class="rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
    :ui="{ body: 'p-8 sm:p-10' }"
  >
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-surface-active)] text-[var(--icon-brand)]">
        <Icon name="i-ph-briefcase" class="h-8 w-8" />
      </div>
      <div class="space-y-2">
        <h3 class="text-xl font-[800] text-[var(--text-primary)]">
          {{ $t("pages.jobsPage.emptyTitle") }}
        </h3>
        <p class="max-w-[560px] text-sm leading-6 text-[var(--text-secondary)]">
          {{ $t("pages.jobsPage.emptyDescription") }}
        </p>
      </div>
      <UButton color="neutral" variant="outline" class="rounded-full" @click="emit('reset')">
        {{ $t("pages.jobsPage.viewAll") }}
      </UButton>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  reset: []
}>()
</script>
