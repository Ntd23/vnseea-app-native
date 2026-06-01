import type { ShippingAddress } from "../../domain/types/checkout.types"

export const loadShippingAddress = (storageKey: string): ShippingAddress | null => {
  if (typeof localStorage === "undefined") {
    return null
  }

  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as ShippingAddress
  }
  catch {
    return null
  }
}

export const saveShippingAddress = (storageKey: string, address: ShippingAddress) => {
  if (typeof localStorage === "undefined") {
    return
  }

  localStorage.setItem(storageKey, JSON.stringify(address))
}
