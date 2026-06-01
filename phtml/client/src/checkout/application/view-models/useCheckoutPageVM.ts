// English description: Checkout page view model that coordinates cart, address, wallet balance, and submit actions.

import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type { SavedShippingAddress } from "../../domain/types/checkout.types"
import { createCheckoutSnapshot } from "../use-cases/create-checkout-snapshot"
import { createApiCheckoutRepository } from "../../infrastructure/repositories/ApiCheckoutRepository"

const cloneSnapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function useCheckoutPageVM(
  repository = createApiCheckoutRepository(),
) {
  const { t, locale } = useI18n()
  const toast = useToast()

  const { data: initialSnapshot, pending: isLoading } = useAsyncData(
    "checkout:snapshot",
    () => repository.getSnapshot(),
    {
      default: () => createCheckoutSnapshot(),
      server: false,
    },
  )

  const snapshot = ref(cloneSnapshot(createCheckoutSnapshot()))
  const checkoutState = ref<"idle" | "loading" | "success" | "error">("idle")

  watch(
    () => initialSnapshot.value,
    (value) => {
      snapshot.value = cloneSnapshot(value ?? createCheckoutSnapshot())

      // Restore active address from localStorage if available on the client side
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("checkout:active-address")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed && typeof parsed === "object") {
              snapshot.value.shippingAddress = parsed
            }
          } catch {
            // noop
          }
        }
      }
    },
    { immediate: true },
  )

  const cartItems = computed(() => snapshot.value.items)
  const savedAddress = computed<SavedShippingAddress | null>(() =>
    snapshot.value.shippingAddress ? { ...snapshot.value.shippingAddress } : null,
  )
  const walletBalance = computed(() => snapshot.value.walletBalance)
  const shippingFee = computed(() => snapshot.value.shippingFee)

  const subtotal = computed(() =>
    snapshot.value.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  const total = computed(() => subtotal.value + snapshot.value.shippingFee)
  const walletShortage = computed(() => Math.max(total.value - snapshot.value.walletBalance, 0))
  const hasSavedAddress = computed(() => Boolean(snapshot.value.shippingAddress))
  const hasItems = computed(() => snapshot.value.items.length > 0)

  const checkoutStepCount = 3
  const readyStepCount = computed(() =>
    [
      hasSavedAddress.value,
      snapshot.value.items.length > 0,
      walletShortage.value === 0,
    ].filter(Boolean).length,
  )

  const progressValue = computed(() => (readyStepCount.value / checkoutStepCount) * 100)
  const progressText = computed(() =>
    t("checkout.page.progressStatus", {
      ready: readyStepCount.value,
      total: checkoutStepCount,
    }),
  )

  async function handleAddressSubmit(address: SavedShippingAddress) {
    const saved = await repository.saveShippingAddress(address)
    snapshot.value.shippingAddress = { ...saved }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("checkout:active-address", JSON.stringify(saved))
    }
    resetCheckoutState()
  }

  async function increaseQuantity(itemId: string) {
    const item = snapshot.value.items.find(entry => entry.id === itemId)

    if (!item) {
      return
    }

    // Optimistic UI update
    item.quantity += 1
    resetCheckoutState()

    try {
      await repository.updateCartItemQuantity(itemId, item.quantity)
    } catch (err) {
      // Revert if error occurs
      item.quantity -= 1
      resetCheckoutState()
      toast.add({
        title: t("checkout.summary.purchaseErrorTitle"),
        description: t("checkout.summary.purchaseErrorDescription"),
        color: "red",
      })
    }
  }

  async function decreaseQuantity(itemId: string) {
    const item = snapshot.value.items.find(entry => entry.id === itemId)

    if (!item) {
      return
    }

    const originalQty = item.quantity

    if (item.quantity <= 1) {
      await removeItem(itemId)
    } else {
      // Optimistic UI update
      item.quantity -= 1
      resetCheckoutState()

      try {
        await repository.updateCartItemQuantity(itemId, item.quantity)
      } catch (err) {
        // Revert if error occurs
        item.quantity = originalQty
        resetCheckoutState()
        toast.add({
          title: t("checkout.summary.purchaseErrorTitle"),
          description: t("checkout.summary.purchaseErrorDescription"),
          color: "red",
        })
      }
    }
  }

  async function removeItem(itemId: string) {
    const originalItems = cloneSnapshot(snapshot.value.items)

    // Optimistic UI update
    snapshot.value.items = snapshot.value.items.filter(entry => entry.id !== itemId)
    resetCheckoutState()

    try {
      await repository.removeCartItem(itemId)
    } catch (err) {
      // Revert if error occurs
      snapshot.value.items = originalItems
      resetCheckoutState()
      toast.add({
        title: t("checkout.summary.purchaseErrorTitle"),
        description: t("checkout.summary.purchaseErrorDescription"),
        color: "red",
      })
    }
  }

  async function handleCheckoutAction() {
    if (!snapshot.value.items.length) {
      return
    }

    if (!snapshot.value.shippingAddress) {
      checkoutState.value = "error"

      toast.add({
        title: t("checkout.summary.addressRequiredTitle"),
        description: t("checkout.summary.addressRequiredDescription"),
        color: "warning",
      })

      return
    }

    if (walletShortage.value > 0) {
      toast.add({
        title: t("checkout.summary.walletShortageTitle"),
        description: t("checkout.summary.walletShortageDescription", {
          amount: formatVnd(walletShortage.value),
        }),
        color: "warning",
      })

      checkoutState.value = "error"
      return
    }

    checkoutState.value = "loading"

    try {
      await repository.submitOrder(cloneSnapshot(snapshot.value))
      checkoutState.value = "success"

      // Trigger Confetti Celebration (client-only dynamic import)
      if (typeof window !== "undefined") {
        try {
          const confettiModule = await import("@hiseb/confetti")
          const confetti = confettiModule.default
          
          // Fire a beautiful sequence of 3 confetti bursts
          const positionList = [
            { x: window.innerWidth * 0.50, y: window.innerHeight * 0.60 },
            { x: window.innerWidth * 0.25, y: window.innerHeight * 0.40 },
            { x: window.innerWidth * 0.75, y: window.innerHeight * 0.30 },
          ]
          for (let i = 0; i < positionList.length; i++) {
            setTimeout(() => confetti({ position: positionList[i] }), i * 250)
          }
        } catch (e) {
          // ignore confetti errors
        }

        // Wait 3.5 seconds for confetti animation, then navigate to purchased page
        setTimeout(async () => {
          await navigateTo("/purchased")
        }, 3500)
      }
    }
    catch {
      checkoutState.value = "error"
      toast.add({
        title: t("checkout.summary.purchaseErrorTitle"),
        description: t("checkout.summary.purchaseErrorDescription"),
        color: "red",
      })
    }
  }

  function resetCheckoutState() {
    if (checkoutState.value !== "loading") {
      checkoutState.value = "idle"
    }
  }

  function formatVnd(value: number) {
    return formatCurrency(value, {
      currency: "VND",
      locale: locale.value,
    })
  }

  function selectAddress(address: SavedShippingAddress) {
    snapshot.value.shippingAddress = { ...address }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("checkout:active-address", JSON.stringify(address))
    }
  }

  async function deleteAddress(addressId: string) {
    await repository.deleteAddress(addressId)
    if (snapshot.value.shippingAddress && String(snapshot.value.shippingAddress.id) === String(addressId)) {
      snapshot.value.shippingAddress = null
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("checkout:active-address")
      }
    }
    resetCheckoutState()
  }

  async function fetchSavedAddresses() {
    return await repository.getAddresses()
  }

  return {
    isLoading,
    cartItems,
    savedAddress,
    walletBalance,
    shippingFee,
    checkoutState,
    progressText,
    progressValue,
    hasSavedAddress,
    hasItems,
    handleAddressSubmit,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    handleCheckoutAction,
    selectAddress,
    deleteAddress,
    fetchSavedAddresses,
  }
}
