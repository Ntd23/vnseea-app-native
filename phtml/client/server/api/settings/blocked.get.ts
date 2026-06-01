// English description: Returns the list of blocked users for the current authenticated user.

import { createBackendApiClient } from "../../utils/backend-api-client"

export interface BackendBlockedUser {
  user_id: string | number
  username: string
  first_name: string
  last_name: string
  avatar: string
  url: string
  lastseen_time_text?: string
}

export interface BlockedUsersResponse {
  api_status: number
  blocked_users: BackendBlockedUser[]
}

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  
  const response = await client.get<BlockedUsersResponse>("get-blocked-users")

  if (response.api_status !== 200) {
    throw createError({
      statusCode: response.api_status,
      statusMessage: "Unable to fetch blocked users",
    })
  }

  return response.blocked_users.map(user => ({
    id: Number(user.user_id),
    username: user.username,
    name: `${user.first_name} ${user.last_name}`.trim() || user.username,
    avatar: user.avatar,
    url: user.url,
    lastseen: user.lastseen_time_text,
  }))
})
