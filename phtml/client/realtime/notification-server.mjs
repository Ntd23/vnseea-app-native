// English description: Socket.IO relay for notifications, message presence, typing, and per-post invalidation rooms.

import { createServer } from "node:http"
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { Server } from "socket.io"

const encodeJson = (statusCode, payload) => ({
  statusCode,
  body: JSON.stringify(payload),
})

const decodeBase64Url = value => Buffer.from(value, "base64url").toString("utf8")

const readJsonBody = request =>
  new Promise((resolveBody, reject) => {
    let body = ""
    request.on("data", (chunk) => {
      body += chunk
      if (body.length > 1024 * 64) {
        reject(new Error("Payload too large"))
        request.destroy()
      }
    })
    request.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {})
      }
      catch (error) {
        reject(error)
      }
    })
    request.on("error", reject)
  })

const realtimeEventNames = {
  notification: ["notification:new", "notification:counts-changed"],
  request: ["request:new", "navigation:counts-changed"],
  message: ["messages:count", "navigation:counts-changed"],
  relationship: ["relationship:changed"],
  group_chat_request: ["group-chat-request:new", "navigation:counts-changed"],
  counts: ["navigation:counts-changed"],
}

const postMutations = new Set(["reaction", "comment", "share", "edited", "deleted"])
const directCallEvents = new Map([
  ["incoming", "livekit_call_incoming"],
  ["answered", "livekit_call_answered"],
  ["declined", "livekit_call_declined"],
  ["closed", "livekit_call_closed"],
])
const groupCallEvents = new Map([
  ["incoming", "livekit_group_call_incoming"],
  ["sync", "livekit_group_call_sync"],
  ["closed", "livekit_group_call_closed"],
])

const normalizePostIds = (values, limit = 50) =>
  Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map(value => String(value).trim())
      .filter(value => /^[1-9][0-9]*$/.test(value)),
  )).slice(0, limit)

const normalizePresenceUserIds = (values, limit = 200) =>
  Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map(value => String(value).trim())
      .filter(value => /^[1-9][0-9]*$/.test(value)),
  )).slice(0, limit)

const normalizeUserIds = (values, limit = 1000) =>
  Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map(value => String(value).trim())
      .filter(value => /^[1-9][0-9]*$/.test(value)),
  )).slice(0, limit)

