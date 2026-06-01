<!-- Description: Upload-first story/status creation that picks media, previews it, adds a caption, and submits to the backend. -->
<template>
  <div class="status-create">
    <!-- Back bar -->
    <div class="status-create__topbar">
      <UButton
        :to="feedHomePath"
        color="primary"
        variant="soft"
        icon="i-ph-arrow-left-bold"
        class="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
      >
        {{ t("pages.statusCreatePage.backToFeed") }}
      </UButton>

      <div>
        <p class="status-create__eyebrow">{{ t("pages.statusCreatePage.eyebrow") }}</p>
        <h1 class="status-create__title">{{ t("pages.statusCreatePage.title") }}</h1>
      </div>
    </div>

    <!-- Main grid: upload + preview side by side on desktop -->
    <div class="status-create__grid">
      <!-- Left: drop zone + caption + submit -->
      <section class="status-create__main">

        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          :accept="feedStoryAcceptedMimeTypes"
          class="hidden"
          type="file"
          @change="handleFileSelection"
        >

        <!-- Drop zone -->
        <div
          v-bind="dropZoneAttrs"
          class="status-create__dropzone"
          :class="{
            'status-create__dropzone--has-file': !!selectedFile,
            'status-create__dropzone--drag': isOverDropZone,
          }"
          @click="openPicker"
        >
          <template v-if="!selectedFile">
            <div class="status-create__dropzone-icon">
              <Icon name="i-ph-upload-simple-duotone" class="h-9 w-9" />
            </div>
          </template>

          <template v-else>
            <template v-if="mediaType === 'image'">
              <NuxtImg :src="previewUrl" :alt="selectedFile.name" class="status-create__inline-preview" />
            </template>
            <template v-else>
              <div class="status-create__dropzone-icon">
                <Icon name="i-ph-video-duotone" class="h-9 w-9" />
              </div>
              <p class="status-create__dropzone-heading">{{ selectedFile.name }}</p>
            </template>

            <!-- Overlay actions -->
            <div class="status-create__file-overlay surface-card" @click.stop>
              <UButton
                color="neutral"
                variant="solid"
                size="sm"
                icon="i-ph-pencil-simple-bold"
                class="btn-secondary text-secondary"
                @click="openPicker"
              >
                {{ t("pages.statusCreatePage.changeFile") }}
              </UButton>
              <UButton
                icon="i-ph-trash-simple-bold"
                size="sm"
                class="btn-ghost"
                @click="removeFile"
              >
                {{ t("pages.statusCreatePage.removeFile") }}
              </UButton>
            </div>
          </template>
        </div>

        <!-- Caption (revealed after file picked) -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
        >
          <UCard
            v-if="selectedFile"
            class="status-create__caption-card rounded-[22px] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]"
            :ui="{ body: 'p-4' }"
          >
            <textarea
              id="status-caption"
              ref="captionRef"
              v-model="caption"
              class="status-create__caption-input"
              :placeholder="t('pages.statusCreatePage.captionPlaceholder')"
              rows="3"
              :maxlength="feedStoryCaptionMaxLength"
            />
            <p class="status-create__caption-count" :class="{ 'text-red-500': caption.length > feedStoryCaptionWarningLength }">
              {{ caption.length }}/{{ feedStoryCaptionMaxLength }}
            </p>
          </UCard>
        </Transition>

        <!-- Submit bar (reuse shared-kernel component) -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
        >
          <FormsSubmitBar
            v-if="selectedFile"
            :cta="t('pages.statusCreatePage.submitCta')"
            :loading="submitting"
            :show-save="false"
            :submit-disabled="!selectedFile"
            :status="submitStatus"
            :status-description="statusDescription"
            class="status-create__submit-bar rounded-[22px]"
            @submit="submitStory"
          />
        </Transition>
      </section>

      <!-- Right: phone preview -->
      <aside class="status-create__preview-pane">
        <p class="status-create__preview-eyebrow">{{ t("pages.statusCreatePage.previewEyebrow") }}</p>

        <div class="status-create__phone">
          <div class="status-create__phone-screen">
            <template v-if="mediaType === 'image' && previewUrl">
              <NuxtImg :src="previewUrl" :alt="t('pages.statusCreatePage.previewAlt')" class="status-create__phone-media" />
            </template>
            <template v-else-if="mediaType === 'video' && previewUrl">
              <video :src="previewUrl" class="status-create__phone-media" controls muted playsinline />
            </template>
            <template v-else>
              <div class="status-create__phone-placeholder" />
            </template>

            <div class="status-create__phone-overlay" />

            <div class="status-create__phone-bars">
              <div class="status-create__phone-bar">
                <div class="status-create__phone-bar-fill" :style="{ width: previewBarWidth }" />
              </div>
              <div class="status-create__phone-bar status-create__phone-bar--dim" />
              <div class="status-create__phone-bar status-create__phone-bar--dim" />
            </div>

            <div class="status-create__phone-author">
              <div class="status-create__phone-avatar">
                <NuxtImg v-if="currentUserAvatar" :src="currentUserAvatar" :alt="currentUserName" class="status-create__phone-avatar-img" />
                <span v-else>{{ currentUserInitials }}</span>
              </div>
              <div>
                <p class="status-create__phone-name">{{ currentUserName || t("pages.statusCreatePage.previewFallbackName") }}</p>
                <p class="status-create__phone-time">{{ t("pages.statusCreatePage.previewTimestamp") }}</p>
              </div>
            </div>

            <div v-if="caption" class="status-create__phone-caption">{{ caption }}</div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStatusCreatePageVM } from "../../application/view-models/useStatusCreatePageVM"
