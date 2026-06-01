import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendGeneralDataResponse = {
  api_status?: number | string
  new_notifications_count?: number | string
  new_friend_requests_count?: number | string
  new_group_chat_requests_count?: number | string
  count_new_messages?: number | string
  video_count?: number | string
  errors?: {
    error_text?: string
  }
}

export type NavigationGeneralResponse = {
  notificationCount: number
  friendRequestCount: number
  groupChatRequestCount: number
  messageCount: number
  videoCount: number
}

const toCount = (value: unknown) => {
  const count = Number(value ?? 0)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export default defineEventHandler(async (event): Promise<NavigationGeneralResponse> => {
  const client = createBackendApiClient(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendGeneralDataResponse, Record<string, unknown>>(
      backendRoutes.api.generalData,
      {
        fetch: [
          "notifications",
          "friend_requests",
          "group_chat_requests",
          "count_new_messages",
          "video_count",
        ].join(","),
        include_all_notifications: 1,
      },
    ),
    "Unable to load navigation data.",
  )

  return {
    notificationCount: toCount(response.new_notifications_count),
    friendRequestCount: toCount(response.new_friend_requests_count),
    groupChatRequestCount: toCount(response.new_group_chat_requests_count),
    messageCount: toCount(response.count_new_messages),
    videoCount: toCount(response.video_count),
  }
})
