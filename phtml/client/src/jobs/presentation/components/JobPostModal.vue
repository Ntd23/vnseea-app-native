<!-- English description: Collects the real PHP job creation payload, including page ownership, salary fields, image source, and custom questions. -->
<template>
  <FoundationModalShell
    :open="open"
    size="xl"
    body-class="space-y-5"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        class="rounded-[20px]"
        :title="errorMessage"
      />

      <UAlert
        v-if="!canCreate"
        color="warning"
        variant="subtle"
        class="rounded-[20px]"
        :title="createDisabledReason || $t('pages.jobsPage.noOwnedPagesDescription')"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="$t('pages.jobsPage.ownerPage')">
          <USelect
            v-model="pageIdModel"
            :items="ownerOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            size="xl"
            :disabled="!canCreate || submitting"
            :ui="{ base: 'h-12 rounded-[18px]' }"
          />
        </UFormField>

        <UFormField :label="$t('pages.jobsPage.roleTitle')" required :error="errors.title || undefined">
          <UInput v-model="form.title" class="w-full" size="xl" :disabled="submitting" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>

        <UFormField :label="$t('pages.jobsPage.category')" required :error="errors.category || undefined">
          <USelect
            v-model="form.category"
            :items="createCategories"
            value-key="value"
            label-key="label"
            class="w-full"
            size="xl"
            :disabled="submitting"
            :ui="{ base: 'h-12 rounded-[18px]' }"
          />
        </UFormField>

        <UFormField :label="$t('pages.jobsPage.type')" required :error="errors.jobType || undefined">
          <USelect
            v-model="form.jobType"
            :items="createTypes"
            value-key="value"
            label-key="label"
            class="w-full"
            size="xl"
            :disabled="submitting"
            :ui="{ base: 'h-12 rounded-[18px]' }"
          />
        </UFormField>

        <UFormField :label="$t('pages.jobsPage.location')" required :error="errors.location || undefined">
          <UInput v-model="form.location" class="w-full" size="xl" :disabled="submitting" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>

        <UFormField :label="$t('pages.jobsPage.currency')" required :error="errors.currency || undefined">
          <USelect
            v-model="form.currency"
            :items="normalizedCurrencies.map(item => ({ label: `${item.label} (${item.symbol})`, value: item.value }))"
            value-key="value"
            label-key="label"
            class="w-full"
            size="xl"
            :disabled="submitting"
            :ui="{ base: 'h-12 rounded-[18px]' }"
          />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField :label="$t('pages.jobsPage.minimumSalary')">
          <UInput v-model="minimumModel" type="number" min="0" class="w-full" size="xl" :disabled="submitting" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>
        <UFormField :label="$t('pages.jobsPage.maximumSalary')">
          <UInput v-model="maximumModel" type="number" min="0" class="w-full" size="xl" :disabled="submitting" :ui="{ base: 'h-12 rounded-[18px]' }" />
        </UFormField>
        <UFormField :label="$t('pages.jobsPage.salaryDate')">
          <USelect
            v-model="form.salaryDate"
            :items="normalizedSalaryDates.filter(item => item.value)"
            value-key="value"
            label-key="label"
            class="w-full"
            size="xl"
            :disabled="submitting"
            :ui="{ base: 'h-12 rounded-[18px]' }"
          />
        </UFormField>
      </div>

      <UFormField :label="$t('pages.jobsPage.jobDescription')" required :error="errors.description || undefined">
        <UTextarea v-model="form.description" :rows="6" autoresize />
      </UFormField>

      <UCard class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface)]" :ui="{ body: 'p-5' }">
        <div class="space-y-4">
          <p class="text-sm font-[700] text-[var(--text-primary)]">
            {{ $t("pages.jobsPage.jobImageSource") }}
          </p>

          <div class="flex flex-wrap gap-3">
            <UButton
              v-for="option in normalizedImageTypes.filter(item => item.value)"
              :key="option.value"
              type="button"
              :color="form.imageType === option.value ? 'primary' : 'neutral'"
              :variant="form.imageType === option.value ? 'solid' : 'outline'"
              class="rounded-full"
              @click="form.imageType = option.value as 'cover' | 'upload'"
            >
              {{ option.label }}
            </UButton>
          </div>

          <div v-if="form.imageType === 'upload'" class="space-y-3">
            <input
              ref="thumbnailInput"
              class="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              @change="setThumbnail"
            >

            <UButton type="button" color="neutral" variant="outline" class="rounded-full" @click="thumbnailInput?.click()">
              {{ $t("pages.jobsPage.uploadImage") }}
            </UButton>

            <p class="text-sm text-[var(--text-secondary)]">
              {{ form.thumbnailFile?.name || $t("pages.jobsPage.imageUploadRequired") }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard class="rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface)]" :ui="{ body: 'p-5' }">
        <div class="space-y-5">
          <p class="text-sm font-[700] text-[var(--text-primary)]">
            {{ $t("pages.jobsPage.questions") }}
          </p>

          <div
            v-for="(question, index) in form.questions"
            :key="index"
            class="space-y-4 rounded-[20px] border border-[var(--border-light)] p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-[var(--text-primary)]">
                {{ questionLabels[index] }}
              </p>
              <UCheckbox v-model="question.enabled" :label="$t('pages.jobsPage.enableQuestion')" />
            </div>

            <template v-if="question.enabled">
              <UFormField :label="$t('pages.jobsPage.questionPrompt')">
                <UTextarea v-model="question.prompt" :rows="3" autoresize />
              </UFormField>

              <UFormField :label="$t('pages.jobsPage.questionType')">
                <USelect
                  v-model="question.type"
                  :items="normalizedQuestionTypes.filter(item => item.value)"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                  size="xl"
                  :ui="{ base: 'h-12 rounded-[18px]' }"
                />
              </UFormField>

              <UFormField v-if="question.type === 'multiple_choice_question'" :label="$t('pages.jobsPage.questionAnswers')">
                <UInput
                  v-model="question.answersInput"
                  class="w-full"
                  size="xl"
                  :placeholder="$t('pages.jobsPage.questionAnswersHint')"
                  :ui="{ base: 'h-12 rounded-[18px]' }"
                />
              </UFormField>
            </template>
          </div>
        </div>
      </UCard>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="outline" class="rounded-full" :disabled="submitting" @click="emit('close')">
          {{ $t("pages.jobsPage.close") }}
        </UButton>
        <UButton color="primary" class="rounded-full px-6" :loading="submitting" :disabled="!canCreate" @click="submit">
          {{ $t("pages.jobsPage.postJob") }}
        </UButton>
      </div>
    </div>
  </FoundationModalShell>
</template>

<script setup lang="ts">
import FoundationModalShell from "../../../foundation/presentation/components/ModalShell.vue"
import type {
  JobCreateDraft,
  JobCreateQuestionDraft,
  JobOwnerPageOption,
  JobsSelectOption,
  JobUserDefaults,
} from "../../domain/types/jobs.types"

type LocalQuestionDraft = JobCreateQuestionDraft & {
  answersInput: string
}

const PERSONAL_OWNER_VALUE = "__personal_account__"

const props = defineProps<{
  open: boolean
  categories: JobsSelectOption[]
  types: JobsSelectOption[]
  currencies: Array<JobsSelectOption & { symbol: string }>
  salaryDates: JobsSelectOption[]
  questionTypes: JobsSelectOption[]
  imageTypes: JobsSelectOption[]
  ownedPages: JobOwnerPageOption[]
  defaults: JobUserDefaults
  canCreate: boolean
  createDisabledReason: string
  submitting: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: JobCreateDraft]
}>()

