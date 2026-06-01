// English description: Deletes a specific session or all sessions for the current user.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendWebClient } from "../../utils/backend-web-client"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id ? String(query.id) : undefined

  if (id === "all") {
    const webClient = createBackendWebClient(event)
    const response = await webClient.postForm<{ status: number }>("delete_all_sessions")
    
    return {
      success: response.status === 200
    }
  }

  if (id) {
    const apiClient = createBackendApiClient(event)
    const response = await apiClient.post<{ api_status: number }>("sessions", {
      type: "delete",
      id
    })

    return {
      success: response.api_status === 200
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Session ID is required or must be 'all'",
  })
})
