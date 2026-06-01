<template>
  <CommunitySettingsSectionCard
    eyebrow="community.settings.basics.eyebrow"
    title="community.settings.basics.title"
    description="community.settings.basics.desc"
    icon="i-ph-identification-card-bold"
  >
    <template #trailing>
      <UButton
        :to="groupPath"
        color="neutral"
        variant="outline"
        size="md"
        class="rounded-full"
      >
        <Icon name="i-ph-arrow-square-out-bold" class="mr-1.5 h-4 w-4" />
        {{ $t("community.settings.basics.viewGroup") }}
      </UButton>
    </template>

    <div class="space-y-8">
      <!-- Premium Compact Media Section -->
      <div class="space-y-4">
        <label class="text-[13px] font-bold uppercase tracking-widest text-slate-400">
          {{ $t("community.settings.basics.fields.groupMedia") || 'HÌNH ẢNH NHÓM' }}
        </label>
        
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
          <!-- Avatar Section (Square on the left) -->
          <div class="flex flex-col items-center gap-3">
            <div 
              class="group relative cursor-pointer overflow-hidden rounded-[32px] border-2 border-slate-200 bg-slate-50 transition-all hover:border-primary-400 hover:bg-slate-100/50"
              style="width: 180px !important; height: 180px !important; flex-shrink: 0;"
              @click="triggerAvatarUpload"
            >
              <img 
                v-if="model.avatarUrl" 
                :src="model.avatarUrl" 
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div v-else class="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
                <Icon name="i-ph-users-three-duotone" class="h-16 w-16" />
                <span class="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t("community.settings.basics.fields.addAvatar") }}</span>
              </div>

              <!-- Edit Overlay -->
              <div class="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all duration-300 group-hover:bg-slate-900/40 group-hover:opacity-100">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary-600 shadow-lg transition-transform group-hover:scale-110">
                  <Icon name="i-ph-camera-bold" class="h-7 w-7" />
                </div>
              </div>

              <input 
                ref="avatarInput" 
                type="file" 
                accept="image/*" 
                class="hidden" 
                @change="e => handleFileChange('avatar', e)" 
              />
            </div>
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ảnh đại diện (1:1)</p>
          </div>

          <!-- Banner Section (Compact rectangle) -->
          <div class="flex-1 space-y-3">
            <div 
              class="group relative w-full cursor-pointer overflow-hidden rounded-[32px] border-2 border-slate-200 bg-slate-50 transition-all hover:border-primary-400 hover:bg-slate-100/50"
              style="height: 180px !important;"
              @click="triggerBannerUpload"
            >
              <img 
                v-if="model.bannerUrl" 
                :src="model.bannerUrl" 
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div v-else class="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-100 text-slate-400">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition-transform group-hover:scale-110">
                  <Icon name="i-ph-image-duotone" class="h-8 w-8 text-primary-500" />
                </div>
                <div class="text-center">
                  <span class="block text-[14px] font-black uppercase tracking-wider text-[#243b63]">{{ $t("community.settings.basics.fields.addBanner") }}</span>
                  <span class="text-[11px] font-medium text-slate-400">{{ $t("community.settings.basics.fields.bannerHint") }}</span>
                </div>
              </div>
              
              <!-- Edit Overlay -->
              <div class="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all duration-300 group-hover:bg-slate-900/20 group-hover:opacity-100">
                <UButton
                  color="white"
                  variant="solid"
                  size="md"
                  class="rounded-full font-bold shadow-xl"
                >
                  <Icon name="i-ph-camera-bold" class="mr-2 h-5 w-5" />
                  {{ $t("community.settings.basics.fields.changePhoto") }}
                </UButton>
              </div>
              
              <input 
                ref="bannerInput" 
                type="file" 
                accept="image/*" 
                class="hidden" 
                @change="e => handleFileChange('banner', e)" 
              />
            </div>
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ảnh bìa (1500x500px)</p>
          </div>
        </div>
      </div>

      <!-- Basic Fields -->
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
        <UFormField
          name="name"
          :label="$t('community.settings.basics.fields.name')"
          required
          size="xl"
          class="space-y-2"
        >
          <UInput
            v-model="model.name"
            :placeholder="$t('community.settings.basics.fields.namePlaceholder')"
            color="primary"
            size="xl"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          name="slug"
          :label="$t('community.settings.basics.fields.url')"
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
              :placeholder="$t('community.settings.basics.fields.urlPlaceholder')"
              color="primary"
              size="xl"
              class="w-full"
              :ui="slugInputUi"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#243b63]">
              {{ $t("community.settings.basics.fields.suggested", { slug: suggestedSlug || $t("community.settings.basics.fields.urlPlaceholder") }) }}
            </UBadge>
            <UButton
              v-if="suggestedSlug && (model.slug || '').trim() !== suggestedSlug"
              type="button"
              color="neutral"
              variant="outline"
              size="sm"
              class="rounded-full"
              @click="model.slug = suggestedSlug"
            >
              {{ $t("community.settings.basics.fields.useSuggested") }}
            </UButton>
          </div>
        </UFormField>
      </div>

      <UFormField
        name="summary"
        :label="$t('community.settings.basics.fields.desc')"
        required
        size="xl"
        class="space-y-2"
        :help="t('community.settings.basics.stats.charCount', { count: (model.summary || '').trim().length }) + ' / 24 ' + t('community.settings.basics.fields.minChars')"
      >
        <textarea
          v-model="model.summary"
          :placeholder="$t('community.settings.basics.fields.descPlaceholder')"
          rows="6"
          class="w-full min-h-[160px] rounded-[18px] bg-white px-4 py-3 text-[15px] leading-7 text-slate-800 outline-none transition-all placeholder-slate-400"
          style="border: 1px solid #cbd5e1 !important;"
          @focus="$event.target.style.setProperty('border', '1px solid #0000ff', 'important')"
          @blur="$event.target.style.setProperty('border', '1px solid #cbd5e1', 'important')"
        />
      </UFormField>

      <div class="grid gap-5">
        <UFormField
          name="category"
          :label="$t('community.settings.basics.fields.category')"
          required
          size="xl"
          class="space-y-2"
        >
          <USelect
            v-model="model.category"
            :items="categoryItems"
            color="primary"
            size="xl"
            class="w-full"
            :ui="selectUi"
          />
        </UFormField>
      </div>

      <div class="grid gap-3 sm:grid-cols-1 pt-4">
        <div class="rounded-[18px] bg-[#f8fbff] px-4 py-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0000ff]/65">{{ $t("community.settings.basics.stats.descLength") }}</p>
          <p class="mt-1 text-[15px] font-black text-[#243b63]">{{ $t("community.settings.basics.stats.charCount", { count: (model.summary || "").trim().length }) }}</p>
        </div>
      </div>
    </div>
  </CommunitySettingsSectionCard>
