// English description: Keeps wallet API bridge paths local to the wallet bounded context.

export const walletApiRoutes = {
  overview: "/_api/wallet",
  send: "/_api/wallet/send",
  recipientSearch: "/_api/wallet/recipient-search",
  receiveQr: "/_api/wallet/receive-qr",
  topupLink: "/_api/wallet/topup-link",
  bankTransfer: "/_api/wallet/bank-transfer",
  sepayQr: "/_api/wallet/sepay-qr",
  sepayCheck: "/_api/wallet/sepay-check",
} as const
