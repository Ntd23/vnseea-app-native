// English description: Two-factor login confirmation view model for the backend auth flow.

import type { FormError } from "@nuxt/ui"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { createApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository"
import { submitBackendBrowserSession } from "../services/backend-browser-session"

type ConfirmLoginFieldName = "code"
type ConfirmLoginValidationError = FormError<ConfirmLoginFieldName>

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

export function useConfirmLoginPageVM(
  repository = createApiAuthRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const submitState = ref<"idle" | "loading" | "success" | "error">("idle")
  const submitMessage = ref("")
  const state = reactive({
    code: "",
  })

  const userId = computed(() => {
    const value = Array.isArray(route.query.userId) ? route.query.userId[0] : route.query.userId
    const parsed = Number(value)

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  })

  const pageReady = computed(() => userId.value !== null)
  const validate = (currentState: typeof state): ConfirmLoginValidationError[] => {
    const errors: ConfirmLoginValidationError[] = []

    if (!currentState.code.trim()) {
      errors.push({ name: "code", message: t("pages.confirmLoginPage.validationCodeRequired") })
    }

    return errors
  }

  async function handleSubmit() {
    if (!userId.value) {
      submitState.value = "error"
      submitMessage.value = t("pages.confirmLoginPage.missingUser")
      return
    }

    submitState.value = "loading"
    submitMessage.value = ""

    try {
      const result = await repository.confirmLogin({
        userId: userId.value,
        code: state.code.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      })

      submitState.value = "success"
      submitMessage.value = result.message
      await submitBackendBrowserSession(result.accessToken)
    }
    catch (error) {
      submitState.value = "error"
      submitMessage.value = extractErrorMessage(error, t("pages.confirmLoginPage.statusErrorDescription"))
    }
  }

  const backToWelcome = async () => navigateTo(appRoutes.welcome)

  return {
    state,
    userId,
    pageReady,
    submitState,
    submitMessage,
    validate,
    handleSubmit,
    backToWelcome,
  }
}
