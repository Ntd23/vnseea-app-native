// English description: Nuxt API backed implementation of the site branding repository.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"
import type { SiteBrandingRepository } from "../../domain/repositories/SiteBrandingRepository"
import type { SiteBranding } from "../../domain/types/site-branding.types"

export function createApiSiteBrandingRepository(): SiteBrandingRepository {
  const client = useNuxtApiClient()

  return {
    getBranding: () => client.get<SiteBranding>(apiRoutes.site.branding),
  }
}
