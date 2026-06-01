const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

export const useBackendWebBase = () => {
  const runtimeConfig = useRuntimeConfig()

  return trimTrailingSlash(String(runtimeConfig.public.backendWebBase || runtimeConfig.public.siteUrl || ""))
}

export const useBackendWebUrl = (path: string) => {
  const base = useBackendWebBase()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${base}${normalizedPath}`
}