export function createRealtimeRelay({
  realtimeSecret,
  corsOrigin = ["*"],
} = {}) {
  const secret = String(realtimeSecret || "").trim()
  if (!secret) {
    throw new Error("REALTIME_SECRET is required for vnseea-realtime.")
  }

  const signPayload = encodedPayload =>
    createHmac("sha256", secret)
      .update(encodedPayload)
      .digest("base64url")

  const verifyRealtimeToken = token => {
    const [encodedPayload, signature] = String(token || "").split(".")
    if (!encodedPayload || !signature) return null
    const expectedSignature = signPayload(encodedPayload)
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (
      signatureBuffer.length !== expectedBuffer.length
      || !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null
    }
    try {
      const payload = JSON.parse(decodeBase64Url(encodedPayload))
      if (
        !payload.userId
        || !payload.exp
        || Number(payload.exp) <= Math.floor(Date.now() / 1000)
      ) {
        return null
      }
      return payload
    }
    catch {
      return null
    }
  }

  let io
  const server = createServer(async (request, response) => {
    const send = ({ statusCode, body }) => {
      response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
      })
      response.end(body)
    }

    if (request.method === "GET" && request.url === "/healthz") {
      send(encodeJson(200, { ok: true }))
      return
    }

    const internalRoute = request.method === "POST"
      && (
        request.url === "/internal/notifications/publish"
        || request.url === "/internal/posts/publish"
        || request.url === "/internal/messages/presence/publish"
        || request.url === "/internal/livekit-call/publish"
      )
    if (!internalRoute) {
      send(encodeJson(404, { ok: false }))
      return
    }
    if (request.headers["x-realtime-secret"] !== secret) {
      send(encodeJson(401, { ok: false }))
      return
    }

    try {
      const payload = await readJsonBody(request)
      if (request.url === "/internal/livekit-call/publish") {
        const context = payload.context === "group" ? "group" : "direct"
        const event = String(payload.event || "").trim()
        const callId = String(payload.call_id || "").trim()
        const eventName = context === "group"
          ? groupCallEvents.get(event)
          : directCallEvents.get(event)
        if (!eventName || !/^[1-9][0-9]*$/.test(callId)) {
          send(encodeJson(400, { ok: false, message: "Invalid call change" }))
          return
        }

        let recipientIds
        if (context === "group") {
          recipientIds = normalizeUserIds(payload.recipient_ids)
        }
        else {
          const fromId = String(payload.from_id || "").trim()
          const toId = String(payload.to_id || "").trim()
          if (!/^[1-9][0-9]*$/.test(fromId) || !/^[1-9][0-9]*$/.test(toId)) {
            send(encodeJson(400, { ok: false, message: "Invalid call participants" }))
            return
          }
          recipientIds = event === "incoming"
            ? [toId]
            : normalizeUserIds([fromId, toId])
        }

        if (recipientIds.length === 0) {
          send(encodeJson(400, { ok: false, message: "Call recipients are required" }))
          return
        }
        recipientIds.forEach((recipientId) => {
          io.to(`user:${recipientId}`).emit(eventName, payload)
        })
        send(encodeJson(200, {
          ok: true,
          event: eventName,
          recipients: recipientIds.length,
        }))
        return
      }

      if (request.url === "/internal/posts/publish") {
        const postId = String(payload.postId || "").trim()
        const mutation = String(payload.mutation || "").trim()
        if (!/^[1-9][0-9]*$/.test(postId) || !postMutations.has(mutation)) {
          send(encodeJson(400, { ok: false, message: "Invalid post change" }))
          return
        }
        const eventPayload = {
          eventId: String(payload.eventId || randomUUID()),
          postId,
          mutation,
          occurredAt: Number(payload.occurredAt) || Date.now(),
        }
        io.to(`post:${postId}`).emit("post:changed", eventPayload)
        send(encodeJson(200, { ok: true, eventId: eventPayload.eventId }))
        return
      }

      if (request.url === "/internal/messages/presence/publish") {
        const userId = String(payload.userId || "").trim()
        const online = payload.online

        if (!/^[1-9][0-9]*$/.test(userId) || typeof online !== "boolean") {
          send(encodeJson(400, { ok: false, message: "Invalid presence change" }))
          return
        }

        const eventPayload = {
          eventId: String(payload.eventId || randomUUID()),
          userId: Number(userId),
          online,
          occurredAt: Number(payload.occurredAt) || Date.now(),
        }
        io.to(`presence:${userId}`).emit("message:presence", eventPayload)
        send(encodeJson(200, { ok: true, eventId: eventPayload.eventId }))
        return
      }

      const recipientId = String(payload.recipientId || "").trim()
      if (!recipientId) {
        send(encodeJson(400, { ok: false, message: "recipientId is required" }))
        return
      }
      const kind = String(payload.kind || "notification").trim()
      const eventNames = realtimeEventNames[kind] || realtimeEventNames.notification
      if (kind === "relationship" && Array.isArray(payload.relationships)) {
        let emitted = 0
        payload.relationships.slice(0, 10).forEach(relationship => {
          const relationshipRecipientId = String(relationship?.recipientId || "").trim()
          const peerUserId = String(relationship?.peerUserId || "").trim()
          if (
            !/^[1-9][0-9]*$/.test(relationshipRecipientId)
            || !/^[1-9][0-9]*$/.test(peerUserId)
            || relationshipRecipientId === peerUserId
          ) return
          io.to(`user:${relationshipRecipientId}`).emit("relationship:changed", {
            kind,
            peerUserId,
            occurredAt: Number(relationship?.occurredAt) || Date.now(),
            isFollowing: Boolean(Number(relationship?.isFollowing)),
            isFollower: Boolean(Number(relationship?.isFollower)),
          })
          emitted += 1
        })
        if (emitted === 0) {
          send(encodeJson(400, { ok: false, message: "Invalid relationship change" }))
          return
        }
        send(encodeJson(200, { ok: true }))
        return
      }
      const eventPayload = {
        notificationId: String(payload.notificationId || ""),
        kind,
      }
      if (kind === "relationship") {
        const peerUserId = String(payload.peerUserId || "").trim()
        if (!/^[1-9][0-9]*$/.test(peerUserId) || peerUserId === recipientId) {
          send(encodeJson(400, { ok: false, message: "Invalid relationship change" }))
          return
        }
        eventPayload.peerUserId = peerUserId
        eventPayload.occurredAt = Number(payload.occurredAt) || Date.now()
        eventPayload.isFollowing = Boolean(Number(payload.isFollowing))
        eventPayload.isFollower = Boolean(Number(payload.isFollower))
      }
      eventNames.forEach((eventName) => {
        io.to(`user:${recipientId}`).emit(eventName, eventPayload)
      })
      send(encodeJson(200, { ok: true }))
    }
    catch {
      send(encodeJson(400, { ok: false }))
    }
  })

  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const payload = verifyRealtimeToken(socket.handshake.auth?.token)
    if (!payload) {
      next(new Error("Unauthorized"))
      return
    }
    socket.data.userId = String(payload.userId)
    next()
  })

  io.on("connection", (socket) => {
    const userId = String(socket.data.userId || "")
    if (!userId) {
      socket.disconnect(true)
      return
    }

    const watchedPostIds = new Set()
    const watchedPresenceUserIds = new Set()
    socket.join(`user:${userId}`)
    socket.emit("notification:ready", { userId })

    socket.on("posts:watch", (payload = {}, acknowledge) => {
      const available = Math.max(0, 50 - watchedPostIds.size)
      const postIds = normalizePostIds(payload.postIds, available)
      postIds.forEach((postId) => {
        watchedPostIds.add(postId)
        socket.join(`post:${postId}`)
      })
      if (typeof acknowledge === "function") {
        acknowledge({ watched: watchedPostIds.size, accepted: postIds })
      }
    })

    socket.on("posts:unwatch", (payload = {}, acknowledge) => {
      const postIds = normalizePostIds(payload.postIds)
      postIds.forEach((postId) => {
        watchedPostIds.delete(postId)
        socket.leave(`post:${postId}`)
      })
      if (typeof acknowledge === "function") {
        acknowledge({ watched: watchedPostIds.size })
      }
    })

    socket.on("message:presence:watch", (payload = {}, acknowledge) => {
      const userIds = normalizePresenceUserIds(payload.userIds)
      const nextUserIds = new Set(userIds)

      watchedPresenceUserIds.forEach((watchedUserId) => {
        if (!nextUserIds.has(watchedUserId)) {
          watchedPresenceUserIds.delete(watchedUserId)
          socket.leave(`presence:${watchedUserId}`)
        }
      })

      userIds.forEach((watchedUserId) => {
        if (!watchedPresenceUserIds.has(watchedUserId)) {
          watchedPresenceUserIds.add(watchedUserId)
          socket.join(`presence:${watchedUserId}`)
        }
      })

      if (typeof acknowledge === "function") {
        acknowledge({
          watched: watchedPresenceUserIds.size,
          accepted: [...watchedPresenceUserIds],
        })
      }
    })

    socket.on("message:typing", (payload = {}) => {
      const recipientId = String(payload.recipientId || "").trim()
      if (!recipientId || recipientId === userId) return
      io.to(`user:${recipientId}`).emit("message:typing", {
        senderId: Number(userId) || userId,
      })
    })

    socket.on("message:typing-stop", (payload = {}) => {
      const recipientId = String(payload.recipientId || "").trim()
      if (!recipientId || recipientId === userId) return
      io.to(`user:${recipientId}`).emit("message:typing-stop", {
        senderId: Number(userId) || userId,
      })
    })
  })

  return {
    server,
    io,
    close: () =>
      new Promise((resolveClose) => {
        io.close(() => {
          if (!server.listening) {
            resolveClose()
            return
          }
          server.close(() => resolveClose())
        })
      }),
  }
}

const currentModulePath = fileURLToPath(import.meta.url)
const entryModulePaths = [process.argv[1], process.env.pm_exec_path]
  .filter(Boolean)
  .map(entryPath => resolve(entryPath))
const isMainModule = entryModulePaths.some(entryPath => entryPath === currentModulePath)

if (isMainModule) {
  const port = Number(process.env.REALTIME_PORT || 3025)
  const host = process.env.REALTIME_HOST || "0.0.0.0"
  const realtimeSecret = String(process.env.REALTIME_SECRET || "").trim()
  const corsOrigin = (process.env.REALTIME_CORS_ORIGIN || "*")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)

  if (!realtimeSecret) {
    console.error("REALTIME_SECRET is required for vnseea-realtime.")
    process.exit(1)
  }

  const relay = createRealtimeRelay({ realtimeSecret, corsOrigin })
  relay.server.listen(port, host, () => {
    console.log(`vnseea-realtime listening on ${host}:${port}`)
  })
}
