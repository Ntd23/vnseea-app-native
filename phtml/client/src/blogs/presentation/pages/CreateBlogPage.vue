<template>
  <div class="create-blog-page">
    <BlogsCreateBlogHero
      :stats="heroStats"
      @quick-fill="quickFillDemo"
    />

    <div class="create-blog-page__layout">
      <section class="create-blog-page__main">
        <section class="create-blog-page__intro">
          <div class="create-blog-page__intro-copy">
            <p class="create-blog-page__eyebrow">
              <Icon name="i-ph-pencil-line-fill" class="h-4 w-4" />
              {{ $t("pages.createBlogPage.editorEyebrow") }}
            </p>
            <h2 class="create-blog-page__heading">
              {{ $t("pages.createBlogPage.contentTitle") }}
            </h2>
            <p class="create-blog-page__description">
              {{ $t("pages.createBlogPage.contentDescription") }}
            </p>
          </div>

          <div class="create-blog-page__completion">
            <Icon name="i-ph-seal-check-fill" class="h-4 w-4" />
            {{ completionText }}
          </div>
        </section>

        <section class="create-blog-page__editor">
          <label class="create-blog-page__field create-blog-page__field--title">
            <span class="create-blog-page__label">{{ $t("pages.createBlogPage.titleLabel") }}</span>
            <input
              v-model="title"
              class="create-blog-page__title-input"
              maxlength="120"
              :placeholder="$t('pages.createBlogPage.titlePlaceholder')"
              type="text"
            >
          </label>

          <BlogsCreateBlogContentEditor
            v-model="content"
            class="create-blog-page__field"
          />

          <div class="create-blog-page__meta-grid">
            <label class="create-blog-page__field">
              <span class="create-blog-page__label">{{ $t("pages.createBlogPage.categoryLabel") }}</span>
              <select v-model="category" class="create-blog-page__control">
                <option
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="create-blog-page__field">
              <span class="create-blog-page__label">{{ $t("pages.createBlogPage.tagsLabel") }}</span>
              <input
                v-model="tagsInput"
                class="create-blog-page__control"
                :placeholder="$t('pages.createBlogPage.tagsPlaceholder')"
                type="text"
              >
            </label>
          </div>

          <div class="create-blog-page__tags">
            <span
              v-for="tag in tagList"
              :key="tag"
              class="create-blog-page__tag"
            >
              #{{ tag }}
            </span>
            <span v-if="tagList.length === 0" class="create-blog-page__tag-help">
              {{ $t("pages.createBlogPage.tagsHelp") }}
            </span>
          </div>

          <div class="create-blog-page__thumbnail">
            <p class="create-blog-page__label">{{ $t("pages.createBlogPage.thumbnailLabel") }}</p>

            <div class="create-blog-page__thumbnail-grid">
              <label class="create-blog-page__upload" for="blog-thumbnail">
                <input
                  id="blog-thumbnail"
                  class="sr-only"
                  type="file"
                  accept="image/*"
                  @change="onThumbnailChange"
                >
                <span class="create-blog-page__upload-icon">
                  <Icon name="i-ph-image-square-fill" class="h-7 w-7" />
                </span>
                <span class="create-blog-page__upload-title">
                  {{ $t("pages.createBlogPage.chooseThumbnail") }}
                </span>
                <span class="create-blog-page__upload-help">
                  {{ thumbnailName || $t("pages.createBlogPage.thumbnailFormats") }}
                </span>
              </label>

              <button
                class="create-blog-page__preview"
                type="button"
                @click="cycleThumbnail"
              >
                <div class="create-blog-page__preview-bg" :style="{ background: thumbnailBackground }" />
                <div class="create-blog-page__preview-shade" />
                <div class="create-blog-page__preview-copy">
                  <span>{{ $t("pages.createBlogPage.previewLabel") }}</span>
                  <strong>{{ title || $t("pages.createBlogPage.previewTitleFallback") }}</strong>
                  <small>{{ $t("pages.createBlogPage.cycleBackground") }}</small>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section class="create-blog-page__submit">
          <div
            class="create-blog-page__submit-status"
            :class="`create-blog-page__submit-status--${submitState}`"
            role="status"
            aria-live="polite"
          >
            <Icon :name="submitStatusIcon" class="h-5 w-5" />
            <p>{{ submitMessage || $t("pages.createBlogPage.submitHint") }}</p>
          </div>
          <div class="create-blog-page__submit-actions">
            <button class="create-blog-page__secondary" type="button" :disabled="isSubmitting" @click="saveDraft">
              <Icon :name="submitState === 'saving' ? 'i-ph-circle-notch-bold' : 'i-ph-floppy-disk-bold'" class="h-4 w-4" />
              <span>{{ $t("pages.createBlogPage.saveDraft") }}</span>
            </button>
            <button class="create-blog-page__primary" type="button" :disabled="isSubmitting" @click="publishBlog">
              <Icon :name="submitState === 'publishing' ? 'i-ph-circle-notch-bold' : 'i-ph-paper-plane-tilt-fill'" class="h-4 w-4" />
              <span>{{ $t("pages.createBlogPage.publish") }}</span>
            </button>
          </div>
        </section>
      </section>

      <BlogsCreateBlogSidebar
        class="create-blog-page__sidebar"
        :title="title"
        :thumbnail-background="thumbnailBackground"
        :selected-category-label="selectedCategoryLabel"
        :read-minutes="readMinutes"
        :tag-list="tagList"
        :preview-excerpt="previewExcerpt"
        :checklist-items="checklistItems"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BlogsCreateBlogHero from "../components/CreateBlogHero.vue"
