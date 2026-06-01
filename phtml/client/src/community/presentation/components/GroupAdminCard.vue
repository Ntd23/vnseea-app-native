<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
    <UAlert
      color="primary"
      variant="subtle"
      icon="i-ph-shield-checkered-bold"
      :title="t('pages.groupDetailPage.adminEyebrow')"
      :description="t('pages.groupDetailPage.adminDescription')"
      class="rounded-[20px]"
    />

    <UButton
      :to="settingsPath"
      color="primary"
      variant="solid"
      size="lg"
      class="mt-4 rounded-[16px] px-4 text-[13px] font-extrabold shadow-[0_12px_24px_rgba(0,0,255,0.22)]"
    >
      <Icon name="i-ph-gear-six-bold" class="mr-2 h-4 w-4" />
      {{ t("pages.groupDetailPage.adminButton") }}
    </UButton>
  </section>
</template>

<script setup lang="ts">
import { getCommunityGroupSettingsPath } from "../../domain/services/community-helpers.service"

const { t } = useI18n()

const props = defineProps<{
  slug: string
}>()

const settingsPath = computed(() =>
  getCommunityGroupSettingsPath(props.slug),
)
</script>
