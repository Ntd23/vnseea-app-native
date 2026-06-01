// English description: Owns wallet overview loading, recipient lookup, QR generation, send money, and top-up mutations.

import { createApiWalletRepository } from "../../infrastructure/repositories/ApiWalletRepository"
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { WalletRepository } from "../../domain/repositories/WalletRepository"
import type {
  WalletMutationResult,
  WalletOverview,
  WalletReceiveQr,
  WalletRecipient,
  WalletSendDraft,
  WalletTopupDraft,
} from "../../domain/types/wallet.types"

const EMPTY_WALLET: WalletOverview = {
  balance: 0,
  withdrawableBalance: 0,
  currency: "",
  currencySymbol: "",
  currencyRule: {},
  transactions: [],
  topupMethods: [],
  canWithdraw: false,
  withdrawalUrl: "/withdrawal",
  currentUser: {
    id: 0,
    name: "",
    username: "",
    avatarUrl: "",
  },
}

const toErrorMessage = (error: unknown, defaultMessage: string) =>
  error instanceof Error && error.message ? error.message : defaultMessage

const walletActivityKindsToHide = new Set(["POINTS_EARNED", "POINTS_DEDUCT"])

export function useWalletPageVM(
  repository: WalletRepository = createApiWalletRepository(),
) {
  const { t, locale } = useI18n()
  const sendModalOpen = ref(false)
  const topupFormOpen = ref(false)
  const receiveQrOpen = ref(false)
  const receiveAmount = ref<number | null>(null)
  const selectedTopupMethod = ref("")
  const recipientResults = ref<WalletRecipient[]>([])
  const recipientSearching = ref(false)
  const receiveQr = ref<WalletReceiveQr | null>(null)
  const sepayTopup = ref<WalletMutationResult | null>(null)
  const mutationError = ref("")
  const mutationMessage = ref("")
  const sending = ref(false)
  const toppingUp = ref(false)

  const { data, status, error, refresh } = useAsyncData(
    "wallet:overview",
    () => repository.getOverview(),
    {
      default: () => EMPTY_WALLET,
    },
  )

  const loading = computed(() => status.value === "pending")
  const errorMessage = computed(() =>
    error.value ? toErrorMessage(error.value, t("pages.walletPage.loadError")) : "",
  )
  const overview = computed(() => data.value)
  const walletActivityTransactions = computed(() =>
    overview.value.transactions.filter(transaction =>
      !walletActivityKindsToHide.has(transaction.kind.toUpperCase()),
    ),
  )
  const uploadTopupMethod = computed(() =>
    overview.value.topupMethods.find(method => method.type === "upload") ?? null,
  )
  const redirectTopupMethods = computed(() =>
    overview.value.topupMethods.filter(method => method.type === "redirect"),
  )
  const formattedSepayAmount = computed(() =>
    formatCurrency(sepayTopup.value?.amount ?? 0, {
      currency: overview.value.currency,
      currencySymbol: overview.value.currencySymbol,
      currencyRule: overview.value.currencyRule,
      locale: locale.value,
    }),
  )
  const mbBankLogoUrl = "https://cdn.vietqr.io/img/MB.png"
  const sepayBankName = computed(() => {
    const bankCode = sepayTopup.value?.bankCode?.replace(/\s+/g, "").toUpperCase()
    if (bankCode === "MB" || bankCode === "MBBANK") {
      return "Ngân hàng TMCP Quân Đội"
    }

    return sepayTopup.value?.bankCode || "-"
  })

  watch(
    () => overview.value.topupMethods,
    (methods) => {
      if (!selectedTopupMethod.value && methods.length) {
        selectedTopupMethod.value = methods[0].value
      }

      if (selectedTopupMethod.value && !methods.some(method => method.value === selectedTopupMethod.value)) {
        selectedTopupMethod.value = methods[0]?.value ?? ""
      }
    },
    { immediate: true },
  )

  function resetMutationState() {
    mutationError.value = ""
    mutationMessage.value = ""
  }

  function openSendModal() {
    resetMutationState()
    topupFormOpen.value = false
    receiveQrOpen.value = false
    sendModalOpen.value = true
  }

  function closeSendModal() {
    sendModalOpen.value = false
    recipientResults.value = []
  }

  function openTopupForm() {
    resetMutationState()
    sendModalOpen.value = false
    receiveQrOpen.value = false
    topupFormOpen.value = true
  }

  function closeTopupForm() {
    topupFormOpen.value = false
    sepayTopup.value = null
  }

  function toggleTopupForm() {
    resetMutationState()
    topupFormOpen.value = !topupFormOpen.value
  }

  async function openReceiveQr(amount?: number | null) {
    resetMutationState()
    sendModalOpen.value = false
    topupFormOpen.value = false
    try {
      receiveQr.value = await repository.getReceiveQr(amount)
      receiveQrOpen.value = true
    }
    catch (qrError) {
      mutationError.value = toErrorMessage(qrError, t("pages.walletPage.loadError"))
    }
  }

  function closeReceiveQr() {
    receiveQrOpen.value = false
  }

  async function searchRecipients(query: string) {
    const normalized = query.trim()

    if (normalized.length < 2 && !/^\d+$/.test(normalized)) {
      recipientResults.value = []
      return
    }

    recipientSearching.value = true

    try {
      recipientResults.value = await repository.searchRecipients(normalized)
    }
    catch {
      recipientResults.value = []
    }
    finally {
      recipientSearching.value = false
    }
  }

  async function sendMoney(input: WalletSendDraft) {
    sending.value = true
    resetMutationState()

    try {
      const result = await repository.sendMoney(input)
      mutationMessage.value = result.message
      await refresh()
      closeSendModal()
    }
    catch (sendError) {
      mutationError.value = toErrorMessage(sendError, t("pages.walletPage.sendError"))
    }
    finally {
      sending.value = false
    }
  }

  async function createTopup(input: WalletTopupDraft) {
    toppingUp.value = true
    resetMutationState()

    try {
      const result: WalletMutationResult = await repository.createTopup(input)

      if (result.redirectUrl) {
        await navigateTo(result.redirectUrl, { external: true })
        return
      }

      if (result.qrUrl) {
        sepayTopup.value = result
        mutationMessage.value = t("pages.walletPage.sepayCreated")
        return
      }

      mutationMessage.value = result.message
      await refresh()
      topupFormOpen.value = false
    }
    catch (topupError) {
      mutationError.value = toErrorMessage(topupError, t("pages.walletPage.topupError"))
    }
    finally {
      toppingUp.value = false
    }
  }

  async function checkSepayTopup() {
    if (!sepayTopup.value?.orderCode) return

    toppingUp.value = true
    resetMutationState()

    try {
      const result = await repository.checkSepayTopup(sepayTopup.value.orderCode)
      sepayTopup.value = {
        ...sepayTopup.value,
        ...result,
      }

      if (result.paid) {
        mutationMessage.value = t("pages.walletPage.sepayPaid")
        topupFormOpen.value = false
        sepayTopup.value = null
        await refresh()
        return
      }

      mutationMessage.value = t("pages.walletPage.sepayPending")
    }
    catch (checkError) {
      mutationError.value = toErrorMessage(checkError, t("pages.walletPage.sepayCheckError"))
    }
    finally {
      toppingUp.value = false
    }
  }

  const copySepayValue = async (value?: string | number | null) => {
    const text = String(value ?? "").trim()
    if (!text || typeof navigator === "undefined" || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
  }

  return {
    overview,
    walletActivityTransactions,
    loading,
    errorMessage,
    sendModalOpen,
    topupFormOpen,
    receiveQrOpen,
    receiveAmount,
    selectedTopupMethod,
    recipientResults,
    recipientSearching,
    receiveQr,
    sepayTopup,
    formattedSepayAmount,
    mbBankLogoUrl,
    sepayBankName,
    mutationError,
    mutationMessage,
    sending,
    toppingUp,
    uploadTopupMethod,
    redirectTopupMethods,
    openSendModal,
    closeSendModal,
    openTopupForm,
    closeTopupForm,
    toggleTopupForm,
    openReceiveQr,
    closeReceiveQr,
    searchRecipients,
    sendMoney,
    createTopup,
    checkSepayTopup,
    copySepayValue,
    refresh,
  }
}
