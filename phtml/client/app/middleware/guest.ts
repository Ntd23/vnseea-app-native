import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useCurrentAuthUserStore } from "../../src/auth/application/stores/useCurrentAuthUserStore"

export default defineNuxtRouteMiddleware(async () => {
  const backendUserSession = useCookie<string | null>("user_id", {
    default: () => null,
    sameSite: "lax",
    path: "/",
  })

  if (backendUserSession.value) {
    const currentUserStore = useCurrentAuthUserStore()
    const currentUser = await currentUserStore.hydrate(true)

    if (currentUser) {
      return navigateTo(appRoutes.feed, { replace: true })
    }

    backendUserSession.value = null
    currentUserStore.clear()
  }
})
