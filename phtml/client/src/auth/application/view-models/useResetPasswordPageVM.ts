// English description: Password reset page view model for completing backend recovery requests.

import type { FormError } from "@nuxt/ui"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { createApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository"

type ResetPasswordFieldName = "email" | "password" | "confirmPassword"
type ResetPasswordValidationError = FormError<ResetPasswordFieldName>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const extractErrorMessage = (error: unknown, defaultMessage: string) => {
  const maybeError = error as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }

  return maybeError?.data?.statusMessage
    ?? maybeError?.data?.message
    ?? maybeError?.statusMessage
    ?? maybeError?.message
    ?? defaultMessage
}

export function useResetPasswordPageVM(
  repository = createApiAuthRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const toast = useToast()
  const state = reactive({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const submitState = ref<"idle" | "loading" | "success" | "error">("idle")
  const submitMessage = ref("")

  const resetCode = computed(() => {
    const value = Array.isArray(route.query.code) ? route.query.code[0] : route.query.code

    return typeof value === "string" && value.trim() ? value.trim() : ""
  })

  const emailFromQuery = computed(() => {
    const value = Array.isArray(route.query.email) ? route.query.email[0] : route.query.email

    return typeof value === "string" ? value.trim() : ""
  })

  watch(
    emailFromQuery,
    (value) => {
      if (value && !state.email) {
        state.email = value
      }
    },
    { immediate: true },
  )

  const pageReady = computed(() => Boolean(resetCode.value))

  const validate = (currentState: typeof state): ResetPasswordValidationError[] => {
    const errors: ResetPasswordValidationError[] = []

    if (!currentState.email.trim()) {
      errors.push({ name: "email", message: t("pages.resetPasswordPage.validationEmailRequired") })
    }
    else if (!EMAIL_REGEX.test(currentState.email.trim())) {
      errors.push({ name: "email", message: t("pages.resetPasswordPage.validationEmailInvalid") })
    }

    if (!currentState.password) {
      errors.push({ name: "password", message: t("pages.resetPasswordPage.validationPasswordRequired") })
    }
    else if (currentState.password.length < 6) {
      errors.push({ name: "password", message: t("pages.resetPasswordPage.validationPasswordLength") })
    }

    if (!currentState.confirmPassword) {
      errors.push({ name: "confirmPassword", message: t("pages.resetPasswordPage.validationConfirmPasswordRequired") })
    }
    else if (currentState.confirmPassword !== currentState.password) {
      errors.push({ name: "confirmPassword", message: t("pages.resetPasswordPage.validationConfirmPasswordMismatch") })
    }

    return errors
  }

  async function handleSubmit() {
    if (!resetCode.value) {
      submitState.value = "error"
      submitMessage.value = t("pages.resetPasswordPage.missingCode")
      return
    }

    submitState.value = "loading"
    submitMessage.value = ""

    try {
      const result = await repository.resetPassword({
        email: state.email.trim(),
        code: resetCode.value,
        newPassword: state.password,
      })

      submitState.value = "success"
      submitMessage.value = result.message

      toast.add({
        color: "success",
        icon: "i-ph-check-circle-fill",
        title: t("pages.resetPasswordPage.statusSuccessTitle"),
        description: result.message,
      })

      await navigateTo(appRoutes.welcome)
    }
    catch (error) {
      submitState.value = "error"
      submitMessage.value = extractErrorMessage(error, t("pages.resetPasswordPage.statusErrorDescription"))
    }
  }

  return {
    state,
    resetCode,
    emailFromQuery,
    pageReady,
    submitState,
    submitMessage,
    validate,
    handleSubmit,
  }
}
