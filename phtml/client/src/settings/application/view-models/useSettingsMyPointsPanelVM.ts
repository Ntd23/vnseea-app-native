// English description: ViewModel for points balance, exchange modal state, and wallet-backed points history.

import { toValue, type MaybeRefOrGetter } from "vue"
import type { SettingsPointsExchangeResult, SettingsUser } from "../../domain/types/settings.types"
import type { WalletTransaction } from "../../../wallet/domain/types/wallet.types"
import { createApiWalletRepository } from "../../../wallet/infrastructure/repositories/ApiWalletRepository"

type HistoryItem = {
  id: string
  title: string
  meta: string
  points: number
}

const fallbackExchangeStep = 1000

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "")
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

export function useSettingsMyPointsPanelVM(
  userSource: MaybeRefOrGetter<SettingsUser | null>,
  onExchange: (points: number) => Promise<SettingsPointsExchangeResult>,
  walletRepository = createApiWalletRepository(),
) {
  const { t, locale } = useI18n()
  const toast = useToast()
  const isExchangeModalOpen = ref(false)
  const exchangePoints = ref(fallbackExchangeStep)
  const exchangeError = ref("")
  const isSubmitting = ref(false)
  const walletTransactions = ref<WalletTransaction[]>([])
  const statusMessage = ref("")

  const user = computed(() => toValue(userSource))
  const pointsBalance = computed(() => Math.max(Math.trunc(toNumber(user.value?.points)), 0))
  const walletBalance = computed(() => Math.max(toNumber(user.value?.wallet), 0))
  const pointsPerCurrencyUnit = computed(() => {
    const configuredRate = Math.trunc(toNumber(user.value?.pointsConfig?.dollarToPointCost))
    return configuredRate > 0 ? configuredRate : fallbackExchangeStep
  })
  const pointBaseCurrency = computed(() => user.value?.pointsConfig?.pointBaseCurrency || "USD")
  const walletCurrency = computed(() =>
    user.value?.pointsConfig?.walletCurrency || user.value?.pointsConfig?.adsCurrency || "USD",
  )
  const walletExchangeRate = computed(() => Math.max(toNumber(user.value?.pointsConfig?.walletExchangeRate), 1))
  const formatterLocale = computed(() => locale.value === "vi" ? "vi-VN" : "en-US")
  const localizedCurrency = computed(() => user.value?.pointsConfig?.displayCurrency || "VND")
  const localizedExchangeRate = computed(() => {
    const displayRate = toNumber(user.value?.pointsConfig?.displayExchangeRate)
    if (displayRate > 1) return displayRate
    if (walletCurrency.value === "VND" && walletExchangeRate.value > 1) return walletExchangeRate.value
    return 0
  })
  const exchangeStepPoints = computed(() => pointsPerCurrencyUnit.value)
  const maxExchangePoints = computed(() =>
    Math.floor(pointsBalance.value / exchangeStepPoints.value) * exchangeStepPoints.value,
  )
  const maxExchangeAmount = computed(() => maxExchangePoints.value / pointsPerCurrencyUnit.value)
  const normalizedExchangePoints = computed(() =>
    Math.floor(toNumber(exchangePoints.value) / exchangeStepPoints.value) * exchangeStepPoints.value,
  )
  const exchangeAmount = computed(() => normalizedExchangePoints.value / pointsPerCurrencyUnit.value)
  const exchangeWalletAmount = computed(() => exchangeAmount.value * walletExchangeRate.value)
  const exchangeRateLabel = computed(() => `${formatNumber(pointsPerCurrencyUnit.value)} = ${formatPointCurrency(1)}`)
  const canSubmitExchange = computed(() =>
    normalizedExchangePoints.value >= exchangeStepPoints.value
    && normalizedExchangePoints.value <= maxExchangePoints.value
    && normalizedExchangePoints.value === exchangePoints.value,
  )
  const progressWidth = computed(() => {
    if (pointsBalance.value <= 0) return 0
    return Math.min(100, Math.round((maxExchangePoints.value / pointsBalance.value) * 100))
  })

  const historyItems = computed<HistoryItem[]>(() => {
    return walletTransactions.value
      .filter(transaction => ["POINTS_EXCHANGE", "POINTS_EARNED", "POINTS_DEDUCT"].includes(transaction.kind))
      .map((transaction) => {
        const points = Math.abs(Math.trunc(toNumber(transaction.points)))
        const signedPoints = transaction.kind === "POINTS_EXCHANGE" || transaction.kind === "POINTS_DEDUCT"
          ? 0 - points
          : points

        return {
          id: `wallet-${transaction.id}`,
          title: pointHistoryTitle(transaction, points),
          meta: formatDate(transaction.transactionDate),
          points: signedPoints,
        }
      })
      .slice(0, 12)
  })

  watch(maxExchangePoints, (value) => {
    if (value < exchangeStepPoints.value) {
      exchangePoints.value = exchangeStepPoints.value
      return
    }

    if (exchangePoints.value > value) {
      exchangePoints.value = value
    }
  }, { immediate: true })

  onMounted(() => {
    void loadWalletHistory()
  })

  function formatNumber(value: number) {
    return new Intl.NumberFormat(formatterLocale.value, { maximumFractionDigits: 0 }).format(value)
  }

  function formatSignedPoints(value: number) {
    const sign = value > 0 ? "+" : value < 0 ? "-" : ""
    return `${sign}${formatNumber(Math.abs(value))}`
  }

  function formatMoney(value: number, sourceCurrency: string) {
    const displayCurrency = locale.value === "vi" ? localizedCurrency.value : "USD"
    let displayValue = value

    if (sourceCurrency === displayCurrency) {
      displayValue = value
    }
    else if (sourceCurrency === "USD" && displayCurrency === "VND" && localizedExchangeRate.value > 0) {
      displayValue = value * localizedExchangeRate.value
    }
    else if (sourceCurrency === "VND" && displayCurrency === "USD" && localizedExchangeRate.value > 0) {
      displayValue = value / localizedExchangeRate.value
    }
    else if (sourceCurrency === walletCurrency.value && displayCurrency === "USD" && walletExchangeRate.value > 0) {
      displayValue = value / walletExchangeRate.value
    }
    else if (sourceCurrency === "USD" && displayCurrency === walletCurrency.value && walletExchangeRate.value > 0) {
      displayValue = value * walletExchangeRate.value
    }

    try {
      return new Intl.NumberFormat(formatterLocale.value, {
        style: "currency",
        currency: displayCurrency,
        maximumFractionDigits: displayCurrency === "VND" ? 0 : 2,
      }).format(displayValue)
    }
    catch {
      const symbol = displayCurrency === localizedCurrency.value
        ? user.value?.pointsConfig?.displayCurrencySymbol || localizedCurrency.value
        : "$"
      return `${formatNumber(displayValue)} ${symbol}`
    }
  }

  function formatPointCurrency(value: number) {
    return formatMoney(value, pointBaseCurrency.value)
  }

  function formatWalletCurrency(value: number) {
    return formatMoney(value, walletCurrency.value)
  }

  function formatDate(value: string) {
    if (!value) return t("settings.data.pointsPanel.justNow")
    const date = new Date(value.replace(" ", "T"))
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(formatterLocale.value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  async function loadWalletHistory() {
    try {
      const overview = await walletRepository.getOverview()
      walletTransactions.value = overview.transactions
    }
    catch {
      walletTransactions.value = []
    }
  }

  function pointHistoryTitle(transaction: WalletTransaction, points: number) {
    if (transaction.kind === "POINTS_EXCHANGE") {
      return t("settings.data.pointsPanel.exchangeHistoryTitle", { points: formatNumber(points) })
    }

    if (transaction.kind === "POINTS_DEDUCT") {
      return t("settings.data.pointsPanel.deductHistoryTitle", { points: formatNumber(points) })
    }

    const typeKey = transaction.pointType || transaction.notes || ""
    const translatedType = typeKey
      ? t(`settings.data.pointsPanel.pointTypes.${typeKey}`, typeKey)
      : t("settings.data.pointsPanel.defaultEarnedType")

    return t("settings.data.pointsPanel.earnedHistoryTitle", {
      points: formatNumber(points),
      type: translatedType,
    })
  }

  function openExchangeModal() {
    exchangeError.value = ""
    statusMessage.value = ""
    exchangePoints.value = exchangeStepPoints.value
    isExchangeModalOpen.value = true
  }

  function closeExchangeModal() {
    isExchangeModalOpen.value = false
    exchangeError.value = ""
  }

  async function submitExchange() {
    exchangeError.value = ""

    if (!canSubmitExchange.value) {
      exchangeError.value = t("settings.data.pointsPanel.invalidPoints", { step: formatNumber(exchangeStepPoints.value) })
      return
    }

    isSubmitting.value = true

    try {
      const result = await onExchange(normalizedExchangePoints.value)

      statusMessage.value = result.message || t("settings.data.pointsPanel.exchangeSuccess")
      closeExchangeModal()
      toast.add({
        title: t("settings.data.pointsPanel.exchangeSuccess"),
        description: statusMessage.value,
        color: "success",
        icon: "i-ph-check-circle-fill",
      })
      void loadWalletHistory()
    }
    catch (error) {
      exchangeError.value = error instanceof Error ? error.message : t("settings.data.pointsPanel.exchangeError")
    }
    finally {
      isSubmitting.value = false
    }
  }

  return {
    t,
    pointsBalance,
    walletBalance,
    exchangeStepPoints,
    maxExchangePoints,
    maxExchangeAmount,
    normalizedExchangePoints,
    exchangeAmount,
    exchangeWalletAmount,
    exchangeRateLabel,
    canSubmitExchange,
    progressWidth,
    historyItems,
    isExchangeModalOpen,
    exchangePoints,
    exchangeError,
    isSubmitting,
    formatNumber,
    formatSignedPoints,
    formatPointCurrency,
    formatWalletCurrency,
    loadWalletHistory,
    openExchangeModal,
    closeExchangeModal,
    submitExchange,
  }
}
