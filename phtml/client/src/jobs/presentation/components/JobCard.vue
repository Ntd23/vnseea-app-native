<!-- English description: Displays a backend-backed job card using the same cover-overlay rhythm as the pages directory cards. -->
<template>
  <article class="job-card">
    <div class="job-card__cover">
      <NuxtImg
        v-if="job.imageUrl"
        :src="job.imageUrl"
        :alt="job.title"
        class="job-card__image"
        width="640"
        height="400"
      />
      <div v-else class="job-card__fallback">
        <Icon name="i-ph-briefcase-fill" class="h-10 w-10" />
      </div>

      <span class="job-card__category">{{ job.categoryLabel }}</span>

      <div class="job-card__identity">
        <div class="job-card__avatar">
          <NuxtImg
            v-if="job.owner?.avatarUrl"
            :src="job.owner.avatarUrl"
            :alt="job.owner.name"
            class="job-card__avatar-img"
            width="72"
            height="72"
          />
          <Icon v-else name="i-ph-briefcase-fill" class="h-7 w-7" />
        </div>

        <div class="min-w-0">
          <h3 class="job-card__title">
            {{ job.title }}
          </h3>
          <p v-if="job.owner?.name" class="job-card__owner">
            {{ job.owner.name }}
          </p>
        </div>
      </div>

      <div class="job-card__chips">
        <span class="job-card__chip">
          <Icon name="i-ph-clock-duotone" class="h-4 w-4" />
          {{ job.typeLabel }}
        </span>
        <span class="job-card__chip">
          <Icon name="i-ph-users-three-duotone" class="h-4 w-4" />
          {{ $t("pages.jobsPage.applicantCount", { count: job.applyCount }) }}
        </span>
      </div>
    </div>

    <div class="job-card__content">
      <p class="job-card__description">
        {{ job.description }}
      </p>

      <div class="job-card__meta">
        <span class="job-card__meta-item">
          <Icon name="i-ph-map-pin-duotone" class="h-4 w-4" />
          {{ job.location }}
        </span>
        <span class="job-card__meta-item">
          <Icon name="i-ph-wallet-duotone" class="h-4 w-4" />
          {{ job.salaryLabel || $t("pages.jobsPage.salaryUnknown") }}
        </span>
      </div>

      <div class="job-card__actions">
        <button
          v-if="job.canApply"
          type="button"
          class="job-card__apply"
          @click="emit('apply', job)"
        >
          {{ $t("pages.jobsPage.apply") }}
        </button>

        <span v-else-if="job.alreadyApplied" class="job-card__applied">
          {{ $t("pages.jobsPage.alreadyApplied") }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { JobRecord } from "../../domain/types/jobs.types"

defineProps<{
  job: JobRecord
}>()

const emit = defineEmits<{
  apply: [job: JobRecord]
}>()
</script>

<style scoped>
.job-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.job-card:hover {
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.job-card__cover {
  position: relative;
  height: 230px;
  overflow: hidden;
  background: var(--bg-muted);
}

.job-card__cover::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: "";
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.68) 100%);
}

.job-card__image,
.job-card__fallback {
  width: 100%;
  height: 100%;
}

.job-card__image {
  display: block;
  object-fit: cover;
}

.job-card__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-secondary);
}

.job-card__category,
.job-card__chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.34);
  color: #ffffff;
  backdrop-filter: blur(8px);
}

.job-card__category {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.job-card__identity {
  position: absolute;
  right: 12px;
  bottom: 54px;
  left: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
}

.job-card__avatar {
  display: inline-flex;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 16px;
  background: var(--bg-surface-active);
  color: var(--text-brand);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
}

.job-card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.job-card__title {
  overflow: hidden;
  color: #ffffff;
  font-size: 18px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.job-card__owner {
  margin: 3px 0 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-card__chips {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.job-card__chip {
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 800;
}

.job-card__content {
  padding: 16px;
}

.job-card__description {
  display: -webkit-box;
  min-height: 42px;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.55;
}

.job-card__meta {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}

.job-card__meta-item {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 700;
}

.job-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.job-card__apply,
.job-card__applied {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
}

.job-card__apply {
  border: 0;
  background: var(--bg-brand);
  color: var(--text-inverse);
  cursor: pointer;
  box-shadow: var(--shadow-brand);
}

.job-card__applied {
  background: var(--bg-surface-active);
  color: var(--text-brand);
}
</style>
