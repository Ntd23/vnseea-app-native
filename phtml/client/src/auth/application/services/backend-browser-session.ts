// English description: Establishes the backend PHP browser session through the Nuxt API bridge, then forces a full app reload.

import { apiRoutes, appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"

export async function submitBackendBrowserSession(accessToken: string) {
  if (import.meta.server) return

  const client = useNuxtApiClient()

  await client.post(apiRoutes.auth.browserSession, { accessToken })
  window.location.replace(`${appRoutes.feed}?cache=${Date.now()}`)
}
