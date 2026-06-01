// English description: Bridges settings point exchange requests to the PHP points exchange endpoint.

import { createError, readBody } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"

type BackendPointsExchangeResponse = {
  api_status?: number | string
  success?: boolean
  message?: string
  exchanged_points?: number | string
  amount?: number | string
  points?: number | string
  wallet?: number | string
  points_config?: {
    dollar_to_point_cost?: number | string
  }
  errors?: {
    error_text?: string
  }
}

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ points?: number | string }>(event)
  const points = Math.trunc(asNumber(body?.points))

  if (points < 1) {
    throw createError({
      statusCode: 422,
      statusMessage: "Points must be greater than zero.",
    })
  }

  const response = assertBackendApiSuccess(
    await createBackendApiClient(event).post<BackendPointsExchangeResponse>(
      "points-exchange",
      { points },
    ),
    "Unable to exchange points.",
  )

  return {
    success: true,
    message: response.message || "Points exchanged successfully.",
    exchangedPoints: asNumber(response.exchanged_points),
    amount: asNumber(response.amount),
    points: asNumber(response.points),
    wallet: asNumber(response.wallet),
  }
})
