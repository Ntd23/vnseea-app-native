// English description: Posts URL-encoded or multipart form data to backend API endpoints that require server_key and access_token fields.

import { createError, getCookie, type H3Event } from "h3"
import type { ApiQuery } from "../../src/shared-kernel/domain/types/api.types"
import {
  getBackendBaseCandidates,
  normalizeBackendBaseURL,
} from "./backend-api-client"

const normalizeEndpointType = (endpoint: string) => {
  if (endpoint.endsWith(".php")) {
    return endpoint
  }

  if (endpoint.includes("/")) {
    return `${endpoint}.php`
  }

  return endpoint
}

const appendFormField = (
  body: FormData | URLSearchParams,
  key: string,
  value: string,
) => {
  if (body instanceof FormData) {
    body.append(key, value)
    return
  }

  body.append(key, value)
}

const cloneUploadBody = (body: FormData | URLSearchParams) => {
  if (body instanceof URLSearchParams) {
    return new URLSearchParams(body)
  }

  const cloned = new FormData()

  body.forEach((value, key) => {
    if (typeof value === "string") {
      cloned.append(key, value)
      return
    }

    cloned.append(key, value, value.name)
  })

  return cloned
}

export async function postBackendApiUpload<TResponse>(
  event: H3Event,
  endpoint: string,
  body: FormData | URLSearchParams,
  query?: ApiQuery,
) {
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
  const cookie = event.node.req.headers.cookie
  const authorization = event.node.req.headers.authorization

  if (cookie) {
    forwardedHeaders.cookie = cookie
  }

  if (authorization) {
    forwardedHeaders.authorization = authorization
  }

  const queryWithAccessToken: ApiQuery = { ...(query ?? {}) }

  if (backendAccessToken && queryWithAccessToken.access_token === undefined) {
    queryWithAccessToken.access_token = backendAccessToken
  }

  const baseCandidates = getBackendBaseCandidates(
    normalizeBackendBaseURL(String(runtimeConfig.backendApiBase)),
  )
  let lastError: unknown

  for (const baseURL of baseCandidates) {
    const client = $fetch.create({
      baseURL,
      credentials: "include",
      headers: forwardedHeaders,
    })

    try {
      const requestBody = cloneUploadBody(body)
      appendFormField(requestBody, "server_key", String(runtimeConfig.backendServerKey))

      const queryParams = new URLSearchParams()
      if (queryWithAccessToken) {
        for (const [k, v] of Object.entries(queryWithAccessToken)) {
          if (v !== undefined && v !== null) {
            queryParams.set(k, String(v))
          }
        }
      }
      const queryString = queryParams.toString()
      const path = `api/${normalizeEndpointType(endpoint)}` + (queryString ? `?${queryString}` : "")

      return await client<TResponse>(path, {
        method: "POST",
        body: requestBody,
      })
    }
    catch (error) {
      lastError = error
    }
  }

  throw lastError
}
