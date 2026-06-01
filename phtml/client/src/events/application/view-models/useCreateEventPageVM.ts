// English description: Owns the backend-backed create-event form state, validation, preview, and submit flow.

import type { FormError, FormSubmitEvent } from "@nuxt/ui"
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { createApiEventsRepository } from "../../infrastructure/repositories/ApiEventsRepository"
import type { EventCreateDraft } from "../../domain/types/events.types"

export function useCreateEventPageVM(
  repository = createApiEventsRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const form = reactive<EventCreateDraft>({
    name: "",
    location: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    coverFile: null,
  })

  const coverPreviewUrl = ref("")
  const submitting = ref(false)
  const submitError = ref("")

  const dateRangeLabel = computed(() => {
    const start = [form.startDate, form.startTime].filter(Boolean).join(" • ")
    const end = [form.endDate, form.endTime].filter(Boolean).join(" • ")

    if (!start && !end) return ""
    if (!end || start === end) return start
    return `${start} → ${end}`
  })

  const validate = (state: EventCreateDraft): FormError[] => {
    const errors: FormError[] = []

    if (state.name.trim().length < 5) {
      errors.push({ name: "name", message: t("pages.createEventPage.validationTitleRequired") })
    }

    if (state.location.trim().length < 3) {
      errors.push({ name: "location", message: t("pages.createEventPage.validationLocationRequired") })
    }

    if (state.description.trim().length < 10) {
      errors.push({ name: "description", message: t("pages.createEventPage.validationDescriptionRequired") })
    }

    if (!state.startDate) {
      errors.push({ name: "startDate", message: t("pages.createEventPage.validationStartRequired") })
    }

    if (!state.startTime) {
      errors.push({ name: "startTime", message: t("pages.createEventPage.validationStartRequired") })
    }

    if (!state.endDate) {
      errors.push({ name: "endDate", message: t("pages.createEventPage.validationEndRequired") })
    }

    if (!state.endTime) {
      errors.push({ name: "endTime", message: t("pages.createEventPage.validationEndRequired") })
    }

    if (state.startDate && state.startTime && state.endDate && state.endTime) {
      const start = new Date(`${state.startDate}T${state.startTime}`)
      const end = new Date(`${state.endDate}T${state.endTime}`)

      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
        errors.push({ name: "endDate", message: t("pages.createEventPage.validationDateOrder") })
      }
    }

    return errors
  }

  const onCoverChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] || null

    form.coverFile = file
    submitError.value = ""

    if (coverPreviewUrl.value) {
      URL.revokeObjectURL(coverPreviewUrl.value)
      coverPreviewUrl.value = ""
    }

    if (file) {
      coverPreviewUrl.value = URL.createObjectURL(file)
    }
  }

  const submit = async (_event: FormSubmitEvent<EventCreateDraft>) => {
    const errors = validate(form)

    if (errors.length > 0) {
      submitError.value = errors[0].message
      return
    }

    submitting.value = true
    submitError.value = ""

    try {
      const createdEvent = await repository.createEvent(form)

      toast.add({
        color: "success",
        icon: "i-ph-check-circle-fill",
        title: createdEvent.name,
        description: t("pages.createEventPage.publishComplete"),
      })

      await navigateTo(appRoutes.eventDetail(createdEvent.id))
    }
    catch (error) {
      submitError.value = error instanceof Error
        ? error.message
        : t("pages.createEventPage.statusErrorDescription")
    }
    finally {
      submitting.value = false
    }
  }

  onUnmounted(() => {
    if (coverPreviewUrl.value) {
      URL.revokeObjectURL(coverPreviewUrl.value)
    }
  })

  return {
    form,
    coverPreviewUrl,
    dateRangeLabel,
    submitting,
    submitError,
    validate,
    onCoverChange,
    submit,
  }
}
