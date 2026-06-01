<!-- Description: Renders the create-page route with a heading-first shell and the existing ordered form fields, aligned to the legacy PHP page creation flow. -->
<template>
  <div class="mx-auto max-w-[1280px] space-y-5 px-4 pb-24 sm:px-6">
    <section class="rounded-[26px] border border-[#dbe3f2] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(15,35,110,0.06)] sm:px-6">
      <div class="space-y-3">
        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {{ $t('community.creation.page.eyebrow') }}
        </p>
        <h1 class="text-[1.7rem] font-black tracking-[-0.04em] text-[#243b63] sm:text-[2rem]">
          {{ $t('community.creation.page.title') }}
        </h1>
        <p class="max-w-3xl text-[14px] leading-7 text-slate-500">
          {{ $t('community.creation.page.description') }}
        </p>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="item in highlights"
          :key="item"
          class="inline-flex items-center rounded-full bg-[#f6f8ff] px-3 py-1.5 text-[12px] font-semibold text-[#243b63]"
        >
          {{ item }}
        </span>
      </div>
    </section>

    <CommunityCreationForm
      v-model="draft"
      entity-label="community.creation.common.entityLabelPage"
      :category-options="communityPageCategoryOptions"
      :show-privacy="false"
      show-location
      :url-prefix="communityPageUrlPrefix"
      :name-label="$t('community.creation.page.nameLabel')"
      :name-placeholder="$t('community.creation.page.namePlaceholder')"
      :url-label="$t('community.creation.common.urlLabel')"
      :slug-placeholder="$t('community.creation.page.slugPlaceholder')"
      :description-label="$t('community.creation.common.descriptionLabel')"
      :description-placeholder="$t('community.creation.common.introHint', { entity: $t('community.creation.common.entityLabelPage') })"
      :category-label="$t('community.creation.page.categoryLabel')"
      :location-label="$t('community.creation.page.locationLabel')"
      :location-placeholder="$t('community.creation.page.locationPlaceholder')"
      :location-hint="$t('community.creation.page.locationHint')"
      :back-label="$t('community.creation.common.back')"
      :back-to="appRoutes.pages"
      :submit-label="$t('community.creation.page.submitLabel')"
      :identity-section-label="$t('community.creation.page.identitySectionLabel')"
      :identity-section-title="$t('community.creation.page.identitySectionTitle')"
      :identity-section-badge="$t('community.creation.page.identitySectionBadge')"
      :identity-hint="$t('community.creation.page.identityHint')"
      :description-section-label="$t('community.creation.page.descriptionSectionLabel')"
      :description-section-title="$t('community.creation.page.descriptionSectionTitle')"
      :description-hint="$t('community.creation.page.descriptionHint')"
      :configuration-section-label="$t('community.creation.page.configurationSectionLabel')"
      :configuration-section-title="$t('community.creation.page.configurationSectionTitle')"
      :action-description="$t('community.creation.page.actionDescription')"
      preview-icon="i-ph-storefront-fill"
      :next-steps="nextSteps"
      :submit-state="submitState"
      :submit-disabled="isSubmitDisabled"
      :draft-restored="draftRestored"
      @submit="handleCreatePage"
    />
  </div>
</template>

<script setup lang="ts">
import CommunityCreationForm from "../components/CreationForm.vue"
import { useCommunityCreatePagePageVM } from "../../application/view-models/useCommunityCreatePagePageVM"
import {
  communityPageCategoryOptions,
  communityPageUrlPrefix,
} from "../../domain/constants/community-options"

const {
  draft,
  submitState,
  draftRestored,
  highlights,
  nextSteps,
  isSubmitDisabled,
  handleCreatePage,
  appRoutes,
} = useCommunityCreatePagePageVM()
</script>
