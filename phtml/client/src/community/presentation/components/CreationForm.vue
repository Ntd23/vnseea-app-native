<template>
  <div class="space-y-6">
    <div class="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div class="mb-10">
        <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">
          {{ $t("community.creation.common.fillInfo", { entity: entityText }) }}
        </h1>
        <p class="mt-2 text-[15px] text-slate-500">
          {{ $t("community.creation.common.fillDesc", { entity: entityText }) }}
        </p>
      </div>

      <UForm
        :state="model"
        :validate="validateForm"
        class="space-y-6"
        @submit="emit('submit')"
      >
        <!-- Name -->
        <UFormField
          :label="nameLabelText"
          name="name"
          required
        >
          <UInput
            v-model="model.name"
            :placeholder="namePlaceholder"
            icon="i-ph-users-three-bold"
            size="xl"
            class="w-full"
            :ui="{ base: 'h-12 rounded-xl' }"
          />
        </UFormField>

        <!-- URL Slug -->
        <UFormField
          :label="urlLabelText"
          name="slug"
          required
        >
          <UInput
            v-model="model.slug"
            :placeholder="slugPlaceholder"
            icon="i-ph-link-bold"
            size="xl"
            class="w-full"
            :ui="{ base: 'h-12 rounded-xl' }"
          />
          <template #hint>
            <span class="text-[11px] font-medium text-slate-400">
              {{ urlPrefix }}{{ model.slug || '...' }}
            </span>
          </template>
        </UFormField>

        <!-- Description -->
        <UFormField
          :label="descriptionLabelText"
          name="description"
          required
        >
          <UTextarea
            v-model="model.description"
            :placeholder="descriptionPlaceholder"
            size="xl"
            autoresize
            :rows="4"
            class="w-full"
            :ui="{ base: 'rounded-xl px-4 py-3' }"
          />
        </UFormField>

        <!-- Privacy & Category Dropdowns -->
        <div class="grid gap-6 sm:grid-cols-2">
          <UFormField
            v-if="showPrivacy"
            :label="$t('community.creation.group.privacyLabel')"
            name="privacy"
            required
          >
            <USelect
              v-model="model.privacy"
              :items="privacyItems"
              value-key="value"
              label-key="label"
              icon="i-ph-shield-check-bold"
              size="xl"
              class="w-full"
              :ui="{ base: 'h-12 rounded-xl' }"
            />
          </UFormField>

          <UFormField
            :label="categoryLabelText"
            name="category"
            required
          >
            <USelect
              v-model="model.category"
              :items="categoryItems"
              value-key="value"
              label-key="label"
              icon="i-ph-tag-bold"
              size="xl"
              class="w-full"
              :ui="{ base: 'h-12 rounded-xl' }"
            />
          </UFormField>
        </div>

        <UFormField
          v-if="showLocation"
          :label="locationLabelText"
          name="location"
          required
        >
          <GooglePlaceField
            v-model="locationModel"
            :placeholder="locationPlaceholderText"
            :helper-text="locationHintText"
            require-coordinates
          />
        </UFormField>

        <!-- Buttons -->
        <div class="flex items-center justify-between pt-8">
          <UButton
            :to="backTo"
            variant="ghost"
            color="neutral"
            size="lg"
            class="text-link rounded-xl px-6"
          >
            {{ $t("community.creation.common.back") }}
          </UButton>

          <UButton
            type="submit"
            color="primary"
            size="xl"
            :loading="isBusy"
            :disabled="isSubmitDisabled"
            class="btn-primary rounded-xl px-12 font-bold shadow-md shadow-primary-500/20"
          >
            {{ submitLabelText }}
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import GooglePlaceField from "../../../location/presentation/components/GooglePlaceField.vue"
import {
  emptyLocationSelection,
  hasLocationCoordinates,
  normalizeLocationSelection,
} from "../../../location/domain/types/location.types"
import {
  createCommunitySlug,
} from "../../domain/services/community-helpers.service"
import type {
  CommunityDraft,
  CommunityOption,
} from "../../domain/types/community.types"
import { communityUrlPrefix } from "../../domain/constants/community-options"

type CreationSubmitState = "idle" | "loading" | "success" | "error"

type CreationFormError = {
  name?: keyof CommunityDraft
  message: string
}

