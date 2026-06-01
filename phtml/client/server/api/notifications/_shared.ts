// English description: Normalizes backend notification payloads for the Nuxt notification center.

import type { H3Event } from "h3"
import { createError, getHeader } from "h3"
import { createBackendApiClient } from "../../utils/backend-api-client"
import { createBackendMediaUrlResolver } from "../../utils/backend-media-url"
import { appRoutes, backendRoutes } from "../../../src/shared-kernel/application/constants/route-registry"

type BackendNotifier = {
  user_id?: number | string
  name?: string
  username?: string
  avatar?: string
}

type BackendNotification = {
  id?: number | string
  type?: string
  type_text?: string
  text?: string
  full_link?: string
  url?: string
  ajax_url?: string
  icon?: string
  seen?: number | string
  time?: number | string
  time_text?: string
  time_text_string?: string
  post_id?: number | string
  page_id?: number | string
  group_id?: number | string
  event_id?: number | string
  blog_id?: number | string
  thread_id?: number | string
  story_id?: number | string
  notifier?: BackendNotifier
}

type BackendGeneralDataResponse = {
  api_status?: number | string
  errors?: {
    error_text?: string
  }
  notifications?: BackendNotification[]
  new_notifications_count?: number | string
}

const asString = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : ""

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const encodeRouteSegment = (value: string | number) => encodeURIComponent(String(value).trim())

