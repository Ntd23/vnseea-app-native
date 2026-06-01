<template>
  <UForm :state="form" class="space-y-5" @submit="submit">
    <FormsFormSection
      :title="$t('pages.createFundingPage.formTitle')"
      :description="$t('pages.createFundingPage.formDescription')"
      :eyebrow="$t('pages.createFundingPage.formEyebrow')"
      icon="i-ph-hand-heart-fill"
      :hint="$t('pages.createFundingPage.formHelper')"
      tone="primary"
    >
      <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
        <UFormField
          name="title"
          :label="$t('pages.createFundingPage.formTitleLabel')"
          required
          size="xl"
          class="space-y-2"
          :error="fieldErrors.title || undefined"
        >
          <UInput
            v-model="form.title"
            size="xl"
            color="primary"
            class="w-full"
            :disabled="isBusy"
            :placeholder="$t('pages.createFundingPage.formTitlePlaceholder')"
            :ui="{ base: 'h-14 rounded-[20px] px-4 text-[15px] font-semibold' }"
          />
        </UFormField>

        <UFormField
          name="category"
          :label="$t('pages.createFundingPage.categoryLabel')"
          required
          size="xl"
          class="space-y-2"
          :error="fieldErrors.category || undefined"
        >
          <USelect
            v-model="form.category"
            :items="categoryOptions"
            value-key="value"
            label-key="label"
            size="xl"
            color="primary"
            class="w-full"
            :disabled="isBusy"
            :ui="{ base: 'h-14 rounded-[20px] px-4 text-[15px] font-semibold' }"
          />
        </UFormField>
      </div>

      <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <UFormField
          name="goalAmount"
          :label="$t('pages.createFundingPage.goalLabel')"
          required
          size="xl"
          class="space-y-2"
          :error="fieldErrors.goalAmount || undefined"
        >
          <UInputNumber
            v-model="form.goalAmount"
            :min="1000000"
            :step="1000000"
            orientation="vertical"
            size="xl"
            class="w-full"
            :disabled="isBusy"
            :placeholder="$t('pages.createFundingPage.goalPlaceholder')"
            :ui="{ base: 'h-14 rounded-[20px] px-4 text-[15px] font-semibold' }"
          />
        </UFormField>

        <div class="flex items-end">
          <UAlert
            color="neutral"
            variant="subtle"
            icon="i-ph-info-fill"
            :description="$t('pages.createFundingPage.goalHint')"
            class="w-full rounded-[20px]"
          />
        </div>
      </div>
    </FormsFormSection>

    <FormsFormSection
      :title="$t('pages.createFundingPage.coverTitle')"
      :description="$t('pages.createFundingPage.coverDescription')"
      :eyebrow="$t('pages.createFundingPage.coverEyebrow')"
      icon="i-ph-image-square-fill"
      tone="neutral"
      compact
    >
      <FormsUploader
        :title="$t('pages.createFundingPage.imageLabel')"
        :description="$t('pages.createFundingPage.imageHelper')"
        :eyebrow="$t('pages.createFundingPage.coverEyebrow')"
        :items="coverItems"
        :allow-videos="false"
        :multiple="false"
        :disabled="isBusy"
        :status="coverUploaderStatus"
        :hint="$t('pages.createFundingPage.coverHint')"
        :image-button-label="$t('pages.createFundingPage.selectCover')"
        :empty-title="$t('pages.createFundingPage.coverEmptyTitle')"
        :empty-description="$t('pages.createFundingPage.coverEmptyDescription')"
        :remove-label="$t('pages.createFundingPage.removeCover')"
        @select-image="handleCoverSelection"
        @remove="removeCover"
      />
    </FormsFormSection>

    <FormsFormSection
      :title="$t('pages.createFundingPage.storyTitle')"
      :description="$t('pages.createFundingPage.storyDescription')"
      :eyebrow="$t('pages.createFundingPage.storyEyebrow')"
      icon="i-ph-note-pencil-fill"
      :hint="$t('pages.createFundingPage.storyHint')"
      tone="neutral"
    >
      <UFormField
        name="description"
        :label="$t('pages.createFundingPage.descriptionLabel')"
        required
        size="xl"
        class="space-y-2"
        :error="fieldErrors.description || undefined"
      >
        <UTextarea
          v-model="form.description"
          autoresize
          :rows="8"
          color="primary"
          size="xl"
          class="w-full"
          :disabled="isBusy"
          :placeholder="$t('pages.createFundingPage.descriptionPlaceholder')"
          :ui="{
            base: 'min-h-[200px] resize-y rounded-[20px] border-[var(--border-default)] bg-[var(--bg-surface-hover)] px-4 py-3 text-[14px] leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
          }"
        />
      </UFormField>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[var(--bg-surface-hover)] px-4 py-3">
        <p class="text-sm font-semibold text-[var(--text-secondary)]">
          {{ $t("pages.createFundingPage.descriptionHelper") }}
        </p>

        <UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1 text-[11px] font-semibold">
          {{ $t("pages.createFundingPage.descriptionCounter", { count: form.description.trim().length }) }}
        </UBadge>
      </div>
    </FormsFormSection>

    <div class="flex justify-start">
      <UButton
        :to="appRoutes.funding"
        color="neutral"
        variant="outline"
        class="rounded-full"
      >
        {{ $t("pages.createFundingPage.backButton") }}
      </UButton>
    </div>

    <FormsSubmitBar
      :show-save="false"
      :status="submitBarStatus"
      :status-title="submitBarStatusTitle"
      :status-description="submitBarStatusDescription"
      :submit-label="$t('pages.createFundingPage.submitButton')"
      :loading="isBusy"
      :submit-disabled="isBusy"
      @submit="submit"
    />
  </UForm>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import FormsFormSection from "../../../forms/presentation/components/FormSection.vue"