const { t } = useI18n()
const thumbnailInput = ref<HTMLInputElement | null>(null)

const normalizedCategories = computed(() =>
  Array.isArray(props.categories) ? props.categories : [],
)

const normalizedTypes = computed(() =>
  Array.isArray(props.types) ? props.types : [],
)

const normalizedCurrencies = computed(() =>
  Array.isArray(props.currencies) ? props.currencies : [],
)

const normalizedSalaryDates = computed(() =>
  Array.isArray(props.salaryDates) ? props.salaryDates : [],
)

const normalizedQuestionTypes = computed(() =>
  Array.isArray(props.questionTypes) ? props.questionTypes : [],
)

const normalizedImageTypes = computed(() =>
  Array.isArray(props.imageTypes) ? props.imageTypes : [],
)

const normalizedOwnedPages = computed(() =>
  Array.isArray(props.ownedPages) ? props.ownedPages : [],
)

const isConcreteOption = (option: JobsSelectOption) =>
  Boolean(option.value) && !option.value.startsWith("__all_")

const createCategories = computed(() => normalizedCategories.value.filter(isConcreteOption))
const createTypes = computed(() => normalizedTypes.value.filter(isConcreteOption))
const ownerOptions = computed(() => [
  {
    label: t("pages.jobsPage.personalAccount"),
    value: PERSONAL_OWNER_VALUE,
  },
  ...normalizedOwnedPages.value.map(page => ({
    label: page.title,
    value: String(page.id),
  })),
])

const createQuestion = (): LocalQuestionDraft => ({
  enabled: false,
  prompt: "",
  type: "free_text_question",
  answers: [],
  answersInput: "",
})

