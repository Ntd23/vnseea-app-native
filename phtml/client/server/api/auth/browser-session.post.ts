// English description: Proxies backend set-browser-cookie.php so the Nuxt app can establish the PHP browser session without cross-origin redirects.

import { appendResponseHeader, createError, getRequestHeader, readBody } from "h3"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"
import { getBackendBaseCandidates, normalizeBackendBaseURL } from "../../utils/backend-api-client"

type BrowserSessionBody = {
  accessToken?: string
}

type BackendBrowserSessionError = {
  api_status?: number | string
  errors?: {
    error_text?: string
  }
}

const splitSetCookieHeader = (headerValue: string) => {
  const cookies: string[] = []
  let current = ""
  let insideExpires = false

  for (let index = 0; index < headerValue.length; index += 1) {
    const char = headerValue[index]
    const nextToken = headerValue.slice(index, index + 8).toLowerCase()

    if (nextToken === "expires=") {
      insideExpires = true
    }

    if (char === ";" && insideExpires) {
      insideExpires = false
    }

    if (char === "," && !insideExpires) {
      if (current.trim()) cookies.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  if (current.trim()) cookies.push(current.trim())
  return cookies
}

const readSetCookieHeaders = (headers: Headers) => {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headersWithGetSetCookie.getSetCookie === "function") {
    return headersWithGetSetCookie.getSetCookie()
  }

  const rawHeader = headers.get("set-cookie")
  return rawHeader ? splitSetCookieHeader(rawHeader) : []
}

export default defineEventHandler(async (event) => {
  const body = await readBody<BrowserSessionBody>(event)
  const accessToken = body.accessToken?.trim()

  if (!accessToken) {
    throw createError({
      statusCode: 422,
      statusMessage: "Access token is required.",
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const backendWebBase = String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase || "")
  const backendCandidates = getBackendBaseCandidates(normalizeBackendBaseURL(backendWebBase))
  const forwardedCookie = getRequestHeader(event, "cookie")

  let lastError: unknown

  for (const baseURL of backendCandidates) {
    const endpointUrl = `${baseURL}${backendRoutes.session.setBrowserCookie}`

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        redirect: "manual",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
          ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
        },
        body: new URLSearchParams({
          access_token: accessToken,
        }),
      })

      const setCookieHeaders = readSetCookieHeaders(response.headers)
      for (const cookieHeader of setCookieHeaders) {
        appendResponseHeader(event, "set-cookie", cookieHeader)
      }

      const location = response.headers.get("location")
      if (location || (response.status >= 300 && response.status < 400)) {
        return {
          success: true,
          redirectTo: "/home",
        }
      }

      const rawText = await response.text()
      let errorPayload: BackendBrowserSessionError | null = null

      try {
        errorPayload = JSON.parse(rawText) as BackendBrowserSessionError
      }
      catch {
        errorPayload = null
      }

      const errorText = errorPayload?.errors?.error_text?.trim()
      throw createError({
        statusCode: 401,
        statusMessage: errorText || "Unable to establish browser session.",
      })
    }
    catch (error) {
      lastError = error
    }
  }

  throw lastError ?? createError({
    statusCode: 502,
    statusMessage: "Unable to establish browser session.",
  })
})
