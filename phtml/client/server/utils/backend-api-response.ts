import { createError } from "h3"

type BackendApiResponse = {
  api_status?: number | string
  errors?: {
    error_text?: string
  }
  message?: string
}

export function assertBackendApiSuccess<TResponse extends BackendApiResponse>(
  response: TResponse,
  fallbackMessage: string,
) {
  const apiStatus = Number(response.api_status ?? 0)

  if (apiStatus >= 200 && apiStatus < 300) {
    return response
  }

  const backendMessage = response.errors?.error_text ?? response.message ?? fallbackMessage
  const isUnauthorized = /not authorized|access_token/i.test(backendMessage)

  throw createError({
    statusCode: isUnauthorized ? 401 : 400,
    statusMessage: backendMessage,
    data: response,
  })
}
