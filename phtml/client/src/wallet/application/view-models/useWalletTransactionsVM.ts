// English description: ViewModel for wallet activity filtering, pagination, labels, and transaction display metadata.

import { toValue, type MaybeRefOrGetter } from "vue"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type {
  WalletCurrencyRule,
  WalletTransaction,
} from "../../domain/types/wallet.types"

type WalletTransactionFilter =
  | "all"
  | "received"
  | "sent"
  | "wallet"
  | "points_exchange"
  | "sale"
  | "donate"
  | "other"

type WalletTransactionFilterItem = {
  value: WalletTransactionFilter
  label: string
  icon: string
  count: number
}

const pageSize = 10

const transactionKind = (transaction: WalletTransaction) =>
  transaction.kind.toUpperCase()

const transactionGroup = (transaction: WalletTransaction): WalletTransactionFilter => {
  const kind = transactionKind(transaction)

  if (kind === "RECEIVED") return "received"
  if (kind === "SENT") return "sent"
  if (kind === "WALLET") return "wallet"
  if (kind === "POINTS_EXCHANGE") return "points_exchange"
  if (kind === "SALE" || kind === "SALES") return "sale"
  if (kind === "DONATE") return "donate"
  return "other"
}

export function useWalletTransactionsVM(
  transactionsSource: MaybeRefOrGetter<WalletTransaction[]>,
  currencySource: MaybeRefOrGetter<string>,
  currencySymbolSource: MaybeRefOrGetter<string>,
  currencyRuleSource: MaybeRefOrGetter<WalletCurrencyRule>,
) {
  const { t, locale } = useI18n()
  const currentPage = ref(1)
  const activeFilter = ref<WalletTransactionFilter>("all")
  const transactions = computed(() => toValue(transactionsSource))
  const currency = computed(() => toValue(currencySource))
  const currencySymbol = computed(() => toValue(currencySymbolSource))
  const currencyRule = computed(() => toValue(currencyRuleSource))

  const countByFilter = (value: WalletTransactionFilter) =>
    value === "all"
      ? transactions.value.length
      : transactions.value.filter(transaction => transactionGroup(transaction) === value).length

  const filters = computed<WalletTransactionFilterItem[]>(() => [
    { value: "all", label: t("pages.walletPage.filterAll"), icon: "i-ph-list-bullets-duotone", count: countByFilter("all") },
    { value: "received", label: t("pages.walletPage.filterReceived"), icon: "i-ph-hand-coins-duotone", count: countByFilter("received") },
    { value: "sent", label: t("pages.walletPage.filterSent"), icon: "i-ph-paper-plane-tilt-duotone", count: countByFilter("sent") },
    { value: "wallet", label: t("pages.walletPage.filterTopup"), icon: "i-ph-wallet-duotone", count: countByFilter("wallet") },
    { value: "points_exchange", label: t("pages.walletPage.filterPointsExchange"), icon: "i-ph-star-duotone", count: countByFilter("points_exchange") },
    { value: "sale", label: t("pages.walletPage.filterSale"), icon: "i-ph-storefront-duotone", count: countByFilter("sale") },
    { value: "donate", label: t("pages.walletPage.filterDonate"), icon: "i-ph-heart-duotone", count: countByFilter("donate") },
  ])

  const filteredTransactions = computed(() =>
    activeFilter.value === "all"
      ? transactions.value
      : transactions.value.filter(transaction => transactionGroup(transaction) === activeFilter.value),
  )

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(filteredTransactions.value.length / pageSize)),
  )

  const paginatedTransactions = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredTransactions.value.slice(start, start + pageSize)
  })

  watch([filteredTransactions, () => transactions.value.length], () => {
    if (currentPage.value > pageCount.value) {
      currentPage.value = pageCount.value
    }
  })

  function setFilter(value: WalletTransactionFilter) {
    activeFilter.value = value
    currentPage.value = 1
  }

  function previousPage() {
    currentPage.value = Math.max(1, currentPage.value - 1)
  }

  function nextPage() {
    currentPage.value = Math.min(pageCount.value, currentPage.value + 1)
  }

  const transactionDirection = (transaction: WalletTransaction) => {
    const group = transactionGroup(transaction)

    if (["sent", "donate"].includes(group)) return "out"
    if (transactionKind(transaction) === "PURCHASE") return "out"
    if (["received", "wallet", "points_exchange", "sale"].includes(group)) return "in"
    if (transaction.amount < 0) return "out"
    if (transaction.amount > 0) return "in"
    return "neutral"
  }

  const formatTransactionAmount = (transaction: WalletTransaction) => {
    const direction = transactionDirection(transaction)
    const formatted = formatCurrency(Math.abs(transaction.amount), {
      currency: currency.value,
      currencySymbol: currencySymbol.value,
      currencyRule: currencyRule.value,
      locale: locale.value,
    })

    if (direction === "in") return `+${formatted}`
    if (direction === "out") return `-${formatted}`
    return formatted
  }

  const transactionCounterparty = (transaction: WalletTransaction) =>
    transaction.counterpartyName || (transaction.counterpartyId ? `#${transaction.counterpartyId}` : "-")

  const transactionTitle = (transaction: WalletTransaction) => {
    const kind = transactionKind(transaction)
    const counterparty = transactionCounterparty(transaction)

    if (kind === "RECEIVED") return t("pages.walletPage.transactionReceivedTitle", { sender: counterparty })
    if (kind === "SENT") return t("pages.walletPage.transactionSentTitle", { recipient: counterparty })
    if (kind === "SALE" || kind === "SALES") return t("pages.walletPage.transactionSaleTitle")
    if (kind === "DONATE") return t("pages.walletPage.transactionDonateTitle")
    if (kind === "WALLET") return t("pages.walletPage.transactionWalletTitle")
    if (kind === "POINTS_EXCHANGE") return t("pages.walletPage.transactionPointsExchangeTitle")

    return transaction.notes || transaction.kind || "-"
  }

  const transactionDetail = (transaction: WalletTransaction) => {
    const kind = transactionKind(transaction)

    if (kind === "RECEIVED" || kind === "SENT") return transaction.notes || "-"
    if (kind === "SALE" || kind === "SALES") return transaction.notes || t("pages.walletPage.transactionSaleDescription")
    if (kind === "DONATE") {
      return transaction.notes
        ? t("pages.walletPage.transactionDonateDescription", { campaign: transaction.notes })
        : t("pages.walletPage.transactionDonateFallback")
    }
    if (kind === "WALLET") return transaction.notes || t("pages.walletPage.transactionWalletDescription")
    if (kind === "POINTS_EXCHANGE") {
      return transaction.points
        ? t("pages.walletPage.transactionPointsExchangeDescription", { points: transaction.points })
        : t("pages.walletPage.transactionPointsExchangeFallback")
    }

    return transaction.kind || "-"
  }

  const amountClass = (transaction: WalletTransaction) => {
    const direction = transactionDirection(transaction)

    if (direction === "in") return "wallet-activity__amount--positive"
    if (direction === "out") return "wallet-activity__amount--negative"
    return ""
  }

  const transactionIcon = (transaction: WalletTransaction) => {
    const kind = transactionKind(transaction)

    if (kind === "RECEIVED") return "i-ph-hand-coins-duotone"
    if (kind === "SENT") return "i-ph-paper-plane-tilt-duotone"
    if (kind === "WALLET") return transaction.notes.toLowerCase().includes("sepay")
      ? "i-ph-qr-code-duotone"
      : "i-ph-wallet-duotone"
    if (kind === "POINTS_EXCHANGE") return "i-ph-star-duotone"
    if (kind === "SALE" || kind === "SALES") return "i-ph-storefront-duotone"
    if (kind === "DONATE") return "i-ph-heart-duotone"
    if (kind === "PRO") return "i-ph-crown-duotone"
    if (kind === "PURCHASE") return "i-ph-shopping-bag-duotone"
    return "i-ph-receipt-duotone"
  }

  const transactionIconClass = (transaction: WalletTransaction) =>
    `wallet-activity__icon--${transactionGroup(transaction)}`

  return {
    activeFilter,
    currentPage,
    filters,
    filteredTransactions,
    paginatedTransactions,
    pageCount,
    setFilter,
    previousPage,
    nextPage,
    formatTransactionAmount,
    transactionTitle,
    transactionDetail,
    amountClass,
    transactionIcon,
    transactionIconClass,
  }
}
