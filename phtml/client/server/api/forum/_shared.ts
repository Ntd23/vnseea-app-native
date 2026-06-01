// English description: Maps backend PHP forum sections into the forum bounded-context catalog shape.

import { createError, type H3Event } from "h3"
import { assertBackendApiSuccess } from "../../utils/backend-api-response"
import { createBackendApiClient } from "../../utils/backend-api-client"
import type {
  ForumCatalog,
  ForumMutationResult,
  ForumReply,
  ForumReplyPayload,
  ForumSummaryForum,
  ForumSummarySection,
  ForumThread,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
} from "../../../src/forum/domain/types/forum.types"

type BackendEntity = Record<string, unknown>

type BackendForumResponse = {
  api_status?: number | string
  can_create?: boolean
  sections?: BackendEntity[]
  forum?: BackendEntity
  threads?: BackendEntity[]
  thread?: BackendEntity
  reply?: BackendEntity
  has_more?: boolean
  next_offset?: number | string | null
  errors?: {
    error_text?: string
  }
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : ""

const asNumber = (value: unknown) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const asBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true"

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

const stripForumMarkup = (value: string) =>
  stripHtml(
    value
      .replace(/\[(\/)?[a-z]+(?:=[^\]]+)?\]/gi, " ")
      .replace(/&nbsp;/g, " "),
  )

const createInitials = (value: string, fallback = "VN") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")

  return initials || fallback
}

