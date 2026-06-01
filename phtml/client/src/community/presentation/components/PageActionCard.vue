<template>
  <section class="rounded-[24px] border border-[#dbe3f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,35,110,0.06)]">
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0000ff]/70">
      {{ t("pages.pageDetailPage.actionEyebrow") }}
    </p>
    <h3 class="mt-2 text-[1.15rem] font-black tracking-[-0.04em] text-[#243b63]">
      {{ t("pages.pageDetailPage.actionTitle") }}
    </h3>
    <p class="mt-2 text-[13px] leading-6 text-slate-500">
      {{ t("pages.pageDetailPage.actionDescription", { response: responseLabel }) }}
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <UButton
        color="primary"
        variant="solid"
        size="lg"
        :loading="followState === 'loading'"
        :disabled="followState === 'loading' || isFollowing"
        class="justify-center rounded-[16px] px-4 text-[13px] font-extrabold shadow-[0_12px_24px_rgba(0,0,255,0.22)]"
        @click="emit('follow')"
      >
        <Icon name="i-ph-bell-simple-ringing-bold" class="mr-2 h-4 w-4" />
        {{ followButtonLabel }}
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        size="lg"
        :loading="messageState === 'loading'"
        :disabled="messageState === 'loading'"
        class="justify-center rounded-[16px] px-4 text-[13px] font-bold"
        @click="emit('message')"
      >
        <Icon name="i-ph-chat-circle-dots-bold" class="mr-2 h-4 w-4" />
        {{ messageButtonLabel }}
      </UButton>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.pageDetailPage.followStat") }}</p>
        <p class="mt-1 text-[15px] font-black text-[#243b63]">{{ followerCountLabel }}</p>
      </div>
      <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ t("pages.pageDetailPage.likeStat") }}</p>
        <p class="mt-1 text-[15px] font-black text-[#243b63]">{{ likeCountLabel }}</p>
      </div>
    </div>

    <div v-if="page.canManage" class="mt-4 rounded-[18px] border border-[#dbe3f2] bg-white px-4 py-3">
      <p class="text-[12px] font-semibold text-[#243b63]">{{ t("pages.pageDetailPage.manageTitle") }}</p>
      <p class="mt-1 text-[12px] leading-5 text-slate-500">
        {{ t("pages.pageDetailPage.manageDescription") }}
      </p>
      <NuxtLink
        class="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-[#dbe3f2] bg-[#f8fbff] px-4 text-[12px] font-bold text-[#243b63] transition hover:border-[#c8d6f2] hover:text-[#0000ff]"
        :to="pageSettingsPath"
      >
        <Icon name="i-ph-gear-six-bold" class="mr-1.5 h-4 w-4" />
        {{ t("pages.pageDetailPage.settingsButton") }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  appendCommunityQuery,
  getCommunityPageSettingsPath,
} from "../../domain/services/community-helpers.service"
import type { CommunityPageRecord } from "../../domain/types/community.types"

const { t } = useI18n()
const translateText = useMaybeTranslatedText()

const props = defineProps<{
  page: CommunityPageRecord
  followerCountLabel: string
  likeCountLabel: string
  followState?: "idle" | "loading" | "success" | "error"
  messageState?: "idle" | "loading" | "success" | "error"
  isFollowing?: boolean
}>()

const emit = defineEmits<{
  follow: []
  message: []
}>()

const route = useRoute()

const pageSettingsPath = computed(() =>
  appendCommunityQuery(getCommunityPageSettingsPath(props.page.slug), route.query),
)

const responseLabel = computed(() =>
  translateText(props.page.responseLabel),
)

const followButtonLabel = computed(() => {
  if (props.isFollowing) return t("pages.pageDetailPage.followingButton")
  return translateText(props.page.ctaLabel, t("pages.pageDetailPage.followFallback"))
})

const messageButtonLabel = computed(() =>
  props.messageState === "success"
    ? t("pages.pageDetailPage.messageSentButton")
    : t("pages.pageDetailPage.messageButton"),
)
</script>
