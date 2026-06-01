import type { ShippingAddress } from "../types/checkout.types"

const required = (value: string) => value.trim().length > 0

export const validateShippingAddress = (address: ShippingAddress) => {
  const errors: string[] = []

  if (!required(address.fullName)) errors.push("Full name is required")
  if (!required(address.phone)) errors.push("Phone is required")
  if (!required(address.country)) errors.push("Country is required")
  if (!required(address.city)) errors.push("City is required")
  if (!required(address.postalCode)) errors.push("Postal code is required")
  if (!required(address.streetAddress)) errors.push("Street address is required")

  return {
    valid: errors.length === 0,
    errors,
  }
}
