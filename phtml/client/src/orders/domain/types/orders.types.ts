// English description: Order domain types and metadata shared by order presentation and view models.

export type BuyerOrderStatus = "pending" | "shipping" | "delivered" | "cancelled"

export type BuyerOrderFilter = "all" | BuyerOrderStatus

export type BuyerOrderPaymentStatus = "paid" | "refunded"

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  imageStyle?: string
}
export interface OrderTimelineEntry {
  key: string
  label: string
  time: string
  description: string
  done: boolean
}

export interface OrderPresentationShape {
  status: BuyerOrderStatus
  paymentStatus: BuyerOrderPaymentStatus
  shippingFee: number
  total: number
  items: OrderItem[]
}

export interface BuyerOrderItem extends OrderItem {}

export interface BuyerOrderTimelineEntry extends OrderTimelineEntry {}

export interface BuyerOrder extends OrderPresentationShape {
  id: string
  orderNumber: string
  seller: string
  placedAt: string
  deliveryWindow: string
  paymentMethod: string
  paymentReference: string
  shippingAddress: string
  recipientName: string
  recipientPhone: string
  shippingProvider: string
  trackingCode: string
  note?: string
  items: BuyerOrderItem[]
  timeline: BuyerOrderTimelineEntry[]
}

export type SellerOrderPayoutStatus = "queued" | "processing" | "released" | "reversed"

export interface SellerOrderTask {
  key: string
  label: string
  description: string
  done: boolean
}

export interface SellerOrder extends OrderPresentationShape {
  id: string
  orderNumber: string
  storeName: string
  buyerName: string
  buyerPhone: string
  buyerAddress: string
  placedAt: string
  deliveryWindow: string
  paymentMethod: string
  paymentReference: string
  shippingProvider: string
  trackingCode: string
  buyerNote?: string
  sellerNote?: string
  timeline: OrderTimelineEntry[]
  tasks: SellerOrderTask[]
  payoutStatus: SellerOrderPayoutStatus
  payoutAmount: number
  payoutReference: string
  payoutWindow: string
}

export interface OrdersFilterOption {
  key: BuyerOrderFilter
  label: string
  count: number
}

export interface OrdersOverviewCard {
  label: string
  value: string
  description: string
  icon: string
  tone: "amber" | "blue" | "green" | "rose"
}

export const buyerOrderFilterLabels: Record<BuyerOrderFilter, string> = {
  all: "orders.filter.all",
  pending: "orders.status.pending.label",
  shipping: "orders.status.shipping.label",
  delivered: "orders.status.delivered.label",
  cancelled: "orders.status.cancelled.label",
}

export const buyerOrderStatusMeta: Record<BuyerOrderStatus, {
  label: string
  badgeClass: string
  panelClass: string
  icon: string
  progress: number
  description: string
}> = {
  pending: {
    label: "orders.status.pending.label",
    badgeClass: "border-[#fde7b2] bg-[#fff6dd] text-[#9a5b00]",
    panelClass: "bg-[#fff8ea] text-[#9a5b00]",
    icon: "i-ph-hourglass-medium-fill",
    progress: 1,
    description: "orders.status.pending.description",
  },
  shipping: {
    label: "orders.status.shipping.label",
    badgeClass: "border-[#cfe0ff] bg-[#eef4ff] text-[#1d4ed8]",
    panelClass: "bg-[#eef4ff] text-[#1d4ed8]",
    icon: "i-ph-truck-fill",
    progress: 2,
    description: "orders.status.shipping.description",
  },
  delivered: {
    label: "orders.status.delivered.label",
    badgeClass: "border-[#c7ebd0] bg-[#effaf3] text-[#1f7a38]",
    panelClass: "bg-[#effaf3] text-[#1f7a38]",
    icon: "i-ph-check-circle-fill",
    progress: 3,
    description: "orders.status.delivered.description",
  },
  cancelled: {
    label: "orders.status.cancelled.label",
    badgeClass: "border-[#fecdd3] bg-[#fff1f3] text-[#be123c]",
    panelClass: "bg-[#fff1f3] text-[#be123c]",
    icon: "i-ph-x-circle-fill",
    progress: 0,
    description: "orders.status.cancelled.description",
  },
}
export const buyerOrderPaymentStatusMeta: Record<BuyerOrderPaymentStatus, {
  label: string
  badgeClass: string
}> = {
  paid: {
    label: "orders.payment.paid",
    badgeClass: "border-[#c7ebd0] bg-[#effaf3] text-[#1f7a38]",
  },
  refunded: {
    label: "orders.payment.refunded",
    badgeClass: "border-[#fecdd3] bg-[#fff1f3] text-[#be123c]",
  },
}
export const sellerOrderPayoutStatusMeta: Record<SellerOrderPayoutStatus, {
  label: string
  badgeClass: string
  panelClass: string
  description: string
}> = {
  queued: {
    label: "orders.payout.queued.label",
    badgeClass: "border-[#fde7b2] bg-[#fff6dd] text-[#9a5b00]",
    panelClass: "bg-[#fff8ea] text-[#9a5b00]",
    description: "orders.payout.queued.description",
  },
  processing: {
    label: "orders.payout.processing.label",
    badgeClass: "border-[#cfe0ff] bg-[#eef4ff] text-[#1d4ed8]",
    panelClass: "bg-[#eef4ff] text-[#1d4ed8]",
    description: "orders.payout.processing.description",
  },
  released: {
    label: "orders.payout.released.label",
    badgeClass: "border-[#c7ebd0] bg-[#effaf3] text-[#1f7a38]",
    panelClass: "bg-[#effaf3] text-[#1f7a38]",
    description: "orders.payout.released.description",
  },
  reversed: {
    label: "orders.payout.reversed.label",
    badgeClass: "border-[#fecdd3] bg-[#fff1f3] text-[#be123c]",
    panelClass: "bg-[#fff1f3] text-[#be123c]",
    description: "orders.payout.reversed.description",
  },
}
