<template>
  <NuxtLink
    :to="result.href"
    class="group flex h-full flex-col rounded-[18px] border border-secondary-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_12px_32px_rgba(37,99,235,0.12)]"
  >
    <div class="flex items-start gap-4">
      <UAvatar
        :text="result.kind === 'posts' ? '' : result.initials"
        :icon="result.kind === 'posts' ? 'i-ph-newspaper-clipping-fill' : undefined"
        size="xl"
        class="font-extrabold text-white shadow-[0_4px_14px_rgba(0,0,255,0.2)]"
        :ui="{ background: 'bg-primary-500', rounded: 'rounded-2xl' }"
        :style="{ background: avatarBackground }"
      />

      <div class="min-w-0 flex-1 pt-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-lg font-extrabold text-secondary-900 tracking-tight group-hover:text-secondary-900 transition-colors">
            {{ result.title }}
          </h3>

          <UBadge
            v-if="result.badge"
            :label="result.badge"
            size="xs"
            variant="soft"
            :color="badgeColor"
            class="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]"
          />
        </div>

        <p class="mt-1 text-[12px] font-medium text-slate-500">
          {{ result.subtitle }}
        </p>
      </div>

      <Icon 
        :name="sectionIcon" 
        class="mt-1 h-5 w-5 shrink-0 text-secondary-300 transition group-hover:text-primary-500 group-hover:rotate-12" 
      />
    </div>

    <p class="line-clamp-3 mt-4 text-sm font-medium leading-relaxed text-secondary-500 flex-1">
      {{ result.description }}
    </p>

    <div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-secondary-100/50 pt-5">
      <div class="flex flex-wrap gap-2">
        <UBadge
          :label="result.metricLabel"
          size="sm"
          variant="subtle"
          color="gray"
          class="rounded-lg font-bold"
        />
        <UBadge
          v-if="result.metaLabel"
          :label="result.metaLabel"
          size="sm"
          variant="outline"
          color="gray"
          class="rounded-lg font-bold"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="tag in result.tags.slice(0, 3)"
          :key="tag"
          :label="'#' + tag"
          size="xs"
          variant="ghost"
          color="primary"
          class="rounded-full px-0 text-[10px] font-semibold group-hover:text-secondary-900"
        />
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { SearchResultItem } from "../../domain/types/search.types"

const props = defineProps<{
  result: SearchResultItem
}>()

const sectionIcon = computed(() => {
  if (props.result.kind === "users") return "i-ph-user-circle-fill"
  if (props.result.kind === "pages") return "i-ph-flag-fill"
  if (props.result.kind === "groups") return "i-ph-users-three-fill"
  return "i-ph-newspaper-clipping-fill"
})

const avatarBackground = computed(() =>
  `linear-gradient(135deg, ${props.result.accent} 0%, #0000ff 100%)`,
)

const badgeColor = computed(() => {
  if (props.result.badge === "Online") return "primary"
  if (props.result.kind === "posts") return "violet"
  if (props.result.kind === "pages") return "amber"
  if (props.result.kind === "groups") return "cyan"
  return "primary"
})
</script>

<style scoped>
.result-card__description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
</style>
