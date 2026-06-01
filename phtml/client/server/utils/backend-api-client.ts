import { createError, getCookie, type H3Event } from "h3"
import type { ApiQuery } from "../../src/shared-kernel/domain/types/api.types"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface BackendApiRequest<TBody = unknown> {
  method?: HttpMethod
  query?: ApiQuery
  body?: TBody
  headers?: HeadersInit
}

const normalizeEndpointType = (endpoint: string) =>
  endpoint.endsWith(".php") ? endpoint.slice(0, -4) : endpoint

export const normalizeBackendBaseURL = (value: string) => {
  const normalized = value.trim().replace(/\/+$/, "")

  return normalized
    .replace(/\/api\/v2\/endpoints$/i, "")
    .replace(/\/api-v2\.php$/i, "")
}

export const getBackendBaseCandidates = (value: string) => {
  const normalized = normalizeBackendBaseURL(value)
  const candidates = new Set<string>([normalized])

  try {
    const url = new URL(normalized)

    if (url.hostname.endsWith(".test") && !url.port) {
      candidates.add(`http://${url.hostname}:8080`)
      candidates.add(`https://${url.hostname}:8443`)
    }
  }
  catch {
    // Ignore invalid URLs here; the fetch layer will surface the real error.
  }

  return [...candidates]
}

const toBackendFormBody = (body: unknown) => {
  if (
    !body ||
    typeof body !== "object" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    (body && body.constructor?.name === "FormData") ||
    typeof (body as any).append === "function"
  ) {
    return body
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue
    }

    params.append(key, String(value))
  }

  return params
}

const parseBackendApiResponse = <TResponse>(response: unknown): TResponse => {
  if (typeof response !== "string") {
    return response as TResponse
  }

  const trimmed = response.trim()
  const jsonStart = trimmed.startsWith("{") || trimmed.startsWith("[")
    ? 0
    : Math.min(
        ...["{", "["]
          .map(marker => trimmed.indexOf(marker))
          .filter(index => index >= 0),
      )
  const directJson = Number.isFinite(jsonStart)
    ? trimmed.slice(jsonStart)
    : ""

  if (!directJson) {
    return response as TResponse
  }

  try {
    return JSON.parse(directJson) as TResponse
  }
  catch {
    return response as TResponse
  }
}

export function createBackendApiClient(event: H3Event) {
  const runtimeConfig = useRuntimeConfig(event)
  const backendAccessToken = getCookie(event, "user_id")

  if (!runtimeConfig.backendApiBase) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing backendApiBase runtime config",
    })
  }

  if (!runtimeConfig.backendServerKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing backendServerKey runtime config",
    })
  }

  const forwardedHeaders: HeadersInit = {}

  const authorization = event.node.req.headers.authorization

  // Do not forward browser cookies to the PHP backend.
  // Old WoWonder cookies like switched_accounts can break backend API login.
  if (authorization) {
    forwardedHeaders.authorization = authorization
  }

  const request = async <TResponse, TBody = unknown>(
    endpoint: string,
    options: BackendApiRequest<TBody> = {},
  ) => {
    const method = options.method ?? "GET"
    const isSafeMethod = ["GET", "HEAD", "DELETE"].includes(method)

    // Build the query
    const query: ApiQuery = { ...(options.query ?? {}) }
    if (backendAccessToken && query.access_token === undefined) {
      query.access_token = backendAccessToken
    }

    let finalBody: any = undefined

    if (isSafeMethod) {
      // For GET/DELETE, server_key must be in query
      query.server_key = String(runtimeConfig.backendServerKey)
    }
    else {
      // For POST/PUT/PATCH, server_key can be in body
      const requestBody = toBackendFormBody(options.body)
      if (requestBody && (requestBody instanceof FormData || requestBody.constructor?.name === "FormData" || typeof (requestBody as any).append === "function")) {
        finalBody = requestBody
        finalBody.append("server_key", String(runtimeConfig.backendServerKey))
      }
      else {
        finalBody = new URLSearchParams(
          requestBody instanceof URLSearchParams ? requestBody : undefined,
        )
        finalBody.set("server_key", String(runtimeConfig.backendServerKey))
      }
    }

    const baseCandidates = getBackendBaseCandidates(String(runtimeConfig.backendApiBase))
    let lastError: unknown

    for (const baseURL of baseCandidates) {
      const client = $fetch.create({
        baseURL,
        credentials: "include",
        headers: forwardedHeaders,
      })

      try {
        const queryParams = new URLSearchParams()
        if (query) {
          for (const [k, v] of Object.entries(query)) {
            if (v !== undefined && v !== null) {
              queryParams.set(k, String(v))
            }
          }
        }
        const queryString = queryParams.toString()
        const path = `api/${normalizeEndpointType(endpoint)}` + (queryString ? `?${queryString}` : "")

        const response = await client<unknown>(path, {
          method,
          body: finalBody,
          headers: options.headers,
        })

        return parseBackendApiResponse<TResponse>(response)
      }
      catch (error) {
        lastError = error
      }
    }

    throw lastError
  }

  return {
    request,
    get: <TResponse>(endpoint: string, query?: ApiQuery) =>
      request<TResponse>(endpoint, { method: "GET", query }),
    post: <TResponse, TBody = unknown>(endpoint: string, body?: TBody, query?: ApiQuery) =>
      request<TResponse, TBody>(endpoint, { method: "POST", body, query }),
    put: <TResponse, TBody = unknown>(endpoint: string, body?: TBody, query?: ApiQuery) =>
      request<TResponse, TBody>(endpoint, { method: "PUT", body, query }),
    patch: <TResponse, TBody = unknown>(endpoint: string, body?: TBody, query?: ApiQuery) =>
      request<TResponse, TBody>(endpoint, { method: "PATCH", body, query }),
    delete: <TResponse>(endpoint: string, query?: ApiQuery) =>
      request<TResponse>(endpoint, { method: "DELETE", query }),
  }
}
