<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
          {{ compact ? t("pages.pageDetailPage.aboutCompactEyebrow") : t("pages.pageDetailPage.aboutEyebrow") }}
        </p>
        <h3 class="mt-2 text-[1.2rem] font-black tracking-[-0.04em] text-[#243b63]">
          {{ compact ? t("pages.pageDetailPage.aboutCompactTitle") : pageName }}
        </h3>
      </div>

      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#eef3ff] text-[#0000ff]">
        <Icon :name="compact ? 'i-ph-info-bold' : 'i-ph-megaphone-simple-bold'" class="h-5 w-5" />
      </div>
    </div>

    <p class="mt-4 text-[14px] leading-7 text-slate-600">
      {{ pageSummary }}
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.pageDetailPage.categoryTitle") }}</p>
        <p class="mt-1 text-[13px] font-semibold text-[#243b63]">{{ categoryLabel }}</p>
        <p class="mt-1 text-[12px] leading-5 text-slate-500">{{ ownerLabel }}</p>
      </div>
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.pageDetailPage.interactionTitle") }}</p>
        <p class="mt-1 text-[13px] font-semibold text-[#243b63]">{{ responseLabel }}</p>
        <p class="mt-1 text-[12px] leading-5 text-slate-500">
          {{
            [
              showFollowerCount ? followerCountLabel : "",
              showLikeCount ? likeCountLabel : "",
            ].filter(Boolean).join(" · ") || t("pages.pageDetailPage.hiddenMetrics")
          }}
        </p>
      </div>
    </div>

    <div class="mt-4 space-y-2 text-[13px] text-slate-500">
      <div v-if="page.locationLabel" class="flex items-start gap-2">
        <Icon name="i-ph-map-pin-bold" class="mt-0.5 h-4 w-4 text-[#0000ff]/70" />
        <span>{{ locationLabel }}</span>
      </div>
      <div v-if="page.website" class="flex items-start gap-2">
        <Icon name="i-ph-link-simple-bold" class="mt-0.5 h-4 w-4 text-[#0000ff]/70" />
        <a
          :href="websiteHref"
          class="break-all text-[#1d4ed8] underline decoration-[#bfdbfe] underline-offset-4 transition hover:text-[#0000ff]"
          rel="noopener noreferrer"
          target="_blank"
        >
          {{ page.website }}
        </a>
      </div>
      <div v-if="page.foundedLabel" class="flex items-start gap-2">
        <Icon name="i-ph-calendar-blank-bold" class="mt-0.5 h-4 w-4 text-[#0000ff]/70" />
        <span>{{ foundedLabel }}</span>
      </div>
      <div v-if="showFollowerCount" class="flex items-start gap-2">
        <Icon name="i-ph-users-three-bold" class="mt-0.5 h-4 w-4 text-[#0000ff]/70" />
        <span>{{ followerCountLabel }}</span>
      </div>
    </div>

    <div v-if="!compact" class="mt-5">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
        {{ t("pages.pageDetailPage.mainTopicsTitle") }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UBadge
          v-for="tag in page.tags"
          :key="tag"
          color="neutral"
          variant="soft"
          class="rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#243b63]"
        >
          #{{ translateText(tag) }}
        </UBadge>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CommunityPageRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

const props = withDefaults(defineProps<{
  page: CommunityPageRecord
  categoryLabel: string
  followerCountLabel: string
  likeCountLabel: string
  compact?: boolean
  showFollowerCount?: boolean
  showLikeCount?: boolean
}>(), {
  compact: false,
  showFollowerCount: true,
  showLikeCount: true,
})

const pageSummary = computed(() =>
  translateText(props.page.summary),
)

const pageName = computed(() =>
  translateText(props.page.name),
)

const ownerLabel = computed(() =>
  translateText(props.page.ownerLabel),
)

const responseLabel = computed(() =>
  translateText(props.page.responseLabel),
)

const locationLabel = computed(() =>
  translateText(props.page.locationLabel),
)

const foundedLabel = computed(() =>
  translateText(props.page.foundedLabel),
)

const websiteHref = computed(() => {
  if (!props.page.website) return "#"
  return props.page.website.startsWith("http") ? props.page.website : `https://${props.page.website}`
})
</script>
