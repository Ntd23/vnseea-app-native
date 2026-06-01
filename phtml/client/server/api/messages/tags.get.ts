// English description: Bridges WoWonder user tag labels and tagged recipients for the messages screen.

import type {
  MessageContact,
  MessageTagsPayload,
  MessageUserTag,
} from "../../../src/messages/domain/types/messages.types"
import { getBackendCurrentUser } from "../../utils/backend-current-user"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { createBackendWebClient } from "../../utils/backend-web-client"

type BackendEntity = Record<string, unknown>

type BackendLabelsResponse = {
  status?: number | string
  labels?: BackendEntity[]
}

type BackendTaggedUsersResponse = {
  status?: number | string
  data?: BackendEntity[]
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) ? normalized : 0
}

const sanitizeColor = (value: unknown) => {
  const color = asString(value)
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#9ca3af"
}

const mapTag = (entity: BackendEntity): MessageUserTag => ({
  id: asNumber(entity.id ?? entity.label_id ?? entity.tag_id),
  name: asString(entity.name),
  color: sanitizeColor(entity.color),
})

const mapTaggedContact = (
  entity: BackendEntity,
  resolveMediaUrl: (value: unknown) => string,
): MessageContact | null => {
  const userId = asNumber(entity.user_id ?? entity.target_user_id)

  if (userId <= 0) {
    return null
  }

  const tag = mapTag(entity)
  const username = asString(entity.username)
  const name = asString(entity.user_name)
    || asString(entity.name)
    || [asString(entity.first_name), asString(entity.last_name)].filter(Boolean).join(" ")
    || username
    || `User ${userId}`
  const lastseen = asNumber(entity.lastseen)
  const isOnline = lastseen > 0 && lastseen > Math.floor(Date.now() / 1000) - 60

  return {
    id: `user:${userId}`,
    name,
    profileUrl: username ? `/@${encodeURIComponent(username)}` : "",
    status: isOnline ? "Online" : "Offline",
    isOnline,
    lastSeenAt: lastseen || undefined,
    avatarUrl: resolveMediaUrl(asString(entity.avatar)),
    tab: "user",
    type: "user",
    preview: tag.name,
    time: "",
    unreadCount: 0,
    members: [name],
    userId,
    tags: tag.id > 0 ? [tag] : [],
  }
}

export default defineEventHandler(async (event): Promise<MessageTagsPayload> => {
  const currentUser = await getBackendCurrentUser(event)
  const sessionHash = asString(currentUser.session_hash)
  const client = createBackendWebClient(event)
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const createBody = () => ({ hash_id: sessionHash })

  const [labelsResponse, taggedUsersResponse] = await Promise.all([
    client.postForm<BackendLabelsResponse>(
      "tags",
      createBody(),
      { s: "list_labels", hash: sessionHash },
    ),
    client.postForm<BackendTaggedUsersResponse>(
      "tags",
      createBody(),
      { s: "all_tags", hash: sessionHash },
    ),
  ])

  const labels = (labelsResponse.labels ?? [])
    .map(mapTag)
    .filter(label => label.id > 0 && label.name)
  const contacts = (taggedUsersResponse.data ?? [])
    .map(entity => mapTaggedContact(entity, resolveMediaUrl))
    .filter(Boolean) as MessageContact[]

  return {
    labels,
    contacts,
  }
})
