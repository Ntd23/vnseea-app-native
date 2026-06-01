import type { CheckoutSnapshot } from "../../domain/types/checkout.types"

export const checkoutSnapshotMock: CheckoutSnapshot = {
  items: [
    {
      id: "john-larry",
      name: "John Larry",
      price: 50000,
      quantity: 2,
      imageStyle: [
        "radial-gradient(circle at 72% 10%, rgba(255,216,188,0.52), transparent 20%)",
        "radial-gradient(circle at 20% 22%, rgba(255,255,255,0.3), transparent 23%)",
        "linear-gradient(145deg, #1c2d53 0%, #d28a9d 38%, #f6c58b 100%)",
      ].join(", "),
    },
  ],
  shippingAddress: null,
  walletBalance: 40000,
  shippingFee: 0,
}