const form = reactive<{
  pageId: number
  title: string
  location: string
  lat: number | null
  lng: number | null
  minimum: number | null
  maximum: number | null
  currency: string
  salaryDate: string
  jobType: string
  category: string
  description: string
  imageType: "cover" | "upload"
  thumbnailFile: File | null
  questions: [LocalQuestionDraft, LocalQuestionDraft, LocalQuestionDraft]
}>({
  pageId: 0,
  title: "",
  location: "",
  lat: null,
  lng: null,
  minimum: null,
  maximum: null,
  currency: "",
  salaryDate: "",
  jobType: "",
  category: "",
  description: "",
  imageType: "cover",
  thumbnailFile: null,
  questions: [createQuestion(), createQuestion(), createQuestion()],
})

const errors = reactive<Record<string, string>>({
  title: "",
  location: "",
  currency: "",
  category: "",
  jobType: "",
  description: "",
})

const questionLabels = computed(() => [
  t("pages.jobsPage.questionOne"),
  t("pages.jobsPage.questionTwo"),
  t("pages.jobsPage.questionThree"),
])

const pageIdModel = computed({
  get: () => (form.pageId ? String(form.pageId) : PERSONAL_OWNER_VALUE),
  set: value => {
    form.pageId = String(value) === PERSONAL_OWNER_VALUE ? 0 : Number(value) || 0
  },
})

const minimumModel = computed({
  get: () => (typeof form.minimum === "number" ? String(form.minimum) : ""),
  set: value => {
    const normalized = Number(value)
    form.minimum = Number.isFinite(normalized) && normalized > 0 ? normalized : null
  },
})

const maximumModel = computed({
  get: () => (typeof form.maximum === "number" ? String(form.maximum) : ""),
  set: value => {
    const normalized = Number(value)
    form.maximum = Number.isFinite(normalized) && normalized > 0 ? normalized : null
  },
})

watch(
  () => [
    props.open,
    props.defaults.location,
    props.defaults.lat,
    props.defaults.lng,
    normalizedOwnedPages.value.length,
    normalizedCurrencies.value.length,
    normalizedSalaryDates.value.length,
    normalizedTypes.value.length,
    normalizedCategories.value.length,
  ],
  () => {
    form.pageId = 0
    form.title = ""
    form.location = props.defaults.location || ""
    form.lat = props.defaults.lat
    form.lng = props.defaults.lng
    form.minimum = null
    form.maximum = null
    form.currency = normalizedCurrencies.value[0]?.value ?? ""
    form.salaryDate = normalizedSalaryDates.value.find(item => item.value)?.value ?? ""
    form.jobType = createTypes.value[0]?.value ?? ""
    form.category = createCategories.value[0]?.value ?? ""
    form.description = ""
    form.imageType = "cover"
    form.thumbnailFile = null
    form.questions = [createQuestion(), createQuestion(), createQuestion()]
    clearErrors()
  },
  { immediate: true },
)

function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ""
  })
}

function setThumbnail(event: Event) {
  const input = event.target as HTMLInputElement | null
  form.thumbnailFile = input?.files?.[0] ?? null
}

function submit() {
  clearErrors()

  if (!form.title.trim()) errors.title = t("pages.jobsPage.roleTitleError")
  if (!form.location.trim()) errors.location = t("pages.jobsPage.locationError")
  if (!form.currency.trim()) errors.currency = t("pages.jobsPage.currencyRequired")
  if (!form.category.trim()) errors.category = t("pages.jobsPage.categoryRequired")
  if (!form.jobType.trim()) errors.jobType = t("pages.jobsPage.typeRequired")
  if (!form.description.trim()) errors.description = t("pages.jobsPage.jobDescriptionError")

  if (Object.values(errors).some(Boolean)) {
    return
  }

  emit("submit", {
    pageId: form.pageId,
    title: form.title.trim(),
    location: form.location.trim(),
    lat: form.lat,
    lng: form.lng,
    minimum: form.minimum,
    maximum: form.maximum,
    currency: form.currency,
    salaryDate: form.salaryDate,
    jobType: form.jobType,
    category: form.category,
    description: form.description.trim(),
    imageType: form.imageType,
    thumbnailFile: form.thumbnailFile,
    questions: form.questions.map((question) => ({
      enabled: question.enabled && question.prompt.trim().length > 0,
      prompt: question.prompt.trim(),
      type: question.type,
      answers: question.type === "multiple_choice_question"
        ? question.answersInput.split(",").map(item => item.trim()).filter(Boolean)
        : [],
    })) as JobCreateDraft["questions"],
  })
}
</script>
