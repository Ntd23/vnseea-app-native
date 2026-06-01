<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
      {{ t("pages.groupDetailPage.topicsTitle") }}
    </p>
    <div class="mt-4 flex flex-wrap gap-2">
      <UBadge
        v-for="tag in group.tags"
        :key="tag"
        color="neutral"
        variant="soft"
        class="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#243b63]"
      >
        #{{ translateText(tag) }}
      </UBadge>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.groupDetailPage.topicsAudienceTitle") }}</p>
        <p class="mt-1 text-[13px] leading-6 text-slate-600">
          {{ t("pages.groupDetailPage.topicsAudienceDescription", { category: categoryLabel.toLowerCase() }) }}
        </p>
      </div>
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.groupDetailPage.topicsJoinTitle") }}</p>
        <p class="mt-1 text-[13px] leading-6 text-slate-600">
          {{ t("pages.groupDetailPage.topicsJoinDescription", { privacy: privacyDescription }) }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CommunityGroupRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

defineProps<{
  group: CommunityGroupRecord
  categoryLabel: string
  privacyDescription: string
}>()
</script>