</template>

<script setup lang="ts">
import CommunitySettingsSectionCard from "./SettingsSectionCard.vue"
import {
  createCommunitySlug,
} from "../../domain/services/community-helpers.service"
import { communityCategoryOptions } from "../../domain/constants/community-options"
import type { CommunityGroupSettingsDraft } from "../../domain/types/community.types"

const model = defineModel<CommunityGroupSettingsDraft>({ required: true })
const { t } = useI18n()

const isLoaded = ref(false)
watch(
  () => model.value?.summary,
  (newVal) => {
    if (newVal && !isLoaded.value) {
      isLoaded.value = true
    }
  },
  { immediate: true },
)

defineProps<{
  groupPath: string
}>()

const bannerInput = ref<HTMLInputElement | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)

const inputUi = {
  base: "h-14 rounded-[18px] px-4 text-[15px]",
}

const slugInputUi = {
  base: "h-14 rounded-[18px] pl-[8.1rem] pr-4 text-[15px]",
}

const textareaUi = {
  base: "min-h-[160px] rounded-[18px] px-4 py-3 text-[15px] leading-7",
}

const secondaryTextareaUi = {
  base: "min-h-[148px] rounded-[18px] px-4 py-3 text-[15px] leading-7",
}

const selectUi = {
  base: "h-14 rounded-[18px] px-4 text-[15px]",
}

const urlPrefix = "vnseea.vn/g/"

const categoryItems = computed(() =>
  communityCategoryOptions.map(option => ({
    value: option.value,
    label: t(option.label),
  })),
)

const suggestedSlug = computed(() =>
  createCommunitySlug(model.value.name),
)

const tagCount = computed(() =>
  (model.value.tags || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean)
    .length,
)

const guidelineCount = computed(() =>
  (model.value.guidelines || "")
    .split("\n")
    .map(rule => rule.trim())
    .filter(Boolean)
    .length,
)

function triggerBannerUpload() {
  bannerInput.value?.click()
}

function triggerAvatarUpload() {
  avatarInput.value?.click()
}

function handleFileChange(key: 'avatar' | 'banner', event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const url = URL.createObjectURL(file)
  if (key === 'avatar') {
    model.value.avatarUrl = url
    model.value.avatarFile = file
  } else {
    model.value.bannerUrl = url
    model.value.bannerFile = file
  }
}
</script>
