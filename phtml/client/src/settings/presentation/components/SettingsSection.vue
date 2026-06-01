<!-- English description: Account settings section renderer with save feedback and field grouping. -->

<template>
  <section class="settings-section" :aria-labelledby="`section-title-${sectionId}`">
    <!-- Section header -->
    <div class="settings-section__header-row">
      <div class="settings-section__header-main">
        <div class="settings-section__badge-row">
          <span class="settings-section__badge-icon">
            <Icon :name="sectionIcon" class="h-3.5 w-3.5" />
          </span>
          <span class="settings-section__badge-text">{{ kindLabel }}</span>
        </div>
        <h2 :id="`section-title-${sectionId}`" class="settings-section__title">
          {{ section.title }}
        </h2>
      </div>

      <UButton
        v-if="canSave"
        size="sm"
        :loading="saving"
        class="settings-section__save-button"
        @click="handleSave"
      >
        <template #leading>
          <Icon name="i-ph-floppy-disk-duotone" class="h-4 w-4" />
        </template>
        {{ t("settings.section.saveChanges") }}
      </UButton>
    </div>

    <div class="settings-section__divider-line" />

    <!-- Fields grid -->
    <div v-if="section.kind === 'form' && section.fields?.length" class="settings-section__fields">
      <SettingsField
        v-for="field in section.fields"
        :key="field.key"
        :field="field"
        :class="isFullField(field) ? 'settings-section__field--full' : ''"
        @change="handleFieldChange"
      />
    </div>

    <!-- Profile Images (Facebook style) -->
    <div v-if="section.kind === 'profile-images' && section.fields?.length" class="settings-section__profile-images">
      <SettingsProfileImages
        :fields="section.fields"
        @change="handleFieldChange"
      />
    </div>

    <!-- Toggles — USwitch from @nuxt/ui -->
    <div v-if="section.toggles?.length" class="settings-section__toggles" role="list">
      <div
        v-for="toggle in section.toggles"
        :key="toggle.key"
        class="settings-section__toggle"
        role="listitem"
      >
        <div class="settings-section__toggle-copy">
          <p class="settings-section__toggle-label">{{ toggle.label }}</p>
          <p class="settings-section__toggle-description">{{ toggle.description }}</p>
        </div>
        <USwitch
          :model-value="toggleValues[toggle.key]"
          :disabled="toggle.readOnly"
          size="md"
         
          @update:model-value="value => handleToggleChange(toggle.key, value)"
        />
      </div>
    </div>

    <!-- List items -->
    <div v-if="section.items?.length" class="settings-section__items" role="list">
      <div
        v-for="item in section.items"
        :key="item.title"
        class="settings-section__item"
        role="listitem"
      >
        <div class="settings-section__item-copy">
          <div class="settings-section__item-title-row">
            <h3 class="settings-section__item-title">{{ item.title }}</h3>
            <UBadge
              v-if="item.meta"
              variant="soft"
              class="rounded-full text-[10px] font-semibold px-2.5 py-0.5 bg-[rgba(0,0,255,0.07)] text-[#0000ff] border-0 ring-0"
            >
              {{ item.meta }}
            </UBadge>
          </div>
          <p class="settings-section__item-description">{{ item.description }}</p>
        </div>
        <!-- UButton (outline) from @nuxt/ui -->
        <UButton
          v-if="item.action"
          size="sm"
          variant="outline"
          class="rounded-[10px] text-[12px] font-semibold border-[rgba(0,0,255,0.2)] text-[#0000ff] bg-white hover:bg-[#0000ff] hover:text-white hover:border-[#0000ff] active:scale-[0.98] transition-all shrink-0"
          @click="onAction?.(item)"
        >
          {{ item.action }}
        </UButton>
      </div>
    </div>

    <!-- Danger zone -->
    <div v-if="section.kind === 'danger'" class="settings-section__danger">
      <div class="settings-section__danger-inner">
        <div class="settings-section__danger-copy">
          <div class="settings-section__danger-icon-row">
            <div class="settings-section__danger-icon" aria-hidden="true">
              <Icon name="i-ph-warning-octagon-fill" class="h-4 w-4" />
            </div>
            <p class="settings-section__danger-label">{{ t("settings.section.kind.danger") }}</p>
          </div>
          <p class="settings-section__danger-message">
            {{ t("settings.section.dangerMessage") }}
          </p>
        </div>
        <!-- UButton (danger) from @nuxt/ui -->
        <UButton
          color="error"
          size="sm"
          class="rounded-[10px] text-[12px] font-bold shadow-[0_4px_12px_rgba(220,38,38,0.2)] hover:shadow-[0_6px_18px_rgba(220,38,38,0.28)] hover:-translate-y-px active:scale-[0.98] transition-all shrink-0"
          :disabled="!canSave"
          :loading="saving"
          @click="handleSave"
        >
          <template #leading>
            <Icon name="i-ph-trash-duotone" class="h-4 w-4" />
          </template>
          {{ section.actions?.[0]?.label }}
        </UButton>
      </div>
    </div>

    <!-- Saved feedback — UAlert from @nuxt/ui -->
    <Transition name="fade-up">
      <UAlert
        v-if="savedMessage"
        icon="i-ph-check-circle-fill"
        :title="savedMessage"
        class="rounded-[10px] border border-[rgba(0,0,255,0.12)] bg-[rgba(0,0,255,0.05)]"
      />
    </Transition>

    <Transition name="fade-up">
      <UAlert
        v-if="errorMessage"
        color="error"
        icon="i-ph-warning-circle-fill"
        :title="errorMessage"
        class="rounded-[10px] border border-[rgba(220,38,38,0.12)] bg-[#fef2f2]"
      />
    </Transition>
  </section>
