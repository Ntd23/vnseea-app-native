const publicPaths = new Set([
  "/welcome",
  "/register",
  "/forgot-password",
  "/confirm-login",
  "/confirm-account",
  "/confirm-reset-sms",
  "/reset-password",
  "/logout",
])

export const isPublicPath = (path: string) => publicPaths.has(path)

export const isProtectedPath = (path: string) => !isPublicPath(path)
