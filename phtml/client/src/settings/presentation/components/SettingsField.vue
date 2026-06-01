<!-- English description: Account settings field renderer for Nuxt UI form controls. -->

<template>
  <UFormField
    :label="field.label"
    :help="field.description"
    class="settings-field w-full min-w-0"
  >
    <!-- Textarea -->
    <UTextarea
      v-if="field.type === 'textarea'"
      v-model="value"
      :placeholder="field.placeholder"
      :disabled="field.readOnly"
      :rows="4"
      class="w-full min-w-0"
      
    />

    <!-- Select: ≤3 options → radio pills, >3 options → USelect dropdown -->
    <GooglePlaceField
      v-else-if="field.type === 'location'"
      :model-value="locationValue"
      :placeholder="field.placeholder"
      :disabled="field.readOnly"
      require-coordinates
      @update:model-value="setLocation"
    />

    <div
      v-else-if="field.type === 'select' && (field.options?.length ?? 0) <= 3"
      class="settings-field__pills"
      :class="{ 'settings-field__pills--disabled': field.readOnly }"
      role="radiogroup"
      :aria-label="field.label"
    >
      <label
        v-for="opt in (field.options ?? [])"
        :key="opt"
        class="settings-field__pill"
        :class="{ 'settings-field__pill--active': String(value) === opt }"
      >
        <input
          v-model="value"
          class="settings-field__pill-radio"
          :disabled="field.readOnly"
          type="radio"
          :name="`field-${field.key}`"
          :value="opt"
        >
        <span class="settings-field__pill-label">{{ opt }}</span>
      </label>
    </div>

    <!-- Select: >3 options → USelectMenu with search (correct for country etc.) -->
    <USelectMenu
      v-else-if="field.type === 'select' && (field.options?.length ?? 0) > 3"
      :id="`field-${field.key}`"
      v-model="value"
      :items="field.options ?? []"
      :placeholder="field.placeholder"
      :disabled="field.readOnly"
      size="md"
      class="w-full min-w-0"
    />

    <!-- Verification state — chip buttons -->
    <div v-else-if="field.type === 'verification'" class="settings-field__verify-group">
      <button
        type="button"
        class="settings-field__verify-btn"
        :class="{ 'settings-field__verify-btn--active': isVerified }"
        :disabled="field.readOnly"
        @click="setVerified(true)"
      >
        <Icon :name="isVerified ? 'i-ph-check-circle-fill' : 'i-ph-circle-duotone'" class="h-4 w-4" />
        {{ verifiedLabel }}
      </button>
      <button
        type="button"
        class="settings-field__verify-btn"
        :class="{ 'settings-field__verify-btn--active': !isVerified }"
        :disabled="field.readOnly"
        @click="setVerified(false)"
      >
        <Icon :name="!isVerified ? 'i-ph-x-circle-fill' : 'i-ph-circle-duotone'" class="h-4 w-4" />
        {{ unverifiedLabel }}
      </button>
    </div>

    <!-- File input: native input so the Nuxt API repository can forward multipart data to PHP. -->
    <div
      v-else-if="field.type === 'file'"
      class="settings-field__file"
    >
      <div
        v-if="previewUrl"
        class="settings-field__preview"
        :class="previewShapeClass"
      >
        <NuxtPicture
          v-if="canUseNuxtPicturePreview"
          :src="previewUrl"
          format="webp"
          loading="lazy"
          :img-attrs="{
            alt: field.label,
            class: 'settings-field__preview-image',
          }"
        />
        <img
          v-else
          :src="previewUrl"
          :alt="field.label"
          class="settings-field__preview-image"
        >
      </div>
      <input
        :id="`field-${field.key}`"
        :accept="field.accept"
        :disabled="field.readOnly"
        type="file"
        class="settings-field__file-input"
        @change="handleFileChange"
      >
    </div>

    <!-- Standard input (text / email / password / tel / date / url / number) -->
    <UInput
      v-else
      v-model="value"
      :type="field.type"
      :placeholder="field.placeholder"
      :disabled="field.readOnly"
      size="md"
      class="w-full min-w-0"
      
    >
      <template #leading>
        <Icon :name="fieldIcon" class="h-4 w-4 text-[#94a3b8]" />
      </template>
    </UInput>
  </UFormField>
</template>

<script setup lang="ts">
import GooglePlaceField from "../../../location/presentation/components/GooglePlaceField.vue"
import {
  normalizeLocationSelection,
  type LocationSelection,
} from "../../../location/domain/types/location.types"
import type { SettingField } from "../../application/view-models/settings-page.types"

