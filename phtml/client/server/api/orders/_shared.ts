// English description: Order API bridge helpers that normalize PHP marketplace order responses.

import { createError, type H3Event } from "h3"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import type { BuyerOrder, BuyerOrderStatus, SellerOrder, SellerOrderTask } from "../../../src/orders/domain/types/orders.types"

type BackendOrderProduct = {
  id?: number | string
  name?: string
  price?: number | string
  images?: Array<string | { image?: string; image_org?: string }>
  user_data?: { name?: string; username?: string }
  seller?: { name?: string; username?: string }
}

type BackendOrderRow = {
  id?: number | string
  product_id?: number | string
  price?: number | string
  units?: number | string
  status?: string
  time?: number | string
  tracking_id?: string
  tracking_url?: string
  product?: BackendOrderProduct
  address?: {
    name?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    zip?: string
  }
}

export type BackendPurchase = {
  id?: number | string
  order_hash_id?: string
  price?: number | string
  final_price?: number | string
  time?: number | string
  date?: string
  orders?: BackendOrderRow[]
}

type BackendPurchaseResponse = {
  api_status?: number | string
  data?: BackendPurchase[]
  message?: string
  errors?: { error_text?: string }
}

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return fallback
}

const toStatus = (status: unknown): BuyerOrderStatus => {
  switch (asString(status).toLowerCase()) {
    case "accepted":
    case "packed":
    case "shipped":
      return "shipping"
    case "delivered":
      return "delivered"
    case "canceled":
    case "cancelled":
      return "cancelled"
    case "placed":
    default:
      return "pending"
  }
}

const normalizeImageStyle = (event: H3Event, product: BackendOrderProduct | undefined) => {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const firstImage = Array.isArray(product?.images) ? product?.images[0] : undefined
  const image = typeof firstImage === "string" ? firstImage : firstImage?.image_org || firstImage?.image
  const imageUrl = resolveMediaUrl(image)

  return imageUrl ? `url('${imageUrl}')` : undefined
}

const getPrimaryOrder = (purchase: BackendPurchase) =>
  Array.isArray(purchase.orders) ? purchase.orders[0] : undefined

const getSellerName = (order: BackendOrderRow | undefined) =>
  asString(order?.product?.seller?.name)
  || asString(order?.product?.user_data?.name)
  || asString(order?.product?.seller?.username)
  || asString(order?.product?.user_data?.username)
  || "Seller"

const getAddressText = (order: BackendOrderRow | undefined) => {
  const address = order?.address

  if (!address) return ""

  return [address.address, address.city, address.country, address.zip]
    .map(item => asString(item))
    .filter(Boolean)
    .join(", ")
}

const buildTimeline = (placedAt: string, status: BuyerOrderStatus) => {
  const progress = status === "delivered" ? 4 : status === "shipping" ? 3 : 1

  return [
    {
      key: "created",
      label: "orders.steps.placed.label",
      time: placedAt,
      description: "orders.steps.placed.description",
      done: progress >= 1,
    },
    {
      key: "confirmed",
      label: "orders.steps.processing.label",
      time: progress >= 2 ? placedAt : "",
      description: "orders.steps.processing.description",
      done: progress >= 2,
    },
    {
      key: "shipping",
      label: "orders.steps.shipping.label",
      time: progress >= 3 ? placedAt : "",
      description: "orders.steps.shipping.description",
      done: progress >= 3,
    },
    {
      key: "delivered",
      label: "orders.steps.completed.label",
      time: progress >= 4 ? placedAt : "",
      description: "orders.steps.completed.description",
      done: progress >= 4,
    },
  ]
}

export const normalizeBuyerOrder = (event: H3Event, purchase: BackendPurchase): BuyerOrder => {
  const primaryOrder = getPrimaryOrder(purchase)
  const status = toStatus(primaryOrder?.status)
  const placedAt = asString(purchase.date) || asString(purchase.time)
  const items = (purchase.orders ?? []).map(order => ({
    id: asString(order.product_id || order.id),
    name: asString(order.product?.name, "Product"),
    quantity: Math.max(1, asNumber(order.units, 1)),
    price: asNumber(order.price || order.product?.price),
    imageStyle: normalizeImageStyle(event, order.product),
  }))

  return {
    id: asString(purchase.order_hash_id || purchase.id),
    orderNumber: asString(purchase.order_hash_id || purchase.id),
    seller: getSellerName(primaryOrder),
    placedAt,
    deliveryWindow: placedAt,
    paymentMethod: "Wallet",
    paymentReference: asString(purchase.order_hash_id || purchase.id),
    shippingAddress: getAddressText(primaryOrder),
    recipientName: asString(primaryOrder?.address?.name),
    recipientPhone: asString(primaryOrder?.address?.phone),
    shippingProvider: "",
    trackingCode: asString(primaryOrder?.tracking_id),
    status,
    paymentStatus: status === "cancelled" ? "refunded" : "paid",
    shippingFee: 0,
    total: asNumber(purchase.price),
    items,
    timeline: buildTimeline(placedAt, status),
  }
}

export const normalizeSellerOrder = (event: H3Event, purchase: BackendPurchase): SellerOrder => {
  const buyerOrder = normalizeBuyerOrder(event, purchase)
  const tasks: SellerOrderTask[] = [
    {
      key: "payment",
      label: "orders.tasks.payment",
      description: "orders.tasks.paymentDescription",
      done: true,
    },
    {
      key: "packing",
      label: "orders.tasks.packing",
      description: "orders.tasks.packingDescription",
      done: buyerOrder.status !== "pending",
    },
    {
      key: "handoff",
      label: "orders.tasks.handoff",
      description: "orders.tasks.handoffDescription",
      done: buyerOrder.status === "shipping" || buyerOrder.status === "delivered",
    },
  ]

  return {
    ...buyerOrder,
    storeName: buyerOrder.seller,
    buyerName: buyerOrder.recipientName,
    buyerPhone: buyerOrder.recipientPhone,
    buyerAddress: buyerOrder.shippingAddress,
    buyerNote: buyerOrder.note,
    sellerNote: "",
    tasks,
    payoutStatus: buyerOrder.status === "delivered" ? "released" : buyerOrder.status === "cancelled" ? "reversed" : "queued",
    payoutAmount: buyerOrder.total,
    payoutReference: buyerOrder.paymentReference,
    payoutWindow: buyerOrder.deliveryWindow,
  }
}

export const normalizePurchasedResponse = (event: H3Event, response: BackendPurchaseResponse) => {
  const status = Number(response.api_status ?? 0)

  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: response.errors?.error_text || response.message || "Unable to load orders.",
    })
  }

  return (Array.isArray(response.data) ? response.data : []).map(purchase => normalizeBuyerOrder(event, purchase))
}

export const findPurchase = (purchases: BackendPurchase[], id: string) =>
  purchases.find(purchase => asString(purchase.order_hash_id || purchase.id) === id) ?? null

export const assertBackendOk = (response: { api_status?: number | string; message?: string; errors?: { error_text?: string } }) => {
  const status = Number(response.api_status ?? 0)

  if (status < 200 || status >= 300) {
    throw createError({
      statusCode: 400,
      statusMessage: response.errors?.error_text || response.message || "Unable to update order.",
    })
  }
}
