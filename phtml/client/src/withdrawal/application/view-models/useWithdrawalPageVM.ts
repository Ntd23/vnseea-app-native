// English description: Owns withdrawal overview loading and request submission state.

import { createApiWithdrawalRepository } from "../../infrastructure/repositories/ApiWithdrawalRepository"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { WithdrawalRepository } from "../../domain/repositories/WithdrawalRepository"
import type {
  WithdrawalOverview,
  WithdrawalRequestDraft,
} from "../../domain/types/withdrawal.types"

const EMPTY_WITHDRAWAL: WithdrawalOverview = {
  balance: 0,
  walletBalance: 0,
  minimumAmount: 0,
  currency: "",
  currencySymbol: "",
  currencyRule: {},
  methods: [],
  history: [],
  bankEnabled: false,
  paypalEmail: "",
  hasPendingRequest: false,
}

const toErrorMessage = (error: unknown, defaultMessage: string) =>
  error instanceof Error && error.message ? error.message : defaultMessage

export function useWithdrawalPageVM(
  repository: WithdrawalRepository = createApiWithdrawalRepository(),
) {
  const { t, locale } = useI18n()
  const submitting = ref(false)
  const mutationError = ref("")
  const mutationMessage = ref("")

  const { data, status, error, refresh } = useAsyncData(
    "withdrawal:overview",
    () => repository.getOverview(),
    { default: () => EMPTY_WITHDRAWAL },
  )

  const overview = computed(() => data.value)
  const loading = computed(() => status.value === "pending")
  const errorMessage = computed(() =>
    error.value ? toErrorMessage(error.value, t("pages.withdrawalPage.loadError")) : "",
  )
  const belowMinimum = computed(() =>
    overview.value.balance < overview.value.minimumAmount,
  )
  const canSubmit = computed(() =>
    overview.value.methods.length > 0
    && !overview.value.hasPendingRequest
    && !belowMinimum.value,
  )
  const formattedBalance = computed(() =>
    formatWithdrawalAmount(overview.value.balance),
  )
  const formattedMinimumAmount = computed(() =>
    formatWithdrawalAmount(overview.value.minimumAmount),
  )

  function formatWithdrawalAmount(amount: number) {
    return formatCurrency(amount, {
      currency: overview.value.currency,
      currencySymbol: overview.value.currencySymbol,
      currencyRule: overview.value.currencyRule,
      locale: locale.value,
    })
  }

  function resetMutationState() {
    mutationError.value = ""
    mutationMessage.value = ""
  }

  async function requestWithdrawal(input: WithdrawalRequestDraft) {
    submitting.value = true
    resetMutationState()

    try {
      const result = await repository.requestWithdrawal(input)
      mutationMessage.value = result.message
      await refresh()
    }
    catch (requestError) {
      mutationError.value = toErrorMessage(requestError, t("pages.withdrawalPage.requestError"))
    }
    finally {
      submitting.value = false
    }
  }

  return {
    overview,
    loading,
    errorMessage,
    belowMinimum,
    canSubmit,
    formattedBalance,
    formattedMinimumAmount,
    submitting,
    mutationError,
    mutationMessage,
    requestWithdrawal,
    refresh,
  }
}
