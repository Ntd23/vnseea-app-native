// English description: Repository contract for loading public site branding data.

import type { SiteBranding } from "../types/site-branding.types"

export interface SiteBrandingRepository {
  getBranding(): Promise<SiteBranding>
}
