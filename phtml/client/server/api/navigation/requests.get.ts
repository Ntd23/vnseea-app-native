// English description: Returns backend friend and group chat requests for the header requests dropdown.

import { createBackendApiClient } from "../../utils/backend-api-client"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { appRoutes, backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendRequestUser = Record<string, unknown> & {
  user_id?: number | string
  name?: string
  username?: string
  avatar?: string
  url?: string
}

type BackendGroupChatRequest = Record<string, unknown> & {
  group_id?: number | string
  id?: number | string
  group_name?: string
  name?: string
  avatar?: string
  user_id?: number | string
  user_data?: {
    name?: string
  }
  group_tab?: Record<string, unknown> & {
    group_id?: number | string
    group_name?: string
    name?: string
    avatar?: string
    user_id?: number | string
  }
}

type BackendGeneralDataResponse = {
  api_status?: number | string
  friend_requests?: BackendRequestUser[]
  group_chat_requests?: BackendGroupChatRequest[]
  new_friend_requests_count?: number | string
  new_group_chat_requests_count?: number | string
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asCount = (value: unknown) => {
  const count = Number(value ?? 0)
  return Number.isFinite(count) && count > 0 ? count : 0
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const buildGroupChatRequestUrl = (id: string, title: string) => {
  const params = new URLSearchParams({
    tab: "group",
    groupId: id,
  })

  if (title) {
    params.set("name", title)
  }

  return `${appRoutes.messages}?${params.toString()}`
}

export default defineEventHandler(async (event) => {
  const client = createBackendApiClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const response = assertBackendApiSuccess(
    await client.post<BackendGeneralDataResponse, Record<string, unknown>>(
      backendRoutes.api.generalData,
      {
        fetch: "friend_requests,group_chat_requests",
      },
    ),
    "Unable to load requests.",
  )

  const friendRequests = (Array.isArray(response.friend_requests) ? response.friend_requests : [])
    .map(request => ({
      id: asString(request.user_id),
      kind: "friend" as const,
      title: asString(request.name) || asString(request.username),
      subtitle: asString(request.username) ? `@${asString(request.username)}` : "",
      avatarUrl: resolveMediaUrl(request.avatar),
      url: asString(request.url) || (asString(request.username) ? `/@${asString(request.username)}` : ""),
    }))
    .filter(request => request.id && request.title)

  const groupChatRequests = (Array.isArray(response.group_chat_requests) ? response.group_chat_requests : [])
    .map((request) => {
      const groupTab = asRecord(request.group_tab)
      const id = asString(request.group_id) || asString(groupTab.group_id) || asString(request.id)
      const title = asString(request.group_name) || asString(groupTab.group_name) || asString(request.name) || asString(groupTab.name)

      return {
        id,
        kind: "group_chat" as const,
        title,
        subtitle: asString(request.user_data?.name) || asString(groupTab.user_id) || asString(request.user_id),
        avatarUrl: resolveMediaUrl(request.avatar || groupTab.avatar),
        url: id ? buildGroupChatRequestUrl(id, title) : "",
      }
    })
    .filter(request => request.id && request.title)

  return {
    items: [...friendRequests, ...groupChatRequests],
    friendRequestCount: asCount(response.new_friend_requests_count),
    groupChatRequestCount: asCount(response.new_group_chat_requests_count),
  }
})