import FormsSubmitBar from "../../../shared-kernel/presentation/components/forms/SubmitBar.vue"
import {
  feedHomePath,
  feedStoryAcceptedMimeTypes,
  feedStoryCaptionMaxLength,
  feedStoryCaptionWarningLength,
} from "../../application/constants/story-carousel"

const { t } = useI18n()

useSeoMeta({
  title: () => t("pages.statusCreatePage.seoTitle"),
  description: () => t("pages.statusCreatePage.seoDescription"),
})

const {
  fileInputRef,
  dropZoneAttrs,
  isOverDropZone,
  selectedFile,
  previewUrl,
  mediaType,
  caption,
  captionRef,
  submitting,
  submitStatus,
  statusDescription,
  currentUserName,
  currentUserAvatar,
  currentUserInitials,
  previewBarWidth,
  openPicker,
  handleFileSelection,
  removeFile,
  submitStory,
} = useStatusCreatePageVM()

// ── File & preview ────────────────────────────────────────

// @vueuse/core: drop zone

// Bind ref to the div (must pass as v-bind because useDropZone expects a ref)

// ── Submit state ──────────────────────────────────────────

// ── Auth user ─────────────────────────────────────────────

// ── File helpers ──────────────────────────────────────────

// ── Submit ────────────────────────────────────────────────
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────── */
.status-create {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 640px) {
  .status-create { padding: 28px 24px 64px; }
}

.status-create__topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.status-create__eyebrow {
  font-family: var(--font-primary);
  font-size: var(--text-label);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin: 0;
}

.status-create__title {
  font-family: var(--font-secondary);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.04em;
  color: var(--text-primary);
  margin: 0;
}

/* ── Grid ─────────────────────────────────────────── */
.status-create__grid {
  display: grid;
  gap: 24px;
}

@media (min-width: 900px) {
  .status-create__grid {
    grid-template-columns: minmax(0, 1fr) 280px;
    align-items: start;
  }
}

.status-create__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Drop zone ────────────────────────────────────── */
.status-create__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 280px;
  border-radius: 22px;
  border: 2px dashed var(--border-default);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 249, 255, 0.98) 100%);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  text-align: center;
  padding: 32px 24px;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.status-create__dropzone:hover,
.status-create__dropzone--drag {
  border-color: var(--border-strong);
  background: var(--bg-surface-hover);
  box-shadow: var(--shadow-md);
}

.status-create__dropzone--has-file {
  border-style: solid;
  border-color: var(--border-default);
  background: var(--bg-surface);
  padding: 0;
  min-height: 320px;
}

.status-create__dropzone-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  color: var(--icon-brand);
}

.status-create__dropzone-heading {
  font-family: var(--font-primary);
  font-size: 17px;
  font-weight: var(--weight-extrabold);
  color: var(--text-primary);
  margin: 0;
}

.status-create__dropzone-hint {
  font-family: var(--font-primary);
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 340px;
  line-height: 1.6;
  margin: 0;
}

.status-create__inline-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
}

.status-create__file-overlay {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}

/* ── Caption ──────────────────────────────────────── */
.status-create__caption-label {
  display: block;
  font-family: var(--font-primary);
  font-size: var(--text-label);
  font-weight: var(--weight-bold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.status-create__caption-card {
  overflow: hidden;
}

.status-create__caption-input {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface-hover);
  padding: 12px 14px;
  font-family: var(--font-primary);
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text-primary);
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  overflow-y: hidden;
}

.status-create__caption-input:focus {
  border-color: var(--border-strong);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.08);
}

.status-create__caption-count {
  font-family: var(--font-primary);
  font-size: 11.5px;
  color: var(--text-tertiary);
  text-align: right;
  margin: 6px 0 0;
  transition: color 0.15s ease;
}

.status-create__submit-bar :deep(.rounded-\[28px\]) {
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.status-create__submit-bar :deep(.border-\[\#dbe3f2\]) {
  border-color: var(--border-default);
}

.status-create__submit-bar :deep(.bg-white\/90) {
  background: var(--bg-surface);
}

.status-create__submit-bar :deep(.shadow-\[0_14px_34px_rgba\(15\,35\,110\,0\.07\)\]) {
  box-shadow: var(--shadow-sm);
}

/* ── Preview pane ─────────────────────────────────── */
.status-create__preview-pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.status-create__preview-eyebrow {
  font-family: var(--font-primary);
  font-size: var(--text-label);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin: 0;
  align-self: flex-start;
}

.status-create__phone {
  width: 100%;
  max-width: 260px;
  border-radius: 36px;
  border: 6px solid #d7def0;
  background: #edf2ff;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(0, 0, 255, 0.08);
  overflow: hidden;
}

.status-create__phone-screen {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: 30px;
  background: linear-gradient(180deg, #f8faff 0%, #e8efff 100%);
}

.status-create__phone-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-create__phone-placeholder {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #f8fbff 0%, #dfe8ff 100%);
}

.status-create__phone-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, transparent 28%, rgba(15, 23, 42, 0.16) 100%);
}

.status-create__phone-bars {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
}

.status-create__phone-bar {
  flex: 1;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  overflow: hidden;
}

.status-create__phone-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--bg-brand);
  transition: width 0.3s ease;
}

.status-create__phone-bar--dim {
  background: rgba(255, 255, 255, 0.34);
}

.status-create__phone-author {
  position: absolute;
  top: 24px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.status-create__phone-avatar {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-brand);
  border: 2px solid rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.status-create__phone-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-create__phone-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.status-create__phone-time {
  font-size: 10px;
  color: var(--text-secondary);
  margin: 0;
}

.status-create__phone-caption {
  position: absolute;
  bottom: 12px;
  left: 10px;
  right: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-primary);
}
</style>
