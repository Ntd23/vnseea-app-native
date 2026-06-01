// English description: Forgot password page view model for requesting backend recovery instructions.

import type { FormError } from "@nuxt/ui"
import type { ForgotPasswordResult } from "../../domain/types/auth.types"
import { createApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"

type ForgotPasswordFieldName = "emailOrPhone" | "captchaConfirmed"
type ForgotPasswordValidationError = FormError<ForgotPasswordFieldName>

const hasValidIdentity = (value: string) => {
  const normalized = value.trim()

  if (!normalized) return false
  if (normalized.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)

  return normalized.replace(/\D/g, "").length >= 8
}

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

export function useForgotPasswordPageVM(
  repository = createApiAuthRepository(),
) {
  const { t } = useI18n()

  const state = reactive({
    emailOrPhone: "",
    captchaConfirmed: false,
  })

  const submitState = ref<"idle" | "loading" | "success" | "error">("idle")
  const submitMessage = ref("")
  const lastResult = ref<ForgotPasswordResult | null>(null)

  const validate = (currentState: typeof state): ForgotPasswordValidationError[] => {
    const errors: ForgotPasswordValidationError[] = []

    if (!currentState.emailOrPhone.trim()) {
      errors.push({ name: "emailOrPhone", message: t("pages.forgotPasswordPage.validationEmailRequired") })
    }
    else if (!hasValidIdentity(currentState.emailOrPhone)) {
      errors.push({ name: "emailOrPhone", message: t("pages.forgotPasswordPage.validationEmailInvalid") })
    }

    if (!currentState.captchaConfirmed) {
      errors.push({ name: "captchaConfirmed", message: t("pages.forgotPasswordPage.validationCaptchaRequired") })
    }

    return errors
  }

  const isSubmitDisabled = computed(() =>
    submitState.value === "loading"
    || !state.emailOrPhone.trim()
    || !state.captchaConfirmed,
  )

  const statusAlert = computed(() => {
    if (submitState.value === "success") {
      return {
        color: "success" as const,
        icon: "i-ph-check-circle-fill",
        title: t("pages.forgotPasswordPage.statusSuccessTitle"),
        description: submitMessage.value || t("pages.forgotPasswordPage.statusSuccessDescription"),
      }
    }

    if (submitState.value === "error") {
      return {
        color: "error" as const,
        icon: "i-ph-warning-circle-fill",
        title: t("pages.forgotPasswordPage.statusErrorTitle"),
        description: submitMessage.value || t("pages.forgotPasswordPage.statusErrorDescription"),
      }
    }

    return null
  })

  async function handleReset() {
    submitState.value = "loading"
    submitMessage.value = ""

    try {
      const result = await repository.requestPasswordReset({
        identity: state.emailOrPhone,
      })

      lastResult.value = result
      submitState.value = "success"
      submitMessage.value = result.message

      if (result.channel === "sms" && result.userId) {
        await navigateTo({
          path: appRoutes.confirmResetSms,
          query: { userId: String(result.userId) },
        })
      }
    }
    catch (error) {
      submitState.value = "error"
      submitMessage.value = extractErrorMessage(
        error,
        t("pages.forgotPasswordPage.statusErrorDescription"),
      )
    }
  }

  const onFormError = () => {
    submitState.value = "error"

    if (!submitMessage.value) {
      submitMessage.value = t("pages.forgotPasswordPage.statusErrorDescription")
    }
  }

  watch(
    () => [state.emailOrPhone, state.captchaConfirmed],
    () => {
      if (submitState.value !== "loading") {
        submitState.value = "idle"
        submitMessage.value = ""
      }
    },
  )

  return {
    state,
    submitState,
    submitMessage,
    lastResult,
    isSubmitDisabled,
    statusAlert,
    validate,
    handleReset,
    onFormError,
  }
}
