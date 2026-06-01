<!-- English description: Backend-backed funding creation page with a structured campaign form and cover preview. -->
<template>
  <main class="create-funding">
    <section class="create-funding__header">
      <div>
        <p>{{ t("pages.createFundingPage.heroEyebrow") }}</p>
        <h1>{{ isEditMode ? t("pages.createFundingPage.editHeroTitle") : t("pages.createFundingPage.heroTitle") }}</h1>
        <span>{{ isEditMode ? t("pages.createFundingPage.editHeroDescription") : t("pages.createFundingPage.heroDescription") }}</span>
      </div>
    </section>

    <USkeleton v-if="loadingCampaign" class="create-funding__skeleton" />

    <form v-else class="create-funding__layout" @submit.prevent="submit">
      <section class="create-funding__panel">
        <div class="create-funding__section-title">
          <Icon name="i-ph-list-checks-duotone" class="h-5 w-5" />
          <div>
            <p>{{ t("pages.createFundingPage.formEyebrow") }}</p>
            <h2>{{ t("pages.createFundingPage.formTitle") }}</h2>
          </div>
        </div>

        <div class="create-funding__fields">
          <UFormField :label="t('pages.createFundingPage.formTitleLabel')" name="title" required>
            <UInput
              v-model="draft.title"
              class="w-full"
              :placeholder="t('pages.createFundingPage.formTitlePlaceholder')"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField :label="t('pages.createFundingPage.goalLabel')" name="amount" required>
            <UInput
              v-model.number="draft.amount"
              type="number"
              min="1"
              class="w-full"
              :placeholder="t('pages.createFundingPage.goalPlaceholder')"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField :label="t('pages.createFundingPage.descriptionLabel')" name="description" required>
            <UTextarea
              v-model="draft.description"
              :rows="9"
              class="w-full"
              :placeholder="t('pages.createFundingPage.descriptionPlaceholder')"
              :disabled="submitting"
            />
          </UFormField>
        </div>
      </section>

      <aside class="create-funding__side">
        <section class="create-funding__panel">
          <div class="create-funding__section-title">
            <Icon name="i-ph-image-square-duotone" class="h-5 w-5" />
            <div>
              <p>{{ t("pages.createFundingPage.coverEyebrow") }}</p>
              <h2>{{ t("pages.createFundingPage.coverTitle") }}</h2>
            </div>
          </div>

          <label class="create-funding__upload">
            <input type="file" accept="image/*" :disabled="submitting" @change="onFileChange">
            <span v-if="previewUrl" class="create-funding__preview">
              <img :src="previewUrl" :alt="draft.title || t('pages.createFundingPage.imageLabel')">
            </span>
            <span v-else class="create-funding__empty-preview">
              <Icon name="i-ph-upload-simple-duotone" class="h-8 w-8" />
              <strong>{{ t("pages.createFundingPage.selectCover") }}</strong>
              <small>{{ t("pages.createFundingPage.imageHelper") }}</small>
            </span>
          </label>

          <p v-if="imageFile" class="create-funding__file-name">{{ imageFile.name }}</p>
        </section>

        <section class="create-funding__tips">
          <h2>{{ t("pages.createFundingPage.prepTitle") }}</h2>
          <ul>
            <li>{{ t("pages.createFundingPage.prepItem1") }}</li>
            <li>{{ t("pages.createFundingPage.prepItem2") }}</li>
            <li>{{ t("pages.createFundingPage.prepItem3") }}</li>
          </ul>
        </section>

        <div class="create-funding__actions">
          <NuxtLink to="/funding" class="create-funding__button">
            {{ t("pages.createFundingPage.backButton") }}
          </NuxtLink>
          <button type="submit" class="create-funding__button create-funding__button--primary" :disabled="submitting">
            <Icon name="i-ph-paper-plane-tilt-duotone" class="h-4 w-4" />
            {{ isEditMode ? t("pages.createFundingPage.saveEditButton") : t("pages.createFundingPage.submitButton") }}
          </button>
        </div>
      </aside>
    </form>
  </main>
</template>

<script setup lang="ts">
import { useCreateFundingPageVM } from "../../application/view-models/useCreateFundingPageVM"

const props = withDefaults(defineProps<{
  mode?: "create" | "edit"
  campaignId?: string
}>(), {
  mode: "create",
  campaignId: "",
})

const { t } = useI18n()
const {
  draft,
  imageFile,
  previewUrl,
  submitting,
  loadingCampaign,
  isEditMode,
  onFileChange,
  submit,
} = useCreateFundingPageVM({
  mode: computed(() => props.mode),
  campaignId: computed(() => props.campaignId),
})
</script>

<style scoped>
.create-funding {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 18px 12px 42px;
}

.create-funding__header,
.create-funding__panel,
.create-funding__tips {
  border: 1px solid rgba(0, 0, 255, 0.06);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.create-funding__header {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.create-funding__skeleton {
  height: 520px;
  margin-top: 14px;
  border-radius: 16px;
}

.create-funding__header p,
.create-funding__section-title p {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.create-funding__header h1 {
  max-width: 820px;
  margin-top: 5px;
  color: #0f172a;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.16;
}

.create-funding__header span {
  display: block;
  max-width: 760px;
  margin-top: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.55;
}

.create-funding__back,
.create-funding__button {
  display: inline-flex;
  width: fit-content;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  padding: 9px 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.create-funding__layout {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.create-funding__panel {
  padding: 16px;
}

.create-funding__section-title {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #0000ff;
}

.create-funding__section-title h2,
.create-funding__tips h2 {
  color: #0f172a;
  font-size: 17px;
  font-weight: 900;
}

.create-funding__fields {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.create-funding__side {
  display: grid;
  gap: 14px;
  align-content: start;
}

.create-funding__upload {
  display: block;
  margin-top: 16px;
  cursor: pointer;
}

.create-funding__upload input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.create-funding__preview,
.create-funding__empty-preview {
  display: flex;
  min-height: 230px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: #f8fafc;
}

.create-funding__preview img {
  width: 100%;
  height: 100%;
  min-height: 230px;
  object-fit: cover;
}

.create-funding__empty-preview {
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  color: #64748b;
  text-align: center;
}

.create-funding__empty-preview strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 900;
}

.create-funding__empty-preview small,
.create-funding__file-name,
.create-funding__tips li {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.create-funding__file-name {
  margin-top: 10px;
}

.create-funding__tips {
  padding: 16px;
}

.create-funding__tips ul {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding-left: 18px;
}

.create-funding__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.create-funding__button--primary {
  border-color: #0000ff;
  background: #0000ff;
  color: #ffffff;
}

.create-funding__button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (min-width: 860px) {
  .create-funding {
    padding: 22px 20px 48px;
  }

  .create-funding__layout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}
</style>
