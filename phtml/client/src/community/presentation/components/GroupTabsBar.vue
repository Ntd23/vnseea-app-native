<template>
  <div class="rounded-[24px] border border-[#dbe3f2] bg-white p-2 shadow-[0_12px_30px_rgba(15,35,110,0.06)]" role="tablist" :aria-label="ariaLabel || $t('pages.groupDetailPage.tabsAriaLabel')">
    <div class="flex flex-wrap items-center gap-1.5">
      <UButton
        v-for="tab in tabs"
        :key="tab.key"
        :color="modelValue === tab.key ? 'primary' : 'neutral'"
        :variant="modelValue === tab.key ? 'solid' : 'ghost'"
        size="lg"
        class="rounded-full px-4 text-[13px] font-bold"
        type="button"
        role="tab"
        :aria-selected="modelValue === tab.key"
        @click="$emit('update:modelValue', tab.key)"
      >
        <Icon :name="tab.icon" class="mr-2 h-4 w-4" />
        {{ tab.label }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  modelValue: "posts" | "about"
  ariaLabel?: string
}>()
defineEmits<{ "update:modelValue": [value: "posts" | "about"] }>()

const tabs = computed(() => [
  { key: "posts", label: t("pages.groupDetailPage.tabPosts"), icon: "i-ph-newspaper-clipping-bold" },
  { key: "about", label: t("pages.groupDetailPage.tabAbout"), icon: "i-ph-info-bold" },
] as const)
</script>
