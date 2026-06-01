// English description: Server-side client for PHP browser-session form handlers such as requests.php.

import { createError, type H3Event } from "h3"
import type { ApiQuery } from "../../src/shared-kernel/domain/types/api.types"
import { backendRoutes } from "../../src/shared-kernel/application/constants/route-registry"
import { getBackendBaseCandidates } from "./backend-api-client"

type BackendWebFormValue = string | number | boolean | null | undefined
type BackendWebFormBody = Record<string, BackendWebFormValue> | URLSearchParams | FormData

export interface BackendWebRequest<TBody = BackendWebFormBody> {
  query?: ApiQuery
  body?: TBody
  headers?: HeadersInit
}

const toFormBody = (body: unknown) => {
  if (
    !body ||
    body instanceof URLSearchParams ||
    body instanceof FormData ||
    (body && (body as any).constructor?.name === "FormData") ||
    typeof (body as any).append === "function"
  ) {
    return body
  }

  const params = new URLSearchParams()

  if (!body || typeof body !== "object") {
    return params
  }

  for (const [key, value] of Object.entries(body as BackendWebFormBody)) {
    if (value === undefined || value === null) {
      continue
    }

    params.append(key, String(value))
  }

  return params
}

export function createBackendWebClient(event: H3Event) {
  const runtimeConfig = useRuntimeConfig(event)

  if (!runtimeConfig.backendApiBase && !runtimeConfig.public.backendWebBase) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing backend web runtime config",
    })
  }

  const forwardedHeaders: HeadersInit = {
    "X-Requested-With": "XMLHttpRequest",
    "X-Nuxt-Bridge": "1",
  }

  const cookie = event.node.req.headers.cookie
  const authorization = event.node.req.headers.authorization

  if (cookie) {
    forwardedHeaders.cookie = cookie
  }

  if (authorization) {
    forwardedHeaders.authorization = authorization
  }

  const request = async <TResponse, TBody = BackendWebFormBody>(
    options: BackendWebRequest<TBody> = {},
  ) => {
    const baseCandidates = getBackendBaseCandidates(
      String(runtimeConfig.public.backendWebBase || runtimeConfig.backendApiBase),
    )
    let lastError: unknown

    for (const baseURL of baseCandidates) {
      const client = $fetch.create({
        baseURL,
        credentials: "include",
        headers: forwardedHeaders,
      })

      try {
        const queryParams = new URLSearchParams()
        if (options.query) {
          for (const [k, v] of Object.entries(options.query)) {
            if (v !== undefined && v !== null) {
              queryParams.set(k, String(v))
            }
          }
        }
        const queryString = queryParams.toString()
        const path = backendRoutes.web.requests + (queryString ? `?${queryString}` : "")

        return await client<TResponse>(path, {
          method: "POST",
          body: toFormBody(options.body),
          headers: options.headers,
        })
      }
      catch (error) {
        lastError = error
      }
    }

    throw lastError
  }

  return {
    request,
    postForm: <TResponse, TBody = BackendWebFormBody>(
      action: string,
      body?: TBody,
      query?: ApiQuery,
    ) => request<TResponse, TBody>({
      query: {
        ...(query ?? {}),
        f: action,
      },
      body,
    }),
  }
}