const props = defineProps<{ field: SettingField }>()
const emit = defineEmits<{
  change: [payload: { key: string; value: SettingField["value"] }]
}>()
const { t } = useI18n()
const value = ref(props.field.value)
const objectPreviewUrl = ref("")

watch(() => props.field.value, (v) => {
  value.value = v
})

watch(value, (v) => {
  emit("change", { key: props.field.key, value: v })
})

const fieldIcon = computed(() => {
  const k = props.field.key.toLowerCase()
  if (k.includes("wallet"))   return "i-ph-wallet-duotone"
  if (k.includes("password")) return "i-ph-lock-duotone"
  if (k.includes("email"))    return "i-ph-envelope-duotone"
  if (k.includes("phone"))    return "i-ph-phone-duotone"
  if (["website", "facebook", "twitter", "linkedin", "instagram", "youtube"].some(s => k.includes(s)))
    return "i-ph-link-simple-duotone"
  if (k.includes("birthday")) return "i-ph-calendar-duotone"
  if (k.includes("name"))     return "i-ph-user-duotone"
  return "i-ph-pencil-duotone"
})

const isVerified = computed(() => value.value === true || value.value === 1 || value.value === "1")
const verifiedLabel = computed(() => t("settings.data.fields.verified"))
const unverifiedLabel = computed(() => t("settings.data.fields.notVerified"))
const locationValue = computed(() => {
  const isFile = typeof File !== "undefined" && value.value instanceof File

  if (typeof value.value === "object" && value.value !== null && !isFile) {
    return normalizeLocationSelection(value.value as Partial<LocationSelection>)
  }

  return normalizeLocationSelection({ address: String(value.value ?? "") })
})
const previewUrl = computed(() => objectPreviewUrl.value || props.field.previewUrl || "")
const canUseNuxtPicturePreview = computed(() =>
  Boolean(previewUrl.value)
  && !previewUrl.value.startsWith("blob:")
  && !previewUrl.value.startsWith("data:"),
)
const previewShapeClass = computed(() => ({
  "settings-field__preview--avatar": props.field.previewShape === "avatar",
  "settings-field__preview--cover": props.field.previewShape === "cover",
}))

function revokeObjectPreview() {
  if (objectPreviewUrl.value && typeof URL !== "undefined") {
    URL.revokeObjectURL(objectPreviewUrl.value)
  }

  objectPreviewUrl.value = ""
}

function setVerified(v: boolean) {
  if (props.field.readOnly) {
    return
  }

  value.value = v
}

function setLocation(nextValue: LocationSelection) {
  value.value = nextValue
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    revokeObjectPreview()

    if (file.type.startsWith("image/") && typeof URL !== "undefined") {
      objectPreviewUrl.value = URL.createObjectURL(file)
    }

    value.value = file
  }
}

onBeforeUnmount(revokeObjectPreview)
</script>

<style scoped>
.settings-field :deep([data-slot="root"]),
.settings-field :deep([data-slot="base"]) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

/* ─── Radio option pills ──────────────── */
.settings-field__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-field__pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #fafbfe;
  cursor: pointer;
  transition: all 0.15s ease;
}

.settings-field__pill:hover {
  border-color: rgba(0, 0, 255, 0.2);
  background: rgba(0, 0, 255, 0.02);
}

.settings-field__pills--disabled {
  opacity: 0.72;
  pointer-events: none;
}

.settings-field__pill--active {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.04);
}

/* visually hide the radio but keep it accessible */
.settings-field__pill-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

.settings-field__pill-label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  pointer-events: none;
  white-space: nowrap;
}

.settings-field__pill--active .settings-field__pill-label {
  color: #0000ff;
  font-weight: 600;
}

/* ─── Verification chip buttons ───────── */
.settings-field__verify-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.settings-field__verify-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #fafbfe;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
  cursor: pointer;
}

.settings-field__verify-btn:hover {
  border-color: rgba(0, 0, 255, 0.2);
  background: rgba(0, 0, 255, 0.02);
  color: #334155;
}

.settings-field__verify-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.settings-field__verify-btn--active {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.settings-field__file {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-field__preview {
  overflow: hidden;
  width: min(100%, 420px);
  min-height: 150px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.settings-field__preview--avatar {
  width: 112px;
  height: 112px;
  min-height: 112px;
  border-radius: 999px;
}

.settings-field__preview--cover {
  width: min(100%, 520px);
  aspect-ratio: 16 / 6;
  min-height: 120px;
}

.settings-field__preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.settings-field__preview :deep(picture),
.settings-field__preview :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
}

.settings-field__preview :deep(img) {
  object-fit: cover;
}

.settings-field__file-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfe;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.settings-field__file-input:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}
</style>
