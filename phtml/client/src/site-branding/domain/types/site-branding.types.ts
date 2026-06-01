// English description: Domain types and fallbacks for public site branding from the backend.

export interface SiteBranding {
  siteName: string
  siteTitle: string
  siteDescription: string
  logoUrl: string
  nightLogoUrl: string
  faviconUrl: string
}

export const createDefaultSiteBranding = (): SiteBranding => ({
  siteName: "VNSEEA",
  siteTitle: "VNSEEA",
  siteDescription: "",
  logoUrl: "",
  nightLogoUrl: "",
  faviconUrl: "/favicon.ico",
})
