<template>
  <aside class="space-y-5">
    <UCard
      class="overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]"
      :ui="{ body: 'p-0' }"
      role="status"
      aria-live="polite"
    >
      <div class="relative aspect-[16/10] overflow-hidden">
        <div aria-hidden="true" class="absolute inset-0" :style="{ background: thumbnailBackground }" />
        <div class="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(15,23,42,0.58)_100%)]" />
        <UBadge
          color="neutral"
          variant="solid"
          class="absolute left-4 top-4 rounded-[10px] bg-[#101828]/82 px-2.5 py-1 text-[11px] font-bold text-white"
        >
          {{ selectedCategoryLabel }}
        </UBadge>
      </div>

      <div class="p-4">
        <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[var(--text-primary)]">
          {{ $t("pages.createBlogPage.sidebarMeta", { minutes: readMinutes, tags: tagList.length }) }}
        </UBadge>
        <h3 class="mt-2 text-[1.25rem] font-black leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
          {{ title || $t("pages.createBlogPage.sidebarTitleFallback") }}
        </h3>
        <p class="mt-3 min-h-[96px] text-[13px] leading-6 text-[var(--text-secondary)]">
          {{ previewExcerpt }}
        </p>
        <div class="mt-4 flex flex-wrap gap-1.5">
          <span
            v-for="tag in tagList"
            :key="tag"
            class="rounded-[var(--radius-full)] bg-[var(--color-primary-50)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-primary)]"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </UCard>

    <UCard
      class="rounded-[28px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]"
      :ui="{ body: 'p-5' }"
    >
      <p id="create-blog-checklist-title" class="text-label-secondary text-[var(--text-primary)]">
        {{ $t("pages.createBlogPage.checklist") }}
      </p>
      <div class="mt-4 space-y-3" role="list" aria-labelledby="create-blog-checklist-title">
        <div
          v-for="item in checklistItems"
          :key="item.label"
          class="flex items-start gap-3 rounded-[18px] border px-3.5 py-3"
          :class="item.done ? 'border-[#b8f0c9] bg-[#f2fcf5]' : 'border-[var(--border-default)] bg-[var(--bg-surface-hover)]'"
          role="listitem"
        >
          <span
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            :class="item.done ? 'bg-[var(--color-success)] text-white' : 'border border-[var(--border-default)] bg-white text-[var(--text-tertiary)]'"
          >
            <Icon :name="item.done ? 'i-ph-check-bold' : 'i-ph-dot-outline'" class="h-3.5 w-3.5" />
          </span>
          <div class="min-w-0 flex-1">
            <span class="block text-[13px] font-bold text-[var(--text-primary)]">{{ item.label }}</span>
            <span class="mt-1 block text-[12px] leading-5 text-[var(--text-secondary)]">{{ item.description }}</span>
          </div>
          <UBadge
            :color="item.done ? 'success' : 'neutral'"
            variant="subtle"
            class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          >
            {{ item.done ? $t("pages.createBlogPage.checkDone") : $t("pages.createBlogPage.checkPending") }}
          </UBadge>
        </div>
      </div>
    </UCard>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  thumbnailBackground: string
  selectedCategoryLabel: string
  readMinutes: number
  tagList: string[]
  previewExcerpt: string
  checklistItems: ReadonlyArray<{
    label: string
    description: string
    done: boolean
  }>
}>()
</script>