import FormsSubmitBar from "../../../shared-kernel/presentation/components/forms/SubmitBar.vue"
import FormsUploader from "../../../forms/presentation/components/Uploader.vue"
import type { FundingCategoryKey, FundingCreatePayload, FundingOption } from "../../domain/types/funding.types"

type CreateFundingStatus = "idle" | "loading" | "success" | "error"
type SubmitBarStatus = "idle" | "submitting" | "success" | "error"

type CoverItem = {
  id: string
  name: string
  kind: "image"
  previewUrl?: string
  meta?: string
  removable: true
  previewable: true
  status: "ready"
}

const props = defineProps<{
  categories: ReadonlyArray<FundingOption<"all" | FundingCategoryKey>>
}>()

const emit = defineEmits<{ create: [payload: FundingCreatePayload] }>()

const { t } = useI18n()
const toast = useToast()

const form = reactive<FundingCreatePayload>({
  title: "",
  category: "community",
  goalAmount: 50000000,
  imageName: "",
  description: "",
})

const fieldErrors = reactive<Record<keyof FundingCreatePayload, string>>({
  title: "",
  category: "",
  goalAmount: "",
  imageName: "",
  description: "",
})

const coverItems = ref<CoverItem[]>([])
const createdObjectUrls = ref<string[]>([])
const submitStatus = ref<CreateFundingStatus>("idle")

const categoryOptions = computed(() =>
  props.categories
    .filter(category => category.value !== "all")
    .map(category => ({
      label: category.label,
      value: category.value,
    })),
)

const defaultCategory = computed<FundingCategoryKey>(() =>
  categoryOptions.value[0]?.value ?? "community",
)

const isBusy = computed(() => submitStatus.value === "loading")

const coverUploaderStatus = computed(() => {
  if (coverItems.value.length > 0) return "success"
  return "idle"
})

const submitBarStatus = computed<SubmitBarStatus>(() => {
  if (submitStatus.value === "loading") return "submitting"
  return submitStatus.value
})

const submitBarStatusTitle = computed(() => {
  if (submitStatus.value === "loading") {
    return t("pages.createFundingPage.statusLoadingTitle")
  }

  if (submitStatus.value === "success") {
    return t("pages.createFundingPage.statusSuccessTitle")
  }

  if (submitStatus.value === "error") {
    return t("pages.createFundingPage.statusErrorTitle")
  }

  return ""
})

const submitBarStatusDescription = computed(() => {
  if (submitStatus.value === "loading") {
    return t("pages.createFundingPage.statusLoadingDescription")
  }

  if (submitStatus.value === "success") {
    return t("pages.createFundingPage.statusSuccessDescription")
  }

  if (submitStatus.value === "error") {
    return t("pages.createFundingPage.statusErrorDescription")
  }

  return t("pages.createFundingPage.submitHint")
})

watch(
  () => props.categories,
  () => {
    if (!categoryOptions.value.some(option => option.value === form.category)) {
      form.category = defaultCategory.value
    }
  },
  { immediate: true },
)

watch(
  () => [form.title, form.category, form.goalAmount, form.imageName, form.description],
  () => {
    if (submitStatus.value !== "loading") {
      submitStatus.value = "idle"
    }

    clearErrors()
  },
)

onBeforeUnmount(() => {
  revokeObjectUrls()
})

function clearErrors() {
  fieldErrors.title = ""
  fieldErrors.category = ""
  fieldErrors.goalAmount = ""
  fieldErrors.imageName = ""
  fieldErrors.description = ""
}

function revokeObjectUrls() {
  if (!import.meta.client) return

  for (const url of createdObjectUrls.value) {
    URL.revokeObjectURL(url)
  }

  createdObjectUrls.value = []
}

function handleCoverSelection(files: File[]) {
  const file = files[0]
  if (!file) return

  revokeObjectUrls()

  const previewUrl = import.meta.client ? URL.createObjectURL(file) : undefined
  if (previewUrl) {
    createdObjectUrls.value = [previewUrl]
  }

  form.imageName = file.name
  coverItems.value = [
    {
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      kind: "image",
      previewUrl,
      meta: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      removable: true,
      previewable: true,
      status: "ready",
    },
  ]
}

function removeCover() {
  revokeObjectUrls()
  coverItems.value = []
  form.imageName = ""
}

function validateForm() {
  clearErrors()

  form.title = form.title.trim()
  form.description = form.description.trim()

  if (form.title.length < 8) {
    fieldErrors.title = t("pages.createFundingPage.titleError")
  }

  if (!categoryOptions.value.some(option => option.value === form.category)) {
    fieldErrors.category = t("pages.createFundingPage.categoryError")
  }

  if (!form.goalAmount || form.goalAmount < 1000000) {
    fieldErrors.goalAmount = t("pages.createFundingPage.goalError")
  }

  if (form.description.length < 40) {
    fieldErrors.description = t("pages.createFundingPage.descriptionError")
  }

  return !fieldErrors.title
    && !fieldErrors.category
    && !fieldErrors.goalAmount
    && !fieldErrors.description
}

async function submit() {
  if (!validateForm()) {
    submitStatus.value = "error"
    return
  }

  submitStatus.value = "loading"

  await new Promise(resolve => setTimeout(resolve, 240))

  emit("create", { ...form })

  submitStatus.value = "success"

  toast.add({
    color: "success",
    icon: "i-ph-check-circle-fill",
    title: t("pages.createFundingPage.statusSuccessTitle"),
    description: t("pages.createFundingPage.statusSuccessDescription"),
  })
}
</script>
