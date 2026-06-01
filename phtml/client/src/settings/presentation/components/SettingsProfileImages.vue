<template>
  <div class="profile-images-section">
    <!-- Cover -->
    <div
      class="profile-images__cover"
      @click="openCoverSelector"
      :style="{ backgroundImage: coverPreview ? `url(${coverPreview})` : 'none' }"
      role="button"
      tabindex="0"
      :aria-label="coverField?.label || 'Cover'"
      @keydown.enter="openCoverSelector"
      @keydown.space.prevent="openCoverSelector"
    >
      <div v-if="!coverPreview" class="profile-images__cover-placeholder">
        <Icon name="i-ph-image-duotone" class="h-8 w-8 text-[#94a3b8]" />
        <span>{{ coverField?.label }}</span>
      </div>
      <div class="profile-images__edit-btn profile-images__edit-btn--cover">
        <Icon name="i-ph-camera-fill" class="h-4 w-4" />
        <span class="sr-only">Edit Cover</span>
      </div>
      <input
        ref="coverInput"
        type="file"
        class="hidden"
        :accept="coverField?.accept"
        @change="e => handleFileChange('cover', e)"
      />
    </div>

    <!-- Avatar -->
    <div class="profile-images__avatar-wrapper">
      <div
        class="profile-images__avatar"
        @click="openAvatarSelector"
        :style="{ backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none' }"
        role="button"
        tabindex="0"
        :aria-label="avatarField?.label || 'Avatar'"
        @keydown.enter="openAvatarSelector"
        @keydown.space.prevent="openAvatarSelector"
      >
        <div v-if="!avatarPreview" class="profile-images__avatar-placeholder">
          <Icon name="i-ph-user-duotone" class="h-10 w-10 text-[#94a3b8]" />
        </div>
        <div class="profile-images__edit-btn profile-images__edit-btn--avatar">
          <Icon name="i-ph-camera-fill" class="h-4 w-4" />
          <span class="sr-only">Edit Avatar</span>
        </div>
        <input
          ref="avatarInput"
          type="file"
          class="hidden"
          :accept="avatarField?.accept"
          @change="e => handleFileChange('avatar', e)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SettingField, SettingFieldValue } from "../../application/view-models/settings-page.types"

const props = defineProps<{
  fields: SettingField[]
}>()

const emit = defineEmits<{
  change: [payload: { key: string; value: SettingFieldValue }]
}>()

const avatarField = computed(() => props.fields.find(f => f.key === 'avatar'))
const coverField = computed(() => props.fields.find(f => f.key === 'cover'))

const avatarPreview = ref(avatarField.value?.previewUrl || '')
const coverPreview = ref(coverField.value?.previewUrl || '')

const avatarInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)

watch(() => avatarField.value?.previewUrl, (val) => { if (val) avatarPreview.value = val })
watch(() => coverField.value?.previewUrl, (val) => { if (val) coverPreview.value = val })

function openAvatarSelector() {
  avatarInput.value?.click()
}

function openCoverSelector() {
  coverInput.value?.click()
}

function handleFileChange(key: 'avatar' | 'cover', event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Update preview
  const url = URL.createObjectURL(file)
  if (key === 'avatar') avatarPreview.value = url
  if (key === 'cover') coverPreview.value = url

  emit('change', { key, value: file })
}
</script>

<style scoped>
.profile-images-section {
  position: relative;
  display: flex;
  flex-direction: column;
  margin-bottom: 72px; /* Make space for avatar overlapping */
}

.profile-images__cover {
  position: relative;
  width: 100%;
  height: 240px;
  background-color: #f1f5f9;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.2s;
}

.profile-images__cover:hover {
  filter: brightness(0.95);
}

.profile-images__cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  gap: 8px;
}

.profile-images__avatar-wrapper {
  position: relative;
  height: 0;
  z-index: 10;
}

.profile-images__avatar {
  position: absolute;
  top: -64px; /* Half of avatar height (128px / 2) */
  left: 32px;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  border: 4px solid #ffffff;
  background-color: #f1f5f9;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: filter 0.2s;
}

.profile-images__avatar:hover {
  filter: brightness(0.95);
}

.profile-images__avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.profile-images__edit-btn {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  pointer-events: none; /* Let clicks pass to the container */
}

.profile-images__edit-btn--cover {
  bottom: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
}

.profile-images__edit-btn--avatar {
  bottom: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
}

.hidden {
  display: none;
}
</style>
