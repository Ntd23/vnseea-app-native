import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { isProtectedPath } from "../../src/auth/application/constants/route-policy"
import { useCurrentAuthUserStore } from "../../src/auth/application/stores/useCurrentAuthUserStore"

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isProtectedPath(to.path)) {
    return
  }

  const backendUserSession = useCookie<string | null>("user_id", {
    default: () => null,
    sameSite: "lax",
    path: "/",
  })

  if (!backendUserSession.value) {
    return navigateTo(appRoutes.welcome, { replace: true })
  }

 const pinia = usePinia()
const currentUserStore = useCurrentAuthUserStore(pinia)
  const currentUser = await currentUserStore.hydrate(true)

  if (!currentUser) {
    backendUserSession.value = null
    currentUserStore.clear()

    return navigateTo(appRoutes.welcome, { replace: true })
  }
})
