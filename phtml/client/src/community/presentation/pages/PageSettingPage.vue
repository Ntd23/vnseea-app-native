<!-- Description: Renders the page settings route with a settings-nav-first layout and ordered panes that mirror the legacy PHP page settings structure. -->
<template>
  <div v-if="page && previewPage" class="page-settings mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <section class="page-settings__hero border-b border-slate-100 pb-8 pt-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-settings__title text-2xl font-black text-slate-900">
            {{ $t("community.pageSettings.title") }}
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            {{ $t("community.pageSettings.desc") }}
          </p>
        </div>

        <NuxtLink :to="pagePath" class="page-settings__button page-settings__button--secondary">
          <Icon name="i-ph-arrow-square-out-bold" class="mr-2 h-4 w-4" />
          {{ $t("community.pageSettings.basics.viewPage") }}
        </NuxtLink>
      </div>

      <div class="page-settings__stepper-container mb-8 mt-5">
        <nav class="page-settings__nav-horizontal">
          <button v-for="item in settingsNavItems" :key="item.id" type="button"
            class="page-settings__nav-step-item"
            :class="{ 'page-settings__nav-step-item--active': activeTab === item.id }" @click="activeTab = item.id">
            <div class="page-settings__nav-step-circle"
              :class="{ 'page-settings__nav-step-circle--active': activeTab === item.id }">
              <Icon :name="item.icon" class="h-5 w-5" />
            </div>
            <div class="page-settings__nav-step-label-container">
              <span class="page-settings__nav-step-label">{{ item.label }}</span>
            </div>
          </button>
        </nav>
      </div>
    </section>



    <div class="page-settings__content-container">


      <div class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start">
      <div class="min-w-0 space-y-4">
          <div v-if="statusAlert" class="page-settings__alert mb-5"
            :class="`page-settings__alert--${statusAlert.color}`" aria-live="polite">
            <Icon :name="statusAlert.icon" class="h-5 w-5 mt-0.5" />
            <div>
              <p class="font-bold">{{ statusAlert.title }}</p>
              <span>{{ statusAlert.description }}</span>
            </div>
          </div>

          <section v-if="activeTab === 'basics'" id="basics">
            <CommunityPageSettingsBasicsCard v-model="draft" :page-path="pagePath">
              <template #trailing>
                <button
                  type="button"
                  :disabled="isSaveDisabled"
                  class="page-settings__button page-settings__button--primary !min-h-[36px] !py-2 !text-[13px]"
                  @click="handleSave"
                >
                  <Icon :name="isBusy ? 'i-ph-spinner-gap-bold' : 'i-ph-floppy-disk-bold'" class="mr-2 h-4 w-4" />
                  {{ $t("community.pageSettings.finish.save") }}
                </button>
              </template>
            </CommunityPageSettingsBasicsCard>
          </section>

          <section v-if="activeTab === 'media'" id="media">
            <CommunityPageSettingsMediaCard v-model="draft" :page-path="pagePath" :preview-page="previewPage">
              <template #trailing>
                <button
                  type="button"
                  :disabled="isBusy"
                  class="page-settings__button page-settings__button--primary !min-h-[36px] !py-2 !text-[13px]"
                  @click="handleSave"
                >
                  <Icon :name="isBusy ? 'i-ph-spinner-gap-bold' : 'i-ph-floppy-disk-bold'" class="mr-2 h-4 w-4" />
                  {{ $t("community.pageSettings.finish.save") }}
                </button>
              </template>
            </CommunityPageSettingsMediaCard>
          </section>

          <section v-if="activeTab === 'controls'" id="controls">
            <CommunityPageSettingsControlsCard v-model="draft">
              <template #trailing>
                <button
                  type="button"
                  :disabled="isBusy"
                  class="page-settings__button page-settings__button--primary !min-h-[36px] !py-2 !text-[13px]"
                  @click="handleSave"
                >
                  <Icon :name="isBusy ? 'i-ph-spinner-gap-bold' : 'i-ph-floppy-disk-bold'" class="mr-2 h-4 w-4" />
                  {{ $t("community.pageSettings.finish.save") }}
                </button>
              </template>
            </CommunityPageSettingsControlsCard>
          </section>
          <section v-if="activeTab === 'analytics'" id="analytics">
            <CommunityPageSettingsAnalyticCard />
          </section>

          <section v-if="activeTab === 'delete'" id="delete">
            <CommunityPageSettingsDeleteCard
              v-if="page"
              :page-id="page.id"
              :slug="page.slug"
              @delete="onDeletePage"
            />
          </section>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="mx-auto max-w-[960px] px-3 pb-10 pt-4 sm:px-5">
    <section
      class="rounded-[18px] border border-[#e2e8f0] bg-white px-6 py-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:px-8 sm:py-16">
      <FoundationEmptyState icon="i-ph-sliders-horizontal-fill" :title="$t('community.pageSettings.empty.title')"
        :description="$t('community.pageSettings.empty.desc')" />

      <div class="mt-6 flex justify-center">
        <NuxtLink to="/pages"
          class="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#0000ff] px-5 text-[14px] font-extrabold text-white shadow-[0_12px_24px_rgba(0,0,255,0.24)] transition hover:-translate-y-0.5 hover:bg-[#0000e0]">
          {{ $t("community.pageSettings.empty.back") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import CommunityPageSettingsBasicsCard from "../components/PageSettingsBasicsCard.vue"
import CommunityPageSettingsControlsCard from "../components/PageSettingsControlsCard.vue"
import CommunityPageSettingsMediaCard from "../components/PageSettingsMediaCard.vue"
import CommunityPageSettingsAnalyticCard from "../components/PageSettingsAnalyticCard.vue"
import CommunityPageSettingsDeleteCard from "../components/PageSettingsDeleteCard.vue"
import { useCommunityPageSettingPageVM } from "../../application/view-models/useCommunityPageSettingPageVM"

const {
  page,
  previewPage,
  draft,
  activeTab,
  settingsNavItems,
  statusAlert,
  isBusy,
  isSaveDisabled,
  pagePath,
  handleSave,
  handleDeletePage,
} = useCommunityPageSettingPageVM()

function onDeletePage(pageId: number, password: string) {
  handleDeletePage(pageId, password)
}
</script>

<style scoped>
.page-settings__hero,
.page-settings__nav-card {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.page-settings__hero {
  padding: 20px;
}

.page-settings__avatar {
  display: flex;
  height: 80px;
  width: 80px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
}

.page-settings__eyebrow,
.settings-section-card__eyebrow {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.settings-section-card__title {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.settings-section-card__desc {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 13.5px;
  line-height: 1.5;
}

.page-settings__title {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.page-settings__desc {
  margin: 0;
  max-width: 760px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

.page-settings__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.page-settings__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 6px 12px;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.settings-section-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.page-settings__stepper-container {
  position: relative;
  z-index: 10;
}

.page-settings__nav-horizontal {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 10px;
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}


.page-settings__nav-step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.page-settings__nav-step-circle {
  display: flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 800;
  border: 2px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-settings__nav-step-circle--active {
  background: #0000ff;
  color: #ffffff;
  border-color: #0000ff;
  box-shadow: 0 4px 12px rgba(0, 0, 255, 0.2);
}

.page-settings__nav-step-label-container {
  min-width: 0;
  text-align: left;
}

.page-settings__nav-step-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  transition: color 0.2s ease;
}

.page-settings__nav-step-desc {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-settings__nav-step-item--active {
  border-color: rgba(0, 0, 255, 0.16);
  background: rgba(0, 0, 255, 0.05);
}

.page-settings__nav-step-item--active .page-settings__nav-step-label {
  color: #0000ff;
  font-weight: 800;
}

.page-settings__nav-step-item--active .page-settings__nav-step-desc {
  color: #334155;
}

.page-settings__nav-step-item:hover {
  border-color: rgba(0, 0, 255, 0.12);
  background: rgba(0, 0, 255, 0.03);
}

.page-settings__nav-step-item:hover .page-settings__nav-step-circle:not(.page-settings__nav-step-circle--active) {
  border-color: rgba(0, 0, 255, 0.12);
  color: #0000ff;
}

@media (min-width: 768px) {
  .page-settings__nav-horizontal {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0;
  }

  .page-settings__nav-step-item {
    flex: 0 1 auto;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: auto;
    min-width: 100px;
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 0;
    text-align: center;
  }

  .page-settings__nav-step-item--active {
    background: transparent;
  }

  .page-settings__nav-step-circle {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    border-radius: 50%;
    background: #ffffff;
  }

  .page-settings__nav-step-circle--active {
    background: #ffffff;
    color: #0000ff;
    border-color: rgba(0, 0, 255, 0.18);
    box-shadow: 0 4px 12px rgba(0, 0, 255, 0.14);
  }

  .page-settings__nav-step-label-container {
    text-align: center;
  }

  .page-settings__nav-step-desc {
    display: none;
  }

  .page-settings__nav-step-item--active .page-settings__nav-step-label {
    color: #0f172a;
    text-decoration: underline;
    text-underline-offset: 6px;
    text-decoration-thickness: 2px;
    text-decoration-color: #2563eb;
  }

  .page-settings__nav-step-item:hover {
    background: transparent;
    border-color: transparent;
  }

  .page-settings__nav-step-item:hover .page-settings__nav-step-circle:not(.page-settings__nav-step-circle--active) {
    border-color: rgba(0, 0, 255, 0.18);
    color: #0000ff;
    background: rgba(0, 0, 255, 0.04);
  }
}

.page-preview-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-preview-banner {
  background-size: cover !important;
  background-position: center !important;
}

.page-preview-avatar-wrap {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}


.page-settings__finish-note {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  padding: 13px 16px;
  font-size: 13px;
  line-height: 1.6;
}

.page-settings__alert {
  display: flex;
  gap: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 14px 16px;
}

.page-settings__alert p {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
}

.page-settings__alert span {
  display: block;
  margin-top: 3px;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.page-settings__alert--success {
  border-color: #bae6fd;
  background: #f0f9ff;
  color: #0284c7;
}

.page-settings__alert--error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.page-settings__button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}

.page-settings__button:not(:disabled):hover {
  transform: translateY(-1px);
}

.page-settings__button--secondary {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.page-settings__button--secondary:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.page-settings__button--primary {
  border: 1px solid #2563eb;
  background: #0000ff;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(0, 0, 255, 0.18);
}

.page-settings__button--primary:hover {
  background: #0000d8;
}

.page-settings__button:disabled,
.page-settings__button[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.55;
}

.page-settings__admins {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-settings__admin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  padding: 14px 16px;
}

.page-settings__admin-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.page-settings__admin-avatar {
  display: flex;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 900;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.page-settings__admin-avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-settings__admin-copy {
  min-width: 0;
}

.page-settings__admin-name {
  overflow: hidden;
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-settings__admin-role {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.page-settings__admin-menu {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.page-settings__admin-menu:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.page-settings__admins-placeholder {
  display: none;
}

.page-settings-sidebar :deep(progress),
.page-settings-sidebar :deep([role="progressbar"]) {
  background-color: #dbeafe;
}
</style>
