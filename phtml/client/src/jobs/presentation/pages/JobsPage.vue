<!-- English description: Renders the backend-backed jobs directory in a compact list-first layout aligned with the legacy PHP jobs page. -->
<template>
  <div class="mx-auto max-w-[1120px] space-y-4 px-3 pb-10 sm:px-5 lg:px-6">
    <JobsFilters
      v-model:search="vm.searchQuery.value"
      v-model:selected-type="vm.selectedType.value"
      v-model:selected-category="vm.selectedCategory.value"
      v-model:selected-distance="vm.selectedDistance.value"
      :types="vm.types.value"
      :categories="vm.categories.value"
      :distance-options="vm.distanceOptions.value"
      :distance-enabled="vm.distanceEnabled.value"
      :can-create="vm.canCreate.value"
      :create-disabled-reason="vm.createDisabledReason.value"
      :has-active-filters="vm.hasActiveFilters.value"
      @open-create="vm.openCreate"
      @reset="vm.resetFilters"
    />

    <UAlert
      v-if="vm.errorMessage.value"
      color="error"
      variant="subtle"
      class="rounded-[24px]"
      :title="vm.errorMessage.value"
    />

    <div v-if="vm.loading.value" class="grid gap-4 lg:grid-cols-2">
      <div v-for="index in 4" :key="index" class="jobs-skeleton-card">
        <div class="jobs-skeleton-cover">
          <USkeleton class="jobs-skeleton-bg" />

          <div class="jobs-skeleton-overlay-top-left">
            <USkeleton class="h-[28px] w-[160px] rounded-full bg-white/20" />
          </div>

          <div class="jobs-skeleton-overlay-info">
            <USkeleton class="jobs-skeleton-avatar bg-white/20" />
            <div class="jobs-skeleton-info-text">
              <USkeleton class="h-[20px] w-[70%] rounded-full bg-white/20" />
              <USkeleton class="h-[14px] w-[42%] rounded-full bg-white/20" />
            </div>
          </div>

          <div class="jobs-skeleton-overlay-stats">
            <USkeleton class="h-[31px] w-[120px] rounded-full bg-white/20" />
            <USkeleton class="h-[31px] w-[140px] rounded-full bg-white/20" />
          </div>
        </div>

        <div class="jobs-skeleton-body">
          <USkeleton class="h-[16px] w-full rounded-full" />
          <USkeleton class="h-[16px] w-[78%] rounded-full" />
          <div class="jobs-skeleton-line"></div>
          <USkeleton class="h-[14px] w-[65%] rounded-full" />
          <USkeleton class="h-[14px] w-[54%] rounded-full" />
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="vm.items.value.length > 0" class="grid gap-4 lg:grid-cols-2">
        <JobCard
          v-for="job in vm.items.value"
          :key="job.id"
          :job="job"
          @apply="vm.openApply"
        />
      </div>

      <JobsEmptyState v-else @reset="vm.resetFilters" />

      <div v-if="vm.hasMore.value" class="flex justify-center pt-2">
        <UButton
          color="neutral"
          variant="outline"
          class="rounded-full px-6"
          :loading="vm.loadingMore.value"
          @click="vm.loadMore"
        >
          {{ $t("navigation.leftSidebar.showMore") }}
        </UButton>
      </div>
    </template>

    <JobApplyModal
      :open="Boolean(vm.applyModalJob.value)"
      :job="vm.applyModalJob.value"
      :defaults="vm.currentUser.value"
      :submitting="vm.applySubmitting.value"
      :error-message="vm.applyErrorMessage.value"
      @close="vm.closeApply"
      @submit="vm.submitApplication"
    />

    <JobPostModal
      :open="vm.createModalOpen.value"
      :categories="vm.categories.value"
      :types="vm.types.value"
      :currencies="vm.currencies.value"
      :salary-dates="vm.salaryDates.value"
      :question-types="vm.questionTypes.value"
      :image-types="vm.imageTypes.value"
      :owned-pages="vm.ownedPages.value"
      :defaults="vm.currentUser.value"
      :can-create="vm.canCreate.value"
      :create-disabled-reason="vm.createDisabledReason.value"
      :submitting="vm.createSubmitting.value"
      :error-message="vm.createErrorMessage.value"
      @close="vm.closeCreate"
      @submit="vm.submitCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { useJobsPageVM } from "../../application/view-models/useJobsPageVM"
import JobApplyModal from "../components/JobApplyModal.vue"
import JobCard from "../components/JobCard.vue"
import JobPostModal from "../components/JobPostModal.vue"
import JobsEmptyState from "../components/JobsEmptyState.vue"
import JobsFilters from "../components/JobsFilters.vue"

const vm = useJobsPageVM()
</script>

<style scoped>
.jobs-skeleton-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.jobs-skeleton-cover {
  position: relative;
  height: 230px;
  width: 100%;
  overflow: hidden;
}

.jobs-skeleton-bg {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.jobs-skeleton-cover::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.62) 100%);
  z-index: 1;
}

.jobs-skeleton-avatar {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  flex-shrink: 0;
}

.jobs-skeleton-overlay-top-left {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 2;
}

.jobs-skeleton-overlay-info {
  position: absolute;
  bottom: 54px;
  left: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
}

.jobs-skeleton-info-text {
  flex: 1;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.jobs-skeleton-overlay-stats {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.jobs-skeleton-body {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.jobs-skeleton-line {
  height: 1px;
  margin: 4px 0;
  background: #eef2f7;
}
</style>
