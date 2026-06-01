<template>
  <CommunitySettingsSectionCard
    :eyebrow="$t('community.pageSettings.basics.eyebrow')"
    :title="$t('community.pageSettings.basics.title')"
    :description="$t('community.pageSettings.basics.desc')"
    icon="i-ph-identification-card-bold"
  >
    <template #trailing>
      <slot name="trailing" />
    </template>

    <div class="page-settings-basics space-y-5">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
        <UFormField
          name="name"
          :label="$t('community.pageSettings.basics.fields.name')"
          required
          size="xl"
          class="space-y-2"
        >
          <UInput
            v-model="model.name"
            :placeholder="$t('community.pageSettings.basics.fields.namePlaceholder')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          name="slug"
          :label="$t('community.pageSettings.basics.fields.url')"
          required
          size="xl"
          class="space-y-2"
        >
          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[13px] font-semibold text-slate-500">
              {{ urlPrefix }}
            </div>
            <UInput
              v-model="model.slug"
              :placeholder="$t('community.pageSettings.basics.fields.slugPlaceholder')"
              color="primary"
              size="xl"
              class="w-full"
              :ui="slugInputUi"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <span class="page-settings-basics__hint">
              {{ $t("community.pageSettings.basics.fields.urlSuggested", { slug: suggestedSlug || $t("community.pageSettings.basics.fields.slugPlaceholder") }) }}
            </span>
            <button
              v-if="suggestedSlug && model.slug.trim() !== suggestedSlug"
              type="button"
              class="page-settings-basics__suggestion-button"
              @click="model.slug = suggestedSlug"
            >
              {{ $t("community.pageSettings.basics.fields.urlUseSuggestion") }}
            </button>
          </div>
        </UFormField>
      </div>

      <UFormField
        name="summary"
        :label="$t('community.pageSettings.basics.fields.summary')"
        required
        size="xl"
        class="space-y-2"
      >
        <UTextarea
          v-model="model.summary"
          :placeholder="$t('community.pageSettings.basics.fields.summaryPlaceholder')"
          color="primary"
          size="xl"
          autoresize
          :rows="6"
          class="w-full"
          :ui="textareaUi"
        />
      </UFormField>

      <div class="grid gap-5 lg:grid-cols-2">
        <UFormField
          name="category"
          :label="$t('community.pageSettings.basics.fields.category')"
          required
          size="xl"
          class="space-y-2"
        >
          <USelect
            v-model="model.category"
            :items="categoryItems"
            value-key="value"
            label-key="label"
            color="primary"
            size="xl"
            class="w-full"
            :ui="selectUi"
          />
        </UFormField>

        <UFormField
          name="locationLabel"
          :label="$t('community.pageSettings.basics.fields.location')"
          size="xl"
          class="space-y-2"
        >
          <GooglePlaceField
            v-model="locationModel"
            :placeholder="$t('community.pageSettings.basics.fields.locationPlaceholder')"
            :helper-text="$t('community.pageSettings.basics.fields.locationHint')"
            require-coordinates
          />
        </UFormField>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <UFormField
          name="website"
          :label="$t('community.pageSettings.basics.fields.website')"
          size="xl"
          class="space-y-2"
        >
          <UInput
            v-model="model.website"
            :placeholder="$t('community.pageSettings.basics.fields.websitePlaceholder')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          name="ownerLabel"
          :label="$t('community.pageSettings.basics.fields.ownerLabel')"
          size="xl"
          class="space-y-2"
        >
          <UInput
            v-model="model.ownerLabel"
            :placeholder="$t('community.pageSettings.basics.fields.ownerPlaceholder')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <UFormField
          name="responseLabel"
          :label="$t('community.pageSettings.basics.fields.responseLabel')"
          size="xl"
          class="space-y-2"
        >
          <UInput
            v-model="model.responseLabel"
            :placeholder="$t('community.pageSettings.basics.fields.responsePlaceholder')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          name="ctaLabel"
          :label="$t('community.pageSettings.basics.fields.ctaLabel')"
          size="xl"
          class="space-y-2"
        >
          <UInput
            v-model="model.ctaLabel"
            :placeholder="$t('community.pageSettings.basics.fields.ctaPlaceholder')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
      </div>

      <UFormField
        name="tags"
        :label="$t('community.pageSettings.basics.fields.tags')"
        size="xl"
        class="space-y-2"
      >
        <UInput
          v-model="model.tags"
          :placeholder="$t('community.pageSettings.basics.fields.tagsPlaceholder')"
          color="primary"
          size="xl"
          class="w-full"
          :ui="inputUi"
        />
      </UFormField>
    </div>

    <slot name="footer" />
  </CommunitySettingsSectionCard>
</template>

<script setup lang="ts">
import CommunitySettingsSectionCard from "./SettingsSectionCard.vue"
import GooglePlaceField from "../../../location/presentation/components/GooglePlaceField.vue"
import { normalizeLocationSelection } from "../../../location/domain/types/location.types"
import {
  createCommunitySlug,
} from "../../domain/services/community-helpers.service"
import {
  communityPageCategoryOptions,
  communityPageUrlPrefix,
} from "../../domain/constants/community-options"
import type { CommunityPageSettingsDraft } from "../../domain/types/community.types"

const model = defineModel<CommunityPageSettingsDraft>({ required: true })
const { t } = useI18n()

defineProps<{
  pagePath: string
}>()

const inputUi = {
  base: "h-14 rounded-[18px] px-4 text-[15px]",
}

const slugInputUi = {
  base: "h-14 rounded-[18px] pl-[8.1rem] pr-4 text-[15px]",
}

const textareaUi = {
  base: "min-h-[160px] rounded-[18px] px-4 py-3 text-[15px] leading-7",
}

const selectUi = {
  base: "h-14 rounded-[18px] px-4 text-[15px]",
}

const urlPrefix = communityPageUrlPrefix.replace("https://", "")

const categoryItems = computed(() =>
  communityPageCategoryOptions.map(option => ({
    value: option.value,
    label: t(option.label),
  })),
)

const suggestedSlug = computed(() =>
  createCommunitySlug(model.value.name),
)

const locationModel = computed({
  get: () => normalizeLocationSelection(model.value.location),
  set: (value) => {
    const location = normalizeLocationSelection(value)
    model.value.location = location
    model.value.locationLabel = location.address
  },
})

const tagCount = computed(() =>
  model.value.tags
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean)
    .length,
)
</script>

<style scoped>
.page-settings-basics__view-link,
.page-settings-basics__suggestion-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.page-settings-basics__view-link {
  min-height: 36px;
  padding: 8px 13px;
}

.page-settings-basics__suggestion-button {
  min-height: 30px;
  padding: 6px 12px;
}

.page-settings-basics__view-link:hover,
.page-settings-basics__suggestion-button:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
  transform: translateY(-1px);
}

.page-settings-basics__hint {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
}

.page-settings-basics__stat {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  padding: 13px 16px;
}

.page-settings-basics :deep(input),
.page-settings-basics :deep(textarea),
.page-settings-basics :deep(button[role="combobox"]) {
  border: 1px solid #cbd5e1;
  background: #ffffff !important;
  color: #0f172a !important;
  box-shadow: none;
}

.page-settings-basics :deep(input::placeholder),
.page-settings-basics :deep(textarea::placeholder) {
  color: #94a3b8 !important;
}

.page-settings-basics :deep(label) {
  color: #334155;
  font-weight: 800;
}
</style>
