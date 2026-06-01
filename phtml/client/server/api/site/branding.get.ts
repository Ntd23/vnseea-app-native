// English description: Bridges Nuxt to the PHP public site settings used for dynamic branding.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import { createDefaultSiteBranding, type SiteBranding } from "../../../src/site-branding/domain/types/site-branding.types"

type BackendSiteSettingsPublicConfig = Record<string, unknown>

type BackendSiteSettingsResponse = {
  api_status?: number | string
  public_config?: BackendSiteSettingsPublicConfig
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const firstString = (source: BackendSiteSettingsPublicConfig, keys: string[]) => {
  for (const key of keys) {
    const value = asString(source[key])

    if (value) {
      return value
    }
  }

  return ""
}

export default defineEventHandler(async (event): Promise<SiteBranding> => {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const fallback = createDefaultSiteBranding()
  const response = assertBackendApiSuccess(
    await client.post<BackendSiteSettingsResponse, Record<string, unknown>>(
      backendRoutes.api.siteSettings,
      {},
    ),
    "Unable to load site branding.",
  )
  const publicConfig = response.public_config ?? {}
  const siteName = firstString(publicConfig, ["siteName", "site_name"]) || fallback.siteName
  const siteTitle = firstString(publicConfig, ["siteTitle", "site_title"]) || siteName

  return {
    siteName,
    siteTitle,
    siteDescription: firstString(publicConfig, ["siteDesc", "siteDescription", "site_description"]),
    logoUrl: resolveMediaUrl(firstString(publicConfig, ["logo_url", "logoUrl"])),
    nightLogoUrl: resolveMediaUrl(firstString(publicConfig, ["night_logo_url", "nightLogoUrl"])),
    faviconUrl: resolveMediaUrl(firstString(publicConfig, ["favicon_url", "faviconUrl"])) || fallback.faviconUrl,
  }
})
