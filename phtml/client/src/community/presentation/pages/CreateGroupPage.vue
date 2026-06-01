<!-- Description: Renders the create-group route with a simple heading-first shell and the existing ordered form fields, aligned to the legacy PHP group creation flow. -->
<template>
  <div class="mx-auto max-w-[1280px] space-y-5 pb-20">
    <section class="rounded-[32px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-10 shadow-[var(--shadow-md)] sm:px-12 sm:py-14">
      <div class="max-w-3xl space-y-4">
        <h1 class="text-heading text-[2rem] text-[var(--text-primary)] sm:text-[2.75rem]">
          {{ $t('community.creation.group.title') }}
        </h1>
        <p class="text-[16px] font-medium leading-relaxed text-[var(--text-secondary)]">
          {{ $t('community.creation.group.description') }}
        </p>
      </div>
    </section>

    <CommunityCreationForm
      v-model="draft"
      entity-label="community.creation.common.entityLabelGroup"
      :privacy-options="communityPrivacyOptions"
      :category-options="communityCategoryOptions"
      :name-label="$t('community.creation.group.nameLabel')"
      :name-placeholder="$t('community.creation.group.namePlaceholder')"
      :url-label="$t('community.creation.common.urlLabel')"
      :slug-placeholder="$t('community.creation.group.slugPlaceholder')"
      :description-label="$t('community.creation.common.descriptionLabel')"
      :description-placeholder="$t('community.creation.group.description')"
      :privacy-label="$t('community.creation.group.privacyLabel')"
      :category-label="$t('community.creation.common.categoryLabel')"
      :back-to="appRoutes.groups"
      :submit-label="$t('community.creation.common.create')"
      :submit-state="submitState"
      :submit-disabled="isSubmitDisabled"
      @submit="handleCreateGroup"
    />
  </div>
</template>

<script setup lang="ts">
import CommunityCreationForm from "../components/CreationForm.vue"
import { useCommunityCreateGroupPageVM } from "../../application/view-models/useCommunityCreateGroupPageVM"
import {
  communityCategoryOptions,
  communityPrivacyOptions,
} from "../../domain/constants/community-options"

const { draft, submitState, isSubmitDisabled, handleCreateGroup, appRoutes } = useCommunityCreateGroupPageVM()
</script>
