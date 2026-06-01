// English description: Resolves backend media paths into absolute URLs that stay protocol-safe across HTTP and HTTPS frontend origins.

import { getRequestURL, type H3Event } from "h3"

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const stripBackendApiSuffix = (value: string) =>
  value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/v2\/endpoints$/i, "")
    .replace(/\/api-v2\.php$/i, "")
    .replace(/\/api$/i, "")

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const toUrl = (value: string) => {
  try {
    return new URL(value)
  }
  catch {
    return null
  }
}

const sameHostname = (left: URL | null, right: URL | null) =>
  !!left
  && !!right
  && left.hostname.toLowerCase() === right.hostname.toLowerCase()

const buildRequestScopedOrigin = (event: H3Event, value?: string) => {
  const requestUrl = getRequestURL(event)

  if (requestUrl.protocol !== "https:") {
    return ""
  }

  const targetUrl = value ? toUrl(value) : null

  if (targetUrl && !sameHostname(targetUrl, requestUrl)) {
    return ""
  }

  return requestUrl.origin.replace(/\/+$/, "")
}

export const getBackendWebBaseUrl = (event: H3Event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const rawBase = asString(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase)
  const normalizedBase = trimTrailingSlash(stripBackendApiSuffix(rawBase))
  const secureOrigin = buildRequestScopedOrigin(event, normalizedBase)

  if (!normalizedBase) {
    return secureOrigin
  }

  if (!secureOrigin) {
    return normalizedBase
  }

  const parsedBase = toUrl(normalizedBase)

  if (!parsedBase) {
    return normalizedBase
  }

  return trimTrailingSlash(`${secureOrigin}${parsedBase.pathname}`.replace(/\/+$/, ""))
}

export const createBackendMediaUrlResolver = (event: H3Event) => {
  const backendWebBase = getBackendWebBaseUrl(event)
  const requestUrl = getRequestURL(event)
  const secureOrigin = buildRequestScopedOrigin(event, backendWebBase)
  const backendUrl = toUrl(backendWebBase)

  return (value: unknown) => {
    const rawValue = asString(value)

    if (!rawValue) {
      return ""
    }

    if (/^(?:data:|blob:)/i.test(rawValue)) {
      return rawValue
    }

    if (!backendWebBase) {
      return rawValue.startsWith("/") ? rawValue : `/${rawValue}`
    }

    if (/^https?:\/\//i.test(rawValue)) {
      const absoluteUrl = toUrl(rawValue)

      if (
        absoluteUrl
        && absoluteUrl.protocol === "http:"
        && requestUrl.protocol === "https:"
        && secureOrigin
        && (sameHostname(absoluteUrl, requestUrl) || sameHostname(absoluteUrl, backendUrl))
      ) {
        return `${secureOrigin}${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`
      }

      return rawValue
    }

    if (rawValue.startsWith("//")) {
      const protocol = requestUrl.protocol || backendUrl?.protocol || "https:"
      return `${protocol}${rawValue}`
    }

    try {
      return new URL(rawValue, `${backendWebBase}/`).toString()
    }
    catch {
      return rawValue
    }
  }
}
