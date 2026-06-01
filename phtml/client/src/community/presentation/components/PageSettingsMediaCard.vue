<template>
  <CommunitySettingsSectionCard
    :eyebrow="$t('community.pageSettings.sidebar.media.eyebrow')"
    :title="$t('community.pageSettings.sidebar.media.title')"
    :description="$t('community.pageSettings.sidebar.media.desc')"
    icon="i-ph-image-square-bold"
  >
    <template #trailing>
      <slot name="trailing" />
    </template>

    <div class="page-preview">
      <!-- Banner -->
      <div
        class="page-preview__banner"
        :style="bannerStyle"
      >
        <div class="page-preview__overlay"></div>

        <!-- Upload Banner -->
        <div class="page-preview__banner-upload">
          <input
            ref="bannerInput"
            type="file"
            accept="image/*"
            class="hidden-input"
            @change="e => onFileChange(e, 'bannerUrl')"
          >

          <button type="button" class="upload-btn" @click="bannerInput?.click()">
            <Icon name="i-ph-camera-bold" class="upload-btn__icon" />
          </button>
        </div>
      </div>

      <!-- Avatar -->
      <div class="page-preview__avatar-wrapper">
        <div class="page-preview__avatar" :style="{ background: previewPage?.accent }">
          <img
            v-if="previewPage?.avatarUrl"
            :src="previewPage?.avatarUrl"
            class="page-preview__avatar-img"
            @error="e => console.error('[ImageError] Avatar failed to load:', (e.target as HTMLImageElement).src)"
          >

          <span v-else>
            {{ initials }}
          </span>
        </div>

        <!-- Upload Avatar -->
        <input
          ref="avatarInput"
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="e => onFileChange(e, 'avatarUrl')"
        >

        <button type="button" class="avatar-upload-btn" @click="avatarInput?.click()">
          <Icon name="i-ph-camera-bold" class="avatar-upload-btn__icon" />
        </button>
      </div>
    </div>

    <!-- Spacer for overlapping avatar -->
    <div class="h-20 sm:h-28"></div>
  </CommunitySettingsSectionCard>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import type { CommunityPageRecord, CommunityPageSettingsDraft } from "../../domain/types/community.types"
import { getCommunityInitials } from "../../domain/services/community-helpers.service"
import CommunitySettingsSectionCard from "./SettingsSectionCard.vue"

const props = defineProps<{
  modelValue: CommunityPageSettingsDraft
  previewPage: CommunityPageRecord | null
}>()

const emit = defineEmits<{
  "update:modelValue": [value: CommunityPageSettingsDraft]
}>()

const bannerInput = ref<HTMLInputElement | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)

const initials = computed(() => getCommunityInitials(props.modelValue.name || props.previewPage?.name || ""))

const bannerStyle = computed(() => {
  const banner = props.previewPage?.banner
  if (!banner) return { backgroundColor: "#f1f5f9" }

  // Already a CSS gradient or url() value
  if (banner.startsWith("linear-gradient") || banner.startsWith("radial-gradient")) {
    return { background: banner }
  }

  if (banner.includes("url(")) {
    return { background: banner }
  }

  // Blob URL or regular image URL — render as background-image
  if (banner.startsWith("blob:") || banner.startsWith("http://") || banner.startsWith("https://") || banner.startsWith("/")) {
    return { backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundPosition: "center" }
  }

  // Fallback to accent color
  return { backgroundColor: props.previewPage?.accent || "#f1f5f9" }
})

function onFileChange(event: Event, field: "avatarUrl" | "bannerUrl") {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    const newDraft = { ...props.modelValue }
    
    newDraft[field] = URL.createObjectURL(file)
    
    if (field === "avatarUrl") {
      newDraft.avatarFile = file
    }
    else if (field === "bannerUrl") {
      newDraft.bannerFile = file
    }
    
    emit("update:modelValue", newDraft)
  }
}
</script>

<style scoped>
.page-preview {
  position: relative;
  margin-top: 16px;
}

/* =========================
   Banner
 ========================= */

.page-preview__banner {
  position: relative;
  width: 100%;
  height: 360px;
  overflow: hidden;
  border-radius: 24px;
  background-color: #f1f5f9;
  background-size: cover;
  background-position: center;
}

.page-preview__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.3),
      transparent);
}

/* =========================
   Banner Upload
 ========================= */

.page-preview__banner-upload {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 2;
}

/* =========================
   Avatar
 ========================= */

.page-preview__avatar-wrapper {
  position: absolute;
  left: 48px;
  bottom: -80px;
  z-index: 10;
}

.page-preview__avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  width: 176px;
  height: 176px;

  overflow: hidden;

  border: 8px solid #ffffff;
  border-radius: 999px;

  background: #3b82f6;

  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);

  color: #ffffff;
  font-size: 42px;
  font-weight: 900;
}

.page-preview__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* =========================
   Buttons
 ========================= */

.upload-btn,
.avatar-upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 999px;

  background: #ffffff;
  color: #0f172a;

  cursor: pointer;

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.upload-btn:hover,
.avatar-upload-btn:hover {
  transform: scale(1.05);
}

/* Banner button */

.upload-btn {
  width: 48px;
  height: 48px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
}

/* Avatar button */

.avatar-upload-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;

  width: 48px;
  height: 48px;

  border: 1px solid #e2e8f0;

  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
}

.upload-btn__icon,
.avatar-upload-btn__icon {
  width: 24px;
  height: 24px;
}

/* =========================
   Hidden Input
 ========================= */

.hidden-input {
  display: none;
}

/* =========================
   Responsive
 ========================= */

@media (max-width: 640px) {
  .page-preview__banner {
    height: 280px;
    border-radius: 20px;
  }

  .page-preview__banner-upload {
    right: 16px;
    bottom: 16px;
  }

  .page-preview__avatar-wrapper {
    left: 24px;
    bottom: -64px;
  }

  .page-preview__avatar {
    width: 128px;
    height: 128px;
    border-width: 6px;
    font-size: 30px;
  }

  .upload-btn,
  .avatar-upload-btn {
    width: 40px;
    height: 40px;
  }

  .upload-btn__icon,
  .avatar-upload-btn__icon {
    width: 20px;
    height: 20px;
  }
}
</style>