</template>

<script setup lang="ts">
import type {
  SettingField,
  SettingFieldValue,
  SettingItem,
  SettingSection,
} from "../../application/view-models/settings-page.types"
import SettingsField from "./SettingsField.vue"
import SettingsProfileImages from "./SettingsProfileImages.vue"

const props = defineProps<{
  section: SettingSection
  onSave?: (fields: Record<string, SettingFieldValue>) => Promise<string>
  onAction?: (item: SettingItem) => Promise<void>
}>()
const { t } = useI18n()
const toast = useToast()

const saving = ref(false)
const savedMessage = ref("")
const errorMessage = ref("")
const fieldValues = reactive<Record<string, SettingFieldValue>>({})
const toggleValues = reactive<Record<string, SettingFieldValue>>({})
const sectionId = computed(() => props.section.title.replace(/\s+/g, "-").toLowerCase())

const isFullField = (field: SettingField) =>
  field.span === "full" || ["textarea", "file", "verification"].includes(field.type)
const canSave = computed(() =>
  Boolean(
    props.onSave
    && (
      props.section.fields?.some(field => !field.readOnly)
      || props.section.toggles?.some(toggle => !toggle.readOnly)
    ),
  ),
)

watch(
  () => props.section.fields,
  (fields) => {
    for (const field of fields ?? []) {
      fieldValues[field.key] = field.value
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.section.toggles,
  (toggles) => {
    for (const toggle of toggles ?? []) {
      toggleValues[toggle.key] = toggle.enabled
    }
  },
  { immediate: true, deep: true },
)

function handleFieldChange(payload: { key: string; value: SettingFieldValue }) {
  fieldValues[payload.key] = payload.value
}

function handleToggleChange(key: string, value: boolean) {
  toggleValues[key] = value
}

async function handleSave() {
  if (!props.onSave || saving.value) {
    return
  }

  savedMessage.value = ""
  errorMessage.value = ""
  saving.value = true

  try {
    const writableValues: Record<string, SettingFieldValue> = {}

    for (const field of props.section.fields ?? []) {
      if (!field.readOnly) {
        writableValues[field.key] = fieldValues[field.key]
      }
    }

    for (const toggle of props.section.toggles ?? []) {
      if (!toggle.readOnly) {
        writableValues[toggle.key] = toggleValues[toggle.key]
      }
    }

    const message = await props.onSave(writableValues)
    savedMessage.value = message
    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: t("settings.section.savedState"),
      description: savedMessage.value,
    })
    setTimeout(() => { savedMessage.value = "" }, 3000)
  }
  catch (error) {
    const fetchError = error as any
    errorMessage.value = fetchError.data?.statusMessage || fetchError.data?.message || (error instanceof Error ? error.message : t("settings.section.saveError"))
    toast.add({
      color: "error",
      icon: "i-ph-warning-circle-fill",
      title: t("settings.section.saveError"),
      description: errorMessage.value,
    })
  }
  finally {
    saving.value = false
  }
}