const { t } = useI18n()

const emit = defineEmits<{
  submit: []
}>()

const model = defineModel<CommunityDraft>({ required: true })

const props = withDefaults(defineProps<{
  entityLabel: string
  categoryOptions: CommunityOption[]
  privacyOptions?: CommunityOption[]
  showPrivacy?: boolean
  submitLabel?: string
  backTo?: string
  nameLabel?: string
  namePlaceholder?: string
  urlLabel?: string
  slugPlaceholder?: string
  descriptionLabel?: string
  descriptionPlaceholder?: string
  categoryLabel?: string
  showLocation?: boolean
  locationLabel?: string
  locationPlaceholder?: string
  locationHint?: string
  urlPrefix?: string
  submitState?: CreationSubmitState
  submitDisabled?: boolean
}>(), {
  privacyOptions: () => [],
  showPrivacy: true,
  submitLabel: "",
  backTo: "/home",
  nameLabel: "",
  namePlaceholder: "",
  urlLabel: "",
  slugPlaceholder: "",
  descriptionLabel: "",
  descriptionPlaceholder: "",
  categoryLabel: "",
  showLocation: false,
  locationLabel: "",
  locationPlaceholder: "",
  locationHint: "",
  urlPrefix: communityUrlPrefix,
  submitState: "idle",
  submitDisabled: false,
})

const entityText = computed(() => t(props.entityLabel))
const submitLabelText = computed(() => props.submitLabel || t("community.creation.common.create"))
const nameLabelText = computed(() => props.nameLabel || t("community.creation.common.nameLabel"))
const urlLabelText = computed(() => props.urlLabel || t("community.creation.common.urlLabel"))
const descriptionLabelText = computed(() => props.descriptionLabel || t("community.creation.common.descriptionLabel"))
const categoryLabelText = computed(() => props.categoryLabel || t("community.creation.common.categoryLabel"))
const locationLabelText = computed(() => props.locationLabel || t("community.creation.common.locationLabel"))
const locationPlaceholderText = computed(() => props.locationPlaceholder || t("community.creation.common.locationPlaceholder"))
const locationHintText = computed(() => props.locationHint || t("community.creation.common.locationHint"))

const isBusy = computed(() => props.submitState === "loading")
const isSubmitDisabled = computed(() => props.submitDisabled || isBusy.value)

const privacyItems = computed(() =>
  props.privacyOptions.map(option => ({
    value: option.value,
    label: t(option.label),
  })),
)

const categoryItems = computed(() =>
  props.categoryOptions.map(option => ({
    value: option.value,
    label: t(option.label),
  })),
)

const locationModel = computed({
  get: () => normalizeLocationSelection(model.value.location ?? emptyLocationSelection()),
  set: (value) => {
    model.value.location = normalizeLocationSelection(value)
  },
})

watch(
  () => model.value.name,
  (value, previousValue) => {
    const previousSuggestedSlug = createCommunitySlug(previousValue || "")
    const currentSlug = (model.value.slug || "").trim()
    if (!currentSlug || currentSlug === previousSuggestedSlug) {
      model.value.slug = createCommunitySlug(value)
    }
  },
)

const validateForm = (state: CommunityDraft): CreationFormError[] => {
  const errors: CreationFormError[] = []
  const slug = (state.slug || "").trim()
  if (!(state.name || "").trim()) errors.push({ name: "name", message: t("community.creation.common.validationNameRequired") })
  if (!slug) errors.push({ name: "slug", message: t("community.creation.common.validationSlugRequired") })
  else if (slug.length < 5 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push({ name: "slug", message: t("community.creation.common.validationSlugInvalid") })
  if ((state.description || "").trim().length < 24) errors.push({ name: "description", message: t("community.creation.common.validationDescriptionRequired") })
  if (props.showPrivacy && !state.privacy) errors.push({ name: "privacy", message: t("community.creation.common.validationPrivacyRequired") })
  if (!state.category) errors.push({ name: "category", message: t("community.creation.common.validationCategoryRequired") })
  if (props.showLocation && (!(state.location?.address || "").trim() || !hasLocationCoordinates(state.location))) {
    errors.push({ name: "location", message: t("community.creation.common.validationLocationRequired") })
  }
  return errors
}
</script>
