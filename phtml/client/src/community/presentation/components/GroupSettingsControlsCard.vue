<template>
  <CommunitySettingsSectionCard
    eyebrow="community.settings.controls.eyebrow"
    title="community.settings.controls.title"
    description="community.settings.controls.desc"
    icon="i-ph-shield-check-bold"
  >
    <template #trailing>
      <UBadge color="neutral" variant="soft" class="rounded-full px-4 py-2 text-[12px] font-semibold text-[#243b63]">
        {{ $t(selectedPrivacyLabel) }}
      </UBadge>
    </template>

    <div class="space-y-5">
      <div class="grid gap-3 lg:grid-cols-3" role="radiogroup" :aria-label="$t('community.settings.controls.privacyFallback')">
        <button
          v-for="option in communityPrivacyOptions"
          :key="option.value"
          class="rounded-[22px] border px-4 py-4 text-left transition"
          :class="model.privacy === option.value
            ? 'border-[#0000ff]/22 bg-[#eef0ff] shadow-[0_12px_24px_rgba(0,0,255,0.08)]'
            : 'border-[#dbe3f2] bg-white hover:border-[#c5caff] hover:bg-[#f8fbff]'"
          type="button"
          :aria-pressed="model.privacy === option.value"
          @click="model.privacy = option.value as CommunityPrivacy"
        >
          <div class="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-[#0000ff] shadow-[0_8px_18px_rgba(15,35,110,0.05)]">
            <Icon :name="option.icon || 'i-ph-circle-fill'" class="h-5 w-5" />
          </div>
          <p class="mt-4 text-[14px] font-black text-[#243b63]">
            {{ $t(option.label) }}
          </p>
          <p class="mt-2 text-[12px] leading-5 text-slate-500">
            {{ $t(option.description) }}
          </p>
        </button>
      </div>

      <UAlert
        color="neutral"
        variant="subtle"
        icon="i-ph-info-fill"
        :title="$t('community.settings.controls.logic')"
        :description="$t(selectedPrivacyDescription)"
        class="rounded-[20px]"
      />

      <div class="grid gap-3 lg:grid-cols-2">
        <div
          v-for="toggle in toggleItems"
          :key="toggle.key"
          class="rounded-[20px] border border-[#edf2fb] bg-[#fbfcff] px-4 py-4"
        >
          <USwitch
            v-model="model[toggle.key]"
            color="primary"
            size="lg"
            :label="toggle.label"
            :description="toggle.description"
            class="items-start"
          />
        </div>
      </div>
    </div>
  </CommunitySettingsSectionCard>
</template>

<script setup lang="ts">
import CommunitySettingsSectionCard from "./SettingsSectionCard.vue"
import {
  getCommunityOptionDescription,
  getCommunityOptionLabel,
} from "../../domain/services/community-helpers.service"
import type {
  CommunityGroupSettingsDraft,
  CommunityPrivacy,
} from "../../domain/types/community.types"
import { communityPrivacyOptions } from "../../domain/constants/community-options"

const model = defineModel<CommunityGroupSettingsDraft>({ required: true })
const { t } = useI18n()

const selectedPrivacyLabel = computed(() =>
  getCommunityOptionLabel(communityPrivacyOptions, model.value.privacy, "community.settings.controls.privacyFallback"),
)

const selectedPrivacyDescription = computed(() =>
  getCommunityOptionDescription(communityPrivacyOptions, model.value.privacy, "community.settings.controls.noPrivacy"),
)

const toggleItems = computed(() => [
  {
    key: "joinApproval" as const,
    label: t("community.settings.controls.toggles.join.label"),
    description: t("community.settings.controls.toggles.join.desc"),
  },
])
</script>
