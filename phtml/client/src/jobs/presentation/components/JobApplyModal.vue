<!-- English description: Captures the real PHP-parity job application fields and dynamic questions for a selected backend job. -->
<template>
  <FoundationModalShell
    :open="modalOpen"
    :title="modalTitle"
    size="xl"
    body-class="space-y-5"
    @close="emit('close')"
  >
    <div v-if="job" class="space-y-5">
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        class="rounded-[20px]"
        :title="errorMessage"
      />

      <UCard class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-hover)]" :ui="{ body: 'p-4' }">
        <div class="flex items-start gap-4">
          <div class="h-16 w-16 overflow-hidden rounded-[18px] bg-[var(--bg-muted)]">
            <NuxtImg
              v-if="job.imageUrl"
              :src="job.imageUrl"
              :alt="job.title"
              class="h-full w-full object-cover"
              width="120"
              height="120"
            />
          </div>

          <div class="min-w-0 flex-1">
            <p v-if="job.owner?.name" class="mt-1 text-sm text-[var(--text-secondary)]">
              {{ job.owner.name }}
            </p>
            <p class="mt-2 text-sm text-[var(--text-secondary)]">
              {{ job.location }} · {{ job.salaryLabel || $t("pages.jobsPage.salaryUnknown") }}
            </p>
          </div>
        </div>
      </UCard>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="$t('pages.jobsPage.fullName')" required :error="errors.userName || undefined">
          <UInput v-model="form.userName" class="w-full" size="xl" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>
        <UFormField :label="$t('pages.jobsPage.phone')" required :error="errors.phoneNumber || undefined">
          <UInput v-model="form.phoneNumber" class="w-full" size="xl" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>
        <UFormField :label="$t('pages.jobsPage.location')" required :error="errors.location || undefined">
          <UInput v-model="form.location" class="w-full" size="xl" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>
        <UFormField :label="$t('pages.jobsPage.email')" required :error="errors.email || undefined">
          <UInput v-model="form.email" class="w-full" type="email" size="xl" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>
      </div>

      <UCard class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface)]" :ui="{ body: 'p-5' }">
        <div class="space-y-4">
          <p class="text-sm font-[700] text-[var(--text-primary)]">
            {{ $t("pages.jobsPage.experience") }}
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('pages.jobsPage.position')">
              <UInput v-model="form.experience.position" class="w-full" size="xl" :ui="{ base: 'h-12 rounded-[18px]' }" />
            </UFormField>
            <UFormField :label="$t('pages.jobsPage.whereDidYouWork')">
              <UInput v-model="form.experience.whereDidYouWork" class="w-full" size="xl" :ui="{ base: 'h-12 rounded-[18px]' }" />
            </UFormField>
          </div>

          <UFormField :label="$t('pages.jobsPage.experienceDescription')">
            <UTextarea v-model="form.experience.experienceDescription" :rows="4" autoresize class="w-full" />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('pages.jobsPage.experienceStartDate')">
              <UInput
                v-model="form.experience.experienceStartDate"
                type="number"
                min="1900"
                max="2100"
                class="w-full"
                size="xl"
                :ui="{ base: 'h-12 rounded-[18px]' }"
              />
            </UFormField>
            <UFormField :label="$t('pages.jobsPage.experienceEndDate')">
              <UInput
                v-model="form.experience.experienceEndDate"
                type="number"
                min="1900"
                max="2100"
                class="w-full"
                size="xl"
                :disabled="form.experience.currentlyWorkHere"
                :ui="{ base: 'h-12 rounded-[18px]' }"
              />
            </UFormField>
          </div>

          <UCheckbox v-model="form.experience.currentlyWorkHere" :label="$t('pages.jobsPage.currentlyWorkHere')" />
        </div>
      </UCard>

      <UCard
        v-for="question in job.questions"
        :key="question.slot"
        class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface)]"
        :ui="{ body: 'p-5' }"
      >
        <div class="space-y-4">
          <p class="text-sm font-[700] text-[var(--text-primary)]">
            {{ question.prompt }}
          </p>

          <UTextarea
            v-if="question.type === 'free_text_question'"
            v-model="answers[String(question.slot)]"
            :rows="3"
            autoresize
          />

          <div v-else-if="question.type === 'yes_no_question'" class="flex flex-wrap gap-3">
            <UButton
              v-for="option in yesNoOptions"
              :key="option.value"
              type="button"
              :color="answers[String(question.slot)] === option.value ? 'primary' : 'neutral'"
              :variant="answers[String(question.slot)] === option.value ? 'solid' : 'outline'"
              class="rounded-full"
              @click="answers[String(question.slot)] = option.value"
            >
              {{ option.label }}
            </UButton>
          </div>

          <USelect
            v-else
            v-model="answers[String(question.slot)]"
            :items="question.answers"
            value-key="value"
            label-key="label"
            class="w-full"
            size="xl"
            :ui="{ base: 'h-12 rounded-[18px]' }"
          />

          <p v-if="errors[`question${question.slot}`]" class="text-sm text-[var(--text-danger)]">
            {{ errors[`question${question.slot}`] }}
          </p>
        </div>
      </UCard>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="outline" class="rounded-full" :disabled="submitting" @click="emit('close')">
          {{ $t("pages.jobsPage.close") }}
        </UButton>
        <UButton color="primary" class="rounded-full px-6" :loading="submitting" @click="submit">
          {{ $t("pages.jobsPage.submitApplication") }}
        </UButton>
      </div>
    </div>
  </FoundationModalShell>