const normalizeKnownPath = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const malformedPostMatch = normalizedPath.match(/^\/post\/([^/?#&]+)&(.+)$/i)

  if (malformedPostMatch?.[1] && malformedPostMatch[2]) {
    return `${appRoutes.postDetail(malformedPostMatch[1])}?${malformedPostMatch[2]}`
  }

  const messageMatch = normalizedPath.match(/^\/messages\/([^/?#]+)(.*)?$/i)

  if (messageMatch?.[1]) {
    return `${appRoutes.messages}?user=${encodeRouteSegment(messageMatch[1])}`
  }

  return normalizedPath
}

const normalizeLegacyIndexUrl = (rawUrl: string, item: BackendNotification) => {
  const queryString = rawUrl
    .replace(/^\/?index\.php\?/i, "")
    .replace(/^\?/, "")
  const params = new URLSearchParams(queryString)
  const link = asString(params.get("link1"))

  if (!link) {
    return ""
  }

  if (link === "post") {
    const id = asString(params.get("id")) || asString(item.post_id)
    return id ? appRoutes.postDetail(id) : ""
  }

  if (link === "timeline") {
    const username = asString(params.get("u"))
    return username ? appRoutes.profile(username) : ""
  }

  if (link === "messages") {
    const user = asString(params.get("user"))
    return user ? `${appRoutes.messages}?user=${encodeRouteSegment(user)}` : appRoutes.messages
  }

  if (link === "setting") {
    const page = asString(params.get("page"))
    return page ? appRoutes.settingsPage(page) : appRoutes.settings
  }

  if (link === "wallet") return appRoutes.wallet
  if (link === "jobs") return appRoutes.jobs
  if (link === "events") return appRoutes.events
  if (link === "forum") return appRoutes.forum
  if (link === "products") return appRoutes.products
  if (link === "create-status") return appRoutes.statusCreate
  if (link === "create-blog") return appRoutes.createBlog
  if (link === "create-event") return appRoutes.createEvent

  if (link === "show-event") {
    const id = asString(params.get("eid")) || asString(item.event_id)
    return id ? appRoutes.eventDetail(id) : appRoutes.events
  }

  if (link === "read-blog") {
    const id = asString(params.get("id")) || asString(item.blog_id)
    return id ? appRoutes.readBlog(id) : appRoutes.blogs
  }

  if (link === "show_fund") {
    const id = asString(params.get("id"))
    return id ? appRoutes.showFund(id) : appRoutes.funding
  }

  if (link === "order") {
    const id = asString(params.get("id"))
    return id ? appRoutes.orderDetail(id) : appRoutes.orders
  }

  if (link === "customer_order") {
    const id = asString(params.get("id"))
    return id ? appRoutes.customerOrder(id) : appRoutes.orders
  }

  if (link === "page-setting") {
    const page = asString(params.get("page"))
    return page ? appRoutes.pageSetting(page) : appRoutes.pages
  }

  if (link === "group-setting") {
    const group = asString(params.get("group"))
    return group ? appRoutes.groupSetting(group) : appRoutes.groups
  }

  if (link === "reels") {
    const id = asString(params.get("id"))
    return id ? `${appRoutes.reels}/${encodeRouteSegment(id)}` : appRoutes.reels
  }

  return normalizeKnownPath(`/${link}`)
}

const normalizeNotificationUrl = (event: H3Event, item: BackendNotification) => {
  const postId = asString(item.post_id)
  const rawUrl = asString(item.url) || asString(item.full_link)

  if (postId && (!rawUrl || rawUrl === "#" || rawUrl === "/notifications")) {
    return appRoutes.postDetail(postId)
  }

  if (!rawUrl || rawUrl === "#") {
    return "/notifications"
  }

  if (/^\/?index\.php\?/i.test(rawUrl) || rawUrl.startsWith("?")) {
    return normalizeLegacyIndexUrl(rawUrl, item) || "/notifications"
  }

  try {
    const runtimeConfig = useRuntimeConfig(event)
    const parsedUrl = new URL(rawUrl)
    const requestHost = asString(getHeader(event, "host")).split(":")[0]
    const knownHosts = [
      asString(runtimeConfig.public.siteUrl),
      asString(runtimeConfig.public.backendWebBase),
    ].map((value) => {
      try {
        return value ? new URL(value).hostname : ""
      }
      catch {
        return ""
      }
    }).concat(requestHost).filter(Boolean)

    if (knownHosts.includes(parsedUrl.hostname)) {
      return normalizeKnownPath(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`)
    }

    return rawUrl
  }
  catch {
    return normalizeKnownPath(rawUrl)
  }
}

const normalizeIcon = (icon: unknown) => {
  const value = asString(icon).toLowerCase()

  if (value.includes("comment")) {
    return "i-ph-chat-circle-text-duotone"
  }
  if (value.includes("thumb") || value.includes("like") || value.includes("reaction")) {
    return "i-ph-thumbs-up-duotone"
  }
  if (value.includes("user") || value.includes("follow")) {
    return "i-ph-user-plus-duotone"
  }
  if (value.includes("share")) {
    return "i-ph-share-fat-duotone"
  }
  if (value.includes("story")) {
    return "i-ph-play-circle-duotone"
  }
  if (value.includes("event") || value.includes("calendar")) {
    return "i-ph-calendar-dots-duotone"
  }
  if (value.includes("group")) {
    return "i-ph-users-three-duotone"
  }
  if (value.includes("page")) {
    return "i-ph-flag-duotone"
  }
  if (value.includes("blog") || value.includes("forum") || value.includes("thread")) {
    return "i-ph-newspaper-duotone"
  }
  if (value.includes("job")) {
    return "i-ph-briefcase-duotone"
  }
  if (value.includes("gift")) {
    return "i-ph-gift-duotone"
  }
  if (value.includes("memory")) {
    return "i-ph-clock-counter-clockwise-duotone"
  }
  if (value.includes("admin")) {
    return "i-ph-shield-star-duotone"
  }
  if (value.includes("money") || value.includes("wallet") || value.includes("bank")) {
    return "i-ph-wallet-duotone"
  }
  if (value.includes("fund") || value.includes("donate")) {
    return "i-ph-hand-heart-duotone"
  }

  return "i-ph-bell-duotone"
}

export const normalizeNotificationSummary = (event: H3Event, response: BackendGeneralDataResponse) => {
  const resolveMediaUrl = createBackendMediaUrlResolver(event)
  const items = Array.isArray(response.notifications) ? response.notifications : []

  return {
    items: items.map((item) => {
      const notifierName = asString(item.notifier?.name)
      const body = asString(item.type_text) || asString(item.text)

      return {
        id: asString(item.id),
        type: asString(item.type),
        title: notifierName || "VNSEEA",
        body,
        url: normalizeNotificationUrl(event, item),
        avatarUrl: resolveMediaUrl(item.notifier?.avatar),
        icon: normalizeIcon(item.icon || item.type),
        isUnread: asNumber(item.seen) === 0,
        createdAt: asNumber(item.time),
        timeText: asString(item.time_text) || asString(item.time_text_string),
      }
    }).filter(item => item.id.length > 0),
    unreadCount: asNumber(response.new_notifications_count),
    hasMore: items.length >= 20,
    nextOffset: items.length > 0 ? asString(items[items.length - 1]?.id) || null : null,
  }
}

export async function fetchBackendNotifications(event: H3Event, options: { seen?: boolean, offset?: number | string } = {}) {
  const client = createBackendApiClient(event)

  const response = await client.post<BackendGeneralDataResponse>(
    backendRoutes.api.generalData,
    {
      fetch: "notifications",
      offset: options.offset || undefined,
      include_all_notifications: 1,
    },
    options.seen ? { seen: 1 } : undefined,
  )
  const apiStatus = asNumber(response.api_status)

  if (apiStatus < 200 || apiStatus >= 300) {
    throw createError({
      statusCode: apiStatus === 401 ? 401 : 400,
      statusMessage: response.errors?.error_text || "Unable to load notifications.",
      data: response,
    })
  }

  return response
}