const kindLabel = computed(() => {
  switch (props.section.kind) {
    case "form":    return t("settings.section.kind.form")
    case "toggles": return t("settings.section.kind.toggles")
    case "list":    return t("settings.section.kind.list")
    case "danger":  return t("settings.section.kind.danger")
    case "summary": return t("settings.section.kind.summary")
    case "profile-images": return t("settings.section.kind.profileImages")
    default:        return props.section.kind
  }
})

const sectionIcon = computed(() => {
  switch (props.section.kind) {
    case "form":    return "i-ph-pencil-simple-duotone"
    case "toggles": return "i-ph-sliders-horizontal-duotone"
    case "list":    return "i-ph-list-bullets-duotone"
    case "danger":  return "i-ph-warning-octagon-duotone"
    case "summary": return "i-ph-chart-bar-duotone"
    case "profile-images": return "i-ph-image-duotone"
    default:        return "i-ph-gear-duotone"
  }
})
</script>

<style scoped>
.settings-section {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.settings-section:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 8px 24px rgba(0, 0, 0, 0.06);
}

/* ─── Header ──────────────────────────── */
.settings-section__header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.settings-section__header-main {
  flex: 1;
  min-width: 0;
}

.settings-section__badge-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #f1f5f9;
}

.settings-section__badge-icon {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 6px;
  color: #0000ff;
  box-shadow: 0 2px 4px rgba(0, 0, 255, 0.05);
}

.settings-section__badge-text {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.settings-section__title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.settings-section__description {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.5;
  max-width: 540px;
}

.settings-section__save-button {
  border-radius: 10px !important;
  background: #1420ff !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  padding: 10px 20px !important;
  height: auto !important;
  box-shadow: 0 4px 12px rgba(20, 32, 255, 0.22) !important;
  transition: all 0.2s ease !important;
}

.settings-section__save-button:hover {
  background: #1018d8 !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(20, 32, 255, 0.32) !important;
}

/* ─── Divider ─────────────────────────── */
.settings-section__divider-line {
  height: 1px;
  background: linear-gradient(to right, #f1f5f9, #f8fafc);
  margin: 4px 0;
}

/* ─── Fields Grid ─────────────────────── */
.settings-section__fields {
  width: 100%;
  min-width: 0;
  display: grid;
  gap: 20px 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-section__fields > * {
  min-width: 0;
}

.settings-section__field--full {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .settings-section {
    padding: 16px;
    gap: 16px;
  }

  .settings-section__header-row {
    flex-direction: column;
    gap: 12px;
  }

  .settings-section__save-button {
    width: 100%;
    justify-content: center;
  }

  .settings-section__fields {
    gap: 14px;
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ─── Toggles ─────────────────────────── */
.settings-section__toggles {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}

.settings-section__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.settings-section__toggle:hover {
  border-color: #e2e8f0;
  background: #fafbfe;
}

.settings-section__toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.settings-section__toggle-description {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

/* ─── List Items ──────────────────────── */
.settings-section__items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-section__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.settings-section__item:hover {
  border-color: #e2e8f0;
  background: #fafbfe;
}

.settings-section__item-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.settings-section__item-description {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

/* ─── Danger Zone ─────────────────────── */
.settings-section__danger {
  border-radius: 16px;
  background: #fffafa;
  border: 1px solid #fee2e2;
  padding: 20px;
}

.settings-section__danger-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.settings-section__danger-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.settings-section__danger-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #ef4444;
  letter-spacing: 0.05em;
}

.settings-section__danger-message {
  font-size: 13px;
  font-weight: 500;
  color: #7f1d1d;
  margin-top: 4px;
}

/* ─── Saved UAlert transition ─────────── */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
