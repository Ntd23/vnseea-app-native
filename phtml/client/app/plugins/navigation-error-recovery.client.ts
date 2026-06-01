export default defineNuxtPlugin(() => {
  const router = useRouter()
  const error = useError()
  const lastSafeRoute = useState("last-safe-route", () => "/home")

  let clearingError = false

  router.beforeEach(async (to, from) => {
    if (to.matched.length === 0) {
      const fallback = from.fullPath && from.fullPath !== to.fullPath
        ? from.fullPath
        : lastSafeRoute.value || "/home"

      return fallback === to.fullPath ? "/home" : fallback
    }

    if (!error.value || clearingError) return

    clearingError = true

    try {
      await clearError()
    } finally {
      clearingError = false
    }
  })
})
