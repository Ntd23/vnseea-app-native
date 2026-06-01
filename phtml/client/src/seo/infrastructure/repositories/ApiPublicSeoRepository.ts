// English description: Nuxt API backed repository for public entity SEO metadata.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { PublicSeoRepository } from "../../domain/repositories/PublicSeoRepository"
import type { PublicSeoMeta, PublicSeoQuery } from "../../domain/types/public-seo.types"

export function createApiPublicSeoRepository(): PublicSeoRepository {
  const client = useNuxtApiClient()

  return {
    getPublicSeo: query => client.get<PublicSeoMeta | null>(apiRoutes.seo.public, {
      routeType: query.routeType,
      identifier: query.identifier,
    }),
  }
}
