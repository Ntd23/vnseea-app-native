<template>
  <div class="surface-card p-5 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <h3 class="text-sm font-black text-[var(--text-primary)] tracking-tight">{{ t("pages.profilePage.completionTitle") }}</h3>
        <p class="text-xs font-medium text-[var(--text-primary)] leading-relaxed">{{ t("pages.profilePage.completionDescription") }}</p>
      </div>
      <UButton
        color="gray"
        variant="soft"
        size="md"
        class="font-black px-5 rounded-full"
      >
        {{ t("pages.profilePage.completionAction") }}
      </UButton>
    </div>
    <div class="flex flex-wrap gap-2">
      <UBadge
        v-for="item in items"
        :key="item"
        variant="soft"
        color="primary"
        size="md"
        class="rounded-full font-bold px-3"
      >
        {{ item }}
      </UBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{ items: string[] }>()
</script>