</template>

<script setup lang="ts">
import FoundationModalShell from "../../../foundation/presentation/components/ModalShell.vue"
import type { JobApplicationDraft, JobRecord, JobUserDefaults } from "../../domain/types/jobs.types"

const props = defineProps<{
  open: boolean
  job: JobRecord | null
  defaults: JobUserDefaults
  submitting: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: JobApplicationDraft]
}>()

const { t } = useI18n()
const modalOpen = computed(() => props.open && Boolean(props.job))
const modalTitle = computed(() => props.job?.title || t("pages.jobsPage.submitApplication"))

const form = reactive<JobApplicationDraft>({
  jobId: 0,
  userName: "",
  phoneNumber: "",
  location: "",
  email: "",
  experience: {
    position: "",
    whereDidYouWork: "",
    experienceDescription: "",
    experienceStartDate: "",
    experienceEndDate: "",
    currentlyWorkHere: false,
  },
  answers: {},
})

const answers = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({
  userName: "",
  phoneNumber: "",
  location: "",
  email: "",
})

const yesNoOptions = computed(() => [
  { label: t("pages.jobsPage.answerYes"), value: "yes" },
  { label: t("pages.jobsPage.answerNo"), value: "no" },
])

watch(
  () => [props.open, props.job?.id, props.defaults.name, props.defaults.email, props.defaults.phoneNumber, props.defaults.location],
  () => {
    form.jobId = props.job?.id ?? 0
    form.userName = props.defaults.name || ""
    form.phoneNumber = props.defaults.phoneNumber || ""
    form.location = props.defaults.location || ""
    form.email = props.defaults.email || ""
    form.experience.position = ""
    form.experience.whereDidYouWork = ""
    form.experience.experienceDescription = ""
    form.experience.experienceStartDate = ""
    form.experience.experienceEndDate = ""
    form.experience.currentlyWorkHere = false

    Object.keys(answers).forEach((key) => {
      delete answers[key]
    })

    clearErrors()
  },
  { immediate: true },
)

function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ""
  })
}

function submit() {
  if (!props.job) {
    return
  }

  clearErrors()

  if (!form.userName.trim()) errors.userName = t("pages.jobsPage.fullNameError")
  if (!form.phoneNumber.trim()) errors.phoneNumber = t("pages.jobsPage.phoneError")
  if (!form.location.trim()) errors.location = t("pages.jobsPage.locationError")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = t("pages.jobsPage.emailError")

  props.job.questions.forEach((question) => {
    if (!String(answers[String(question.slot)] || "").trim()) {
      errors[`question${question.slot}`] = t("pages.jobsPage.questionRequired")
    }
  })

  if (Object.values(errors).some(Boolean)) {
    return
  }

  emit("submit", {
    ...form,
    userName: form.userName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    location: form.location.trim(),
    email: form.email.trim(),
    experience: {
      ...form.experience,
      position: form.experience.position.trim(),
      whereDidYouWork: form.experience.whereDidYouWork.trim(),
      experienceDescription: form.experience.experienceDescription.trim(),
      experienceStartDate: form.experience.experienceStartDate.trim(),
      experienceEndDate: form.experience.experienceEndDate.trim(),
    },
    answers: {
      1: answers["1"] || undefined,
      2: answers["2"] || undefined,
      3: answers["3"] || undefined,
    },
  })
}
</script>
