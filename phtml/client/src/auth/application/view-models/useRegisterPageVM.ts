// English description: Registration page view model that maps Nuxt form state to the backend account flow.

import type { FormError } from "@nuxt/ui"
import type {
  RegisterAccountInput,
  RegisterAccountResult,
} from "../../domain/types/auth.types"
import { createApiAuthRepository } from "../../infrastructure/repositories/ApiAuthRepository"
import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { submitBackendBrowserSession } from "../services/backend-browser-session"

type RegisterFieldName =
  | "firstName"
  | "lastName"
  | "username"
  | "birthDay"
  | "gender"
  | "email"
  | "password"
  | "confirmPassword"
  | "acceptTerms"
type RegisterValidationError = FormError<RegisterFieldName>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[\w]+$/
const hasValidLoginIdentity = (value: string) => {
  const normalized = value.trim()

  if (!normalized) {
    return false
  }

  if (normalized.includes("@")) {
    return EMAIL_REGEX.test(normalized)
  }

  return normalized.replace(/\D/g, "").length >= 8
}

const createDefaultState = (): RegisterAccountInput => ({
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  birthDay: null,
  birthMonth: null,
  birthYear: null,
  gender: "",
  hasExistingStorefront: false,
  acceptTerms: false,
})

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

export function useRegisterPageVM(
  repository = createApiAuthRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const state = reactive<RegisterAccountInput>(createDefaultState())
  const submitState = ref<"idle" | "loading" | "success" | "error">("idle")
  const submitMessage = ref("")
  const lastResult = ref<RegisterAccountResult | null>(null)

  const validate = (currentState: RegisterAccountInput): RegisterValidationError[] => {
    const errors: RegisterValidationError[] = []

    if (!currentState.firstName.trim()) {
      errors.push({ name: "firstName", message: t("pages.registerPage.validationFirstNameRequired") })
    }

    if (!currentState.lastName.trim()) {
      errors.push({ name: "lastName", message: t("pages.registerPage.validationLastNameRequired") })
    }

    if (!currentState.username.trim()) {
      errors.push({ name: "username", message: t("pages.registerPage.validationUsernameRequired") })
    }
    else if (!USERNAME_REGEX.test(currentState.username.trim())) {
      errors.push({ name: "username", message: t("pages.registerPage.validationUsernamePattern") })
    }
    else if (currentState.username.trim().length < 5 || currentState.username.trim().length > 32) {
      errors.push({ name: "username", message: t("pages.registerPage.validationUsernameLength") })
    }

    if (!currentState.email.trim()) {
      errors.push({ name: "email", message: "Enter your email address or phone number." })
    }
    else if (!hasValidLoginIdentity(currentState.email)) {
      errors.push({ name: "email", message: t("pages.registerPage.validationEmailOrPhoneInvalid") })
    }

    if (!currentState.password) {
      errors.push({ name: "password", message: t("pages.registerPage.validationPasswordRequired") })
    }
    else if (currentState.password.length < 6) {
      errors.push({ name: "password", message: t("pages.registerPage.validationPasswordLength") })
    }

    if (!currentState.confirmPassword) {
      errors.push({ name: "confirmPassword", message: t("pages.registerPage.validationConfirmPasswordRequired") })
    }
    else if (currentState.confirmPassword !== currentState.password) {
      errors.push({ name: "confirmPassword", message: t("pages.registerPage.validationConfirmPasswordMismatch") })
    }

    if (
      currentState.birthDay === null
      || currentState.birthMonth === null
      || currentState.birthYear === null
    ) {
      errors.push({ name: "birthDay", message: t("pages.registerPage.validationBirthdayRequired") })
    }

    if (!currentState.gender) {
      errors.push({ name: "gender", message: t("pages.registerPage.validationGenderRequired") })
    }

    if (!currentState.acceptTerms) {
      errors.push({ name: "acceptTerms", message: t("pages.registerPage.validationAcceptTermsRequired") })
    }

    return errors
  }

  const isSubmitting = computed(() => submitState.value === "loading")

  async function handleSubmit() {
    submitState.value = "loading"
    submitMessage.value = ""

    try {
      const result = await repository.register({
        ...state,
      })

      lastResult.value = result
      submitState.value = "success"
      submitMessage.value = result.message

      if (result.status === "active" && result.accessToken) {
        await submitBackendBrowserSession(result.accessToken)
        return
      }

      if (result.status === "verification_required" && result.userId) {
        await navigateTo({
          path: appRoutes.confirmAccount,
          query: { userId: String(result.userId) },
        })
        return
      }

      toast.add({
        color: result.status === "verification_required" ? "warning" : "success",
        icon: result.status === "verification_required"
          ? "i-ph-envelope-simple-open-fill"
          : "i-ph-check-circle-fill",
        title: t("pages.registerPage.statusSuccessTitle"),
        description: result.message,
      })

      if (result.status === "active") {
        Object.assign(state, createDefaultState())
      }
    }
    catch (error) {
      submitState.value = "error"
      submitMessage.value = extractErrorMessage(
        error,
        t("pages.registerPage.statusErrorDescription"),
      )

      toast.add({
        color: "error",
        icon: "i-ph-warning-circle-fill",
        title: t("pages.registerPage.statusErrorTitle"),
        description: submitMessage.value,
      })
    }
  }

  watch(
    () => [
      state.firstName,
      state.lastName,
      state.username,
      state.email,
      state.password,
      state.confirmPassword,
      state.birthDay,
      state.birthMonth,
      state.birthYear,
      state.gender,
      state.hasExistingStorefront,
      state.acceptTerms,
    ],
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
    isSubmitting,
    validate,
    handleSubmit,
  }
}