const formatBackendTimestamp = (value: unknown) => {
  const numeric = asNumber(value)

  if (!numeric) {
    return asString(value)
  }

  const timestamp = numeric > 9999999999 ? numeric : numeric * 1000
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return asString(value)
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

const mapForum = (item: BackendEntity, sectionId: number): ForumSummaryForum => ({
  id: asNumber(item.id),
  sectionId,
  title: asString(item.name_lang || item.name),
  description: asString(item.description_lang || item.description),
  posts: asNumber(item.posts),
  url: `/forum?fid=${asNumber(item.id)}`,
})

const mapSection = (item: BackendEntity): ForumSummarySection => {
  const id = asNumber(item.id)

  return {
    id,
    title: asString(item.section_name_lang || item.section_name),
    description: asString(item.description_lang || item.description),
    forums: Array.isArray(item.forums) ? item.forums.map(forum => mapForum(forum as BackendEntity, id)) : [],
  }
}

const mapReply = (item: BackendEntity): ForumReply => {
  const user = (item.user_data ?? {}) as BackendEntity
  const author = asString(user.name || user.username) || "Member"

  return {
    id: asNumber(item.id),
    threadId: asNumber(item.thread_id),
    forumId: asNumber(item.forum_id),
    author,
    authorAvatarUrl: asString(user.avatar),
    authorUrl: asString(user.url),
    initials: createInitials(author),
    role: asString(user.working || user.school || user.username) || author,
    subject: stripForumMarkup(asString(item.post_subject)),
    message: stripForumMarkup(asString(item.post_text)),
    time: formatBackendTimestamp(item.posted_time),
    canManage: asBoolean(item.is_owner) || asBoolean(item.is_admin),
    accepted: false,
  }
}

const mapThread = (item: BackendEntity): ForumThread => {
  const user = (item.user_data ?? {}) as BackendEntity
  const forum = (item.forum_data || item.forum) as BackendEntity
  const author = asString(user.name || user.username) || "Member"
  const title = stripForumMarkup(asString(item.orginal_headline || item.headline))
  const body = stripForumMarkup(asString(item.post))
  const forumId = asNumber(item.forum || item.forum_id)
  const replies = Array.isArray(item.threadreplies)
    ? item.threadreplies.map(reply => mapReply(reply as BackendEntity))
    : []

  return {
    id: asNumber(item.id),
    forumId,
    title,
    section: "support",
    sectionLabel: asString(forum.name_lang || forum.name) || `Forum #${forumId}`,
    author,
    authorAvatarUrl: asString(user.avatar),
    authorUrl: asString(item.author_url || user.url),
    authorInitials: createInitials(author),
    authorRole: asString(user.working || user.school || user.username) || author,
    status: "open",
    createdAt: formatBackendTimestamp(item.posted),
    views: asNumber(item.views),
    repliesCount: asNumber(item.replies) || replies.length,
    excerpt: body,
    tags: [],
    replies,
    url: `/forum?fid=${forumId}&tid=${asNumber(item.id)}`,
    canManage: asBoolean(item.is_owner) || asBoolean(item.is_admin),
  }
}

export async function fetchForumCatalog(
  event: H3Event,
  query: { q?: string; offset?: number | null; limit?: number },
): Promise<ForumCatalog> {
  const response = await createBackendApiClient(event).post<BackendForumResponse>("forum", {
    keyword: query.q || "",
    offset: query.offset || 0,
    limit: query.limit || 20,
  })
  const data = assertBackendApiSuccess(response, "Unable to load forum.")

  return {
    sections: (data.sections ?? []).map(mapSection),
    canCreate: Boolean(data.can_create),
    hasMore: Boolean(data.has_more),
    nextOffset: data.next_offset ? asNumber(data.next_offset) : null,
  }
}

export async function fetchForumThreads(
  event: H3Event,
  query: { forumId: number; q?: string; offset?: number | null; limit?: number },
): Promise<ForumThreadList> {
  if (!query.forumId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Forum id is required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendForumResponse>("forum", {
    action: "threads",
    forum_id: query.forumId,
    keyword: query.q || "",
    offset: query.offset || 0,
    limit: query.limit || 10,
  })
  const data = assertBackendApiSuccess(response, "Unable to load forum threads.")

  return {
    forum: data.forum ? mapForum(data.forum, asNumber((data.forum as BackendEntity).sections)) : null,
    threads: (data.threads ?? []).map(mapThread),
    canCreate: Boolean(data.can_create),
    hasMore: Boolean(data.has_more),
    nextOffset: data.next_offset ? asNumber(data.next_offset) : null,
  }
}

export async function fetchMyForumThreads(
  event: H3Event,
  query: { q?: string; offset?: number | null; limit?: number },
): Promise<ForumThreadList> {
  const response = await createBackendApiClient(event).post<BackendForumResponse>("forum", {
    action: "my_threads",
    keyword: query.q || "",
    offset: query.offset || 0,
    limit: query.limit || 10,
  })
  const data = assertBackendApiSuccess(response, "Unable to load your forum threads.")

  return {
    forum: null,
    threads: (data.threads ?? []).map(mapThread),
    canCreate: Boolean(data.can_create),
    hasMore: Boolean(data.has_more),
    nextOffset: data.next_offset ? asNumber(data.next_offset) : null,
  }
}

export async function fetchForumThreadDetail(event: H3Event, threadId: number): Promise<ForumThreadDetail> {
  if (!threadId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Thread id is required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendForumResponse>("forum", {
    action: "thread_detail",
    thread_id: threadId,
  })
  const data = assertBackendApiSuccess(response, "Unable to load forum thread.")

  return {
    thread: data.thread ? mapThread(data.thread) : null,
    canCreate: Boolean(data.can_create),
  }
}

export async function createForumThread(event: H3Event, payload: ForumThreadPayload): Promise<ForumMutationResult> {
  if (!payload.forumId || payload.title.trim().length < 10 || payload.message.trim().length < 32) {
    throw createError({
      statusCode: 400,
      statusMessage: "Thread title and content are required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendForumResponse>("forum", {
    action: "create_thread",
    forum_id: payload.forumId,
    headline: payload.title.trim(),
    topicpost: payload.message.trim(),
  })
  const data = assertBackendApiSuccess(response, "Unable to create forum thread.")

  return {
    ok: true,
    thread: data.thread ? mapThread(data.thread) : null,
  }
}

export async function replyForumThread(event: H3Event, payload: ForumReplyPayload): Promise<ForumMutationResult> {
  const message = payload.message.trim()
  const subject = (payload.subject || message.slice(0, 80)).trim()

  if (!payload.threadId || !payload.forumId || subject.length < 10 || message.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "Reply content is required.",
    })
  }

  const response = await createBackendApiClient(event).post<BackendForumResponse>("forum", {
    action: "reply_thread",
    thread_id: payload.threadId,
    forum_id: payload.forumId,
    subject,
    content: message,
  })
  const data = assertBackendApiSuccess(response, "Unable to reply to forum thread.")

  return {
    ok: true,
    reply: data.reply ? mapReply(data.reply) : null,
  }
}
