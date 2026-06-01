// English description: Repository contract for loading public SEO metadata through the Nuxt backend bridge.

import type { PublicSeoMeta, PublicSeoQuery } from "../types/public-seo.types"

export interface PublicSeoRepository {
  getPublicSeo(query: PublicSeoQuery): Promise<PublicSeoMeta | null>
}
