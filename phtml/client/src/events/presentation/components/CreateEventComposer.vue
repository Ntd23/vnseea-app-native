<!-- Description: Renders the backend-backed create-event form in the same field order and rhythm as the PHP event composer. -->
<template>
  <section class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
    <div class="border-b border-[var(--border-default)] px-5 py-4">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface-active)] text-[var(--text-brand)]">
          <Icon name="i-ph-calendar-plus-fill" class="h-5 w-5" />
        </span>
        <div>
          <p class="text-label-secondary">{{ $t("pages.eventsPage.createEvent") }}</p>
          <h1 class="text-heading text-[var(--text-primary)]">
            {{ $t("pages.eventsPage.createEvent") }}
          </h1>
        </div>
      </div>
    </div>

    <UForm :state="form" :validate="validate" class="space-y-5 p-5" @submit="submit">
      <UAlert
        v-if="submitError"
        color="error"
        variant="subtle"
        icon="i-ph-warning-circle-fill"
        :description="submitError"
        class="rounded-[16px]"
      />

      <UFormField name="name" :label="$t('pages.createEventPage.eventName')" required>
        <UInput
          v-model="form.name"
          :placeholder="$t('pages.createEventPage.eventNamePlaceholder')"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <UFormField name="location" :label="$t('pages.createEventPage.locationLabel')" required>
        <UInput
          v-model="form.location"
          :placeholder="$t('pages.createEventPage.locationPlaceholder')"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField name="startDate" :label="$t('pages.createEventPage.startDate')" required>
          <UInput v-model="form.startDate" type="date" size="xl" class="w-full" />
        </UFormField>
        <UFormField name="startTime" :label="$t('pages.createEventPage.startTime')" required>
          <UInput v-model="form.startTime" type="time" size="xl" class="w-full" />
        </UFormField>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField name="endDate" :label="$t('pages.createEventPage.endDate')" required>
          <UInput v-model="form.endDate" type="date" size="xl" class="w-full" />
        </UFormField>
        <UFormField name="endTime" :label="$t('pages.createEventPage.endTime')" required>
          <UInput v-model="form.endTime" type="time" size="xl" class="w-full" />
        </UFormField>
      </div>

      <UFormField name="description" :label="$t('pages.createEventPage.descriptionLabel')" required>
        <UTextarea
          v-model="form.description"
          :rows="6"
          autoresize
          :placeholder="$t('pages.createEventPage.descriptionPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <div class="space-y-3">
        <p class="text-title-primary">{{ $t("pages.createEventPage.coverImage") }}</p>
        <label
          for="event-cover"
          class="block cursor-pointer overflow-hidden rounded-[18px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-hover)]"
        >
          <input id="event-cover" class="sr-only" type="file" accept="image/*" @change="onCoverChange">

          <div v-if="coverPreviewUrl" class="h-[220px] bg-[var(--bg-muted)] sm:h-[260px]">
            <img :src="coverPreviewUrl" :alt="$t('pages.createEventPage.coverPreviewAlt')" class="h-full w-full object-cover">
          </div>
          <div v-else class="flex h-[220px] items-center justify-center sm:h-[260px]">
            <div class="text-center">
              <Icon name="i-ph-image-square-fill" class="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
              <p class="mt-3 text-body-secondary">{{ $t("pages.createEventPage.chooseCover") }}</p>
            </div>
          </div>
        </label>
      </div>

      <div class="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)] p-4">
        <p class="text-label-secondary">{{ $t("pages.createEventPage.previewLabel") }}</p>
        <h2 class="mt-2 text-heading text-[var(--text-primary)]">
          {{ form.name || $t("pages.createEventPage.eventTitleFallback") }}
        </h2>
        <p class="mt-2 text-body-secondary">{{ dateRangeLabel || $t("pages.createEventPage.dateSummaryFallback") }}</p>
        <p class="mt-2 text-body-secondary">{{ form.location || $t("pages.createEventPage.locationFallback") }}</p>
      </div>

      <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <UButton :to="appRoutes.events" color="neutral" variant="ghost" size="lg" class="justify-center rounded-full">
          <Icon name="i-ph-arrow-left" class="mr-2 h-4 w-4" />
          {{ $t("pages.createEventPage.backToEvents") }}
        </UButton>

        <UButton type="submit" color="primary" size="lg" class="justify-center rounded-full px-7" :loading="submitting">
          {{ $t("pages.createEventPage.publish") }}
        </UButton>
      </div>
    </UForm>
  </section>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useCreateEventPageVM } from "../../application/view-models/useCreateEventPageVM"

const {
  form,
  coverPreviewUrl,
  dateRangeLabel,
  submitting,
  submitError,
  validate,
  onCoverChange,
  submit,
} = useCreateEventPageVM()
</script>
