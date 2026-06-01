// English description: Returns the list of active sessions for the current authenticated user.

import { createBackendApiClient } from "../../utils/backend-api-client"

export interface BackendSession {
  id: string | number
  user_id: string | number
  session_id: string
  platform: string
  browser: string
  time: string
  ip_address: string
}

export interface SessionsResponse {
  api_status: number
  data: BackendSession[]
}

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  
  const response = await client.post<SessionsResponse>("sessions", {
    type: "get"
  })

  if (response.api_status !== 200) {
    throw createError({
      statusCode: response.api_status,
      statusMessage: "Unable to fetch sessions",
    })
  }

  return response.data.map(session => ({
    id: Number(session.id),
    platform: session.platform,
    browser: session.browser,
    time: session.time,
    ip: session.ip_address,
  }))
})