import BlogsCreateBlogSidebar from "../components/CreateBlogSidebar.vue"
import BlogsCreateBlogContentEditor from "../components/CreateBlogContentEditor.vue"
import { useCreateBlogPageVM } from "../../application/view-models/useCreateBlogPageVM"

const {
  title,
  content,
  category,
  tagsInput,
  thumbnailName,
  submitMessage,
  submitState,
  isSubmitting,
  submitStatusIcon,
  categoryOptions,
  tagList,
  selectedCategoryLabel,
  thumbnailBackground,
  readMinutes,
  completionText,
  heroStats,
  previewExcerpt,
  checklistItems,
  cycleThumbnail,
  onThumbnailChange,
  saveDraft,
  publishBlog,
  quickFillDemo,
} = useCreateBlogPageVM()
</script>

<style scoped>
.create-blog-page {
  padding-bottom: 40px;
}

.create-blog-page__layout {
  display: grid;
  gap: 18px;
  margin-top: 18px;
}

.create-blog-page__main {
  min-width: 0;
  display: grid;
  gap: 16px;
}

.create-blog-page__intro,
.create-blog-page__editor,
.create-blog-page__submit {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.create-blog-page__intro {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.create-blog-page__eyebrow,
.create-blog-page__label {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.create-blog-page__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0000ff;
}

.create-blog-page__heading {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.create-blog-page__description {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.65;
}

.create-blog-page__completion {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 800;
}

.create-blog-page__editor {
  padding: 18px;
}

.create-blog-page__field {
  display: grid;
  gap: 10px;
}

.create-blog-page__field + .create-blog-page__field,
.create-blog-page__meta-grid,
.create-blog-page__thumbnail {
  margin-top: 20px;
}

.create-blog-page__title-input,
.create-blog-page__control {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fafbfe;
  color: #0f172a;
  font-family: inherit;
  outline: none;
  transition: all 0.15s ease;
}

.create-blog-page__title-input {
  min-height: 68px;
  padding: 0 16px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.create-blog-page__control {
  min-height: 48px;
  padding: 0 13px;
  font-size: 14px;
  font-weight: 650;
}

.create-blog-page__title-input:focus,
.create-blog-page__control:focus {
  border-color: rgba(0, 0, 255, 0.25);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06);
}

.create-blog-page__secondary,
.create-blog-page__primary {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.create-blog-page__secondary > *,
.create-blog-page__primary > * {
  pointer-events: none;
}

.create-blog-page__secondary:hover {
  border-color: rgba(0, 0, 255, 0.14);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.create-blog-page__meta-grid,
.create-blog-page__thumbnail-grid {
  display: grid;
  gap: 14px;
}

.create-blog-page__tags {
  display: flex;
  min-height: 34px;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.create-blog-page__tag {
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 800;
}

.create-blog-page__tag-help {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
}

.create-blog-page__upload,
.create-blog-page__preview {
  min-height: 170px;
  border-radius: 16px;
}

.create-blog-page__upload {
  position: relative;
  z-index: 2;
  display: flex;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  padding: 18px;
  pointer-events: auto;
  user-select: none;
  text-align: center;
  transition: all 0.15s ease;
}

.create-blog-page__upload:hover {
  border-color: rgba(0, 0, 255, 0.22);
  background: rgba(0, 0, 255, 0.04);
}

.create-blog-page__upload-icon {
  display: flex;
  height: 52px;
  width: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #ffffff;
  color: #0000ff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.create-blog-page__upload-title,
.create-blog-page__upload-help {
  display: block;
}

.create-blog-page__upload-title {
  margin-top: 12px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.create-blog-page__upload-help {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.create-blog-page__preview {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  text-align: left;
}

.create-blog-page__preview > * {
  pointer-events: none;
}

.create-blog-page__preview-bg,
.create-blog-page__preview-shade {
  position: absolute;
  inset: 0;
}

.create-blog-page__preview-shade {
  background: linear-gradient(180deg, transparent 15%, rgba(15, 23, 42, 0.62) 100%);
}

.create-blog-page__preview-copy {
  position: relative;
  display: flex;
  min-height: 170px;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  color: #ffffff;
}

.create-blog-page__preview-copy span,
.create-blog-page__preview-copy small {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 800;
}

.create-blog-page__preview-copy strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.15;
}

.create-blog-page__preview-copy small {
  margin-top: 8px;
  font-weight: 600;
}

.create-blog-page__submit {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.create-blog-page__submit-status {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  color: #64748b;
  padding: 12px 14px;
  transition: all 0.15s ease;
}

.create-blog-page__submit-status--draft {
  border-color: #bae6fd;
  background: #f0f9ff;
  color: #0284c7;
}

.create-blog-page__submit-status--published {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #16a34a;
}

.create-blog-page__submit-status--pending {
  border-color: #bae6fd;
  background: #f0f9ff;
  color: #0284c7;
}

.create-blog-page__submit-status--warning {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #ea580c;
}

.create-blog-page__submit-status--saving,
.create-blog-page__submit-status--publishing {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #4f46e5;
}

.create-blog-page__submit-status--error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.create-blog-page__submit-status p {
  margin: 0;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
}

.create-blog-page__submit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.create-blog-page__secondary {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  padding: 11px 15px;
}

.create-blog-page__primary {
  border: 1px solid #0000ff;
  background: #0000ff;
  color: #ffffff;
  padding: 11px 16px;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
}

.create-blog-page__primary:hover {
  transform: translateY(-1px);
}

.create-blog-page__secondary:disabled,
.create-blog-page__primary:disabled {
  cursor: wait;
  opacity: 0.7;
  transform: none;
}

@media (min-width: 768px) {
  .create-blog-page__intro,
  .create-blog-page__submit {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .create-blog-page__meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .create-blog-page__thumbnail-grid {
    grid-template-columns: 230px minmax(0, 1fr);
  }
}

@media (min-width: 1280px) {
  .create-blog-page__layout {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: start;
  }

  .create-blog-page__sidebar {
    position: sticky;
    top: 82px;
  }
}
</style>
