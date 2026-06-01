<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
          {{ compact ? t("pages.groupDetailPage.aboutCompactEyebrow") : t("pages.groupDetailPage.aboutEyebrow") }}
        </p>
        <h3 class="mt-2 text-[1.2rem] font-black tracking-[-0.04em] text-[#243b63]">
          {{ compact ? t("pages.groupDetailPage.aboutCompactTitle") : groupName }}
        </h3>
      </div>

      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#eef3ff] text-[#0000ff]">
        <Icon :name="compact ? 'i-ph-info-bold' : 'i-ph-identification-card-bold'" class="h-5 w-5" />
      </div>
    </div>

    <p class="mt-4 text-[14px] leading-7 text-slate-600">
      {{ groupSummary }}
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.groupDetailPage.privacyTitle") }}</p>
        <p class="mt-1 text-[13px] font-semibold text-[#243b63]">{{ privacyLabel }}</p>
        <p class="mt-1 text-[12px] leading-5 text-slate-500">{{ privacyDescription }}</p>
      </div>
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.groupDetailPage.categoryTitle") }}</p>
        <p class="mt-1 text-[13px] font-semibold text-[#243b63]">{{ categoryLabel }}</p>
        <p class="mt-1 text-[12px] leading-5 text-slate-500">{{ locationLabel }}</p>
      </div>
    </div>

    <div v-if="!compact || group.website" class="mt-4 space-y-2 text-[13px] text-slate-500">
      <!-- Founded Date: Only show in the full about card (not compact) -->
      <div v-if="!compact" class="flex items-start gap-2">
        <Icon name="i-ph-calendar-blank-bold" class="mt-0.5 h-4 w-4 text-[#0000ff]/70" />
        <span>{{ foundedLabel }}</span>
      </div>

      <!-- Website: Show if available -->
      <div v-if="group.website" class="flex items-start gap-2">
        <Icon name="i-ph-link-simple-bold" class="mt-0.5 h-4 w-4 text-[#0000ff]/70" />
        <a
          :href="websiteHref"
          class="break-all text-[#1d4ed8] underline decoration-[#bfdbfe] underline-offset-4 transition hover:text-[#0000ff]"
          rel="noopener noreferrer"
          target="_blank"
        >
          {{ group.website }}
        </a>
      </div>
    </div>

    <div v-if="!compact && group.guidelines?.length" class="mt-5">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
        {{ t("pages.groupDetailPage.guidelinesTitle") }}
      </p>
      <div class="mt-3 space-y-2.5">
        <div
          v-for="rule in group.guidelines"
          :key="rule"
          class="rounded-[18px] bg-[#f8fbff] px-4 py-3 text-[13px] leading-6 text-slate-600"
        >
          {{ translateText(rule) }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CommunityGroupRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

const props = withDefaults(defineProps<{
  group: CommunityGroupRecord
  privacyLabel: string
  privacyDescription: string
  categoryLabel: string
  memberCountLabel: string
  compact?: boolean
}>(), {
  compact: false,
})

const groupSummary = computed(() =>
  translateText(props.group.summary),
)

const groupName = computed(() =>
  translateText(props.group.name),
)

const locationLabel = computed(() =>
  translateText(props.group.locationLabel),
)

const foundedLabel = computed(() =>
  translateText(props.group.foundedLabel),
)

const websiteHref = computed(() => {
  if (!props.group.website) return "#"
  return props.group.website.startsWith("http") ? props.group.website : `https://${props.group.website}`
})
</script>
