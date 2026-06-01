<template>
  <aside class="space-y-4">
    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <div class="flex items-start gap-4">
        <div
          class="avatar-lg shrink-0 text-white shadow-[var(--shadow-md)]"
          :style="{ background: job.companyGradient }"
        >
          {{ job.companyInitials }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="primary" variant="subtle" class="rounded-full px-3 py-1 text-[11px] font-bold">
              {{ job.categoryLabel }}
            </UBadge>

            <UBadge
              v-if="job.isFeatured"
              color="warning"
              variant="subtle"
              class="rounded-full px-3 py-1 text-[11px] font-bold"
            >
              {{ $t("pages.jobsPage.featuredBadge") }}
            </UBadge>

            <UBadge
              v-if="job.isOwner"
              color="neutral"
              variant="subtle"
              class="rounded-full px-3 py-1 text-[11px] font-bold"
            >
              {{ $t("pages.jobsPage.myBadge") }}
            </UBadge>

            <UBadge
              v-if="job.isRemote"
              color="info"
              variant="subtle"
              class="rounded-full px-3 py-1 text-[11px] font-bold"
            >
              {{ $t("pages.jobsPage.remoteBadge") }}
            </UBadge>
          </div>

          <p class="mt-4 text-label-secondary text-[var(--text-primary)]">
            {{ $t("pages.jobsPage.detailEyebrow") }}
          </p>
          <h2 class="mt-1 text-heading text-[var(--text-primary)]">
            {{ job.title }}
          </h2>
          <p class="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
            {{ job.company }} · {{ job.typeLabel }}
          </p>
        </div>
      </div>

      <UAlert
        class="mt-5 rounded-[24px]"
        color="primary"
        variant="subtle"
        icon="i-ph-briefcase-fill"
        :title="$t('pages.jobsPage.detailStatusTitle')"
        :description="$t('pages.jobsPage.detailStatusDescription', { applicants: job.applicants, views: job.views, deadline: job.deadline })"
      />

      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <div class="rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ $t("pages.jobsPage.jobLocationLabel") }}
          </p>
          <p class="mt-1 text-[13px] font-extrabold text-[var(--text-primary)]">
            {{ job.location }}
          </p>
        </div>

        <div class="rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ $t("pages.jobsPage.jobSalaryLabel") }}
          </p>
          <p class="mt-1 text-[13px] font-extrabold text-[var(--text-primary)]">
            {{ job.salary }}
          </p>
        </div>

        <div class="rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ $t("pages.jobsPage.jobExperienceLabel") }}
          </p>
          <p class="mt-1 text-[13px] font-extrabold text-[var(--text-primary)]">
            {{ job.experience }}
          </p>
        </div>

        <div class="rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {{ $t("pages.jobsPage.jobPostedLabel") }}
          </p>
          <p class="mt-1 text-[13px] font-extrabold text-[var(--text-primary)]">
            {{ job.postedAt }}
          </p>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <UBadge
          v-for="skill in job.skills"
          :key="skill"
          color="neutral"
          variant="soft"
          class="rounded-full px-3 py-1 text-[11px] font-semibold"
        >
          #{{ skill }}
        </UBadge>
      </div>

      <p class="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
        {{ job.description }}
      </p>

      <div class="mt-6 grid gap-2 sm:grid-cols-2">
        <UButton
          type="button"
          color="primary"
          size="lg"
          class="justify-center rounded-full"
          @click="emit('apply', job)"
        >
          <Icon name="i-ph-paper-plane-tilt-fill" class="mr-1.5 h-4 w-4" />
          {{ $t("pages.jobsPage.applyThisJob") }}
        </UButton>

        <UButton
          type="button"
          :color="saved ? 'primary' : 'neutral'"
          :variant="saved ? 'solid' : 'outline'"
          size="lg"
          class="justify-center rounded-full"
          :aria-pressed="saved"
          @click="emit('toggleSave', job.id)"
        >
          <Icon :name="saved ? 'i-ph-bookmark-simple-fill' : 'i-ph-bookmark-simple'" class="mr-1.5 h-4 w-4" />
          {{ saved ? $t("pages.jobsPage.saved") : $t("pages.jobsPage.save") }}
        </UButton>
      </div>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ $t("pages.jobsPage.requirements") }}
      </p>
      <ul class="mt-4 space-y-3">
        <li
          v-for="item in job.requirements"
          :key="item"
          class="flex gap-3 rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
        >
          <Icon name="i-ph-check-circle-fill" class="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </UCard>

    <UCard class="rounded-[30px] border border-[var(--border-default)] bg-white shadow-[var(--shadow-md)]" :ui="{ body: 'p-5' }">
      <p class="text-label-secondary text-[var(--text-primary)]">
        {{ $t("pages.jobsPage.benefits") }}
      </p>
      <ul class="mt-4 space-y-3">
        <li
          v-for="item in job.benefits"
          :key="item"
          class="flex gap-3 rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
        >
          <Icon name="i-ph-gift-fill" class="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-500)]" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </UCard>
  </aside>
</template>

<script setup lang="ts">
import type { MockJob } from "../../application/composables/useMockJobsData"

defineProps<{
  job: MockJob
  saved: boolean
}>()

const emit = defineEmits<{
  apply: [job: MockJob]
  toggleSave: [id: string]
}>()
</script>
