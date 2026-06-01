// English description: Socket.IO notification relay that authenticates users and emits backend notification refresh signals.

import { createServer } from "node:http"
import { createHmac, timingSafeEqual } from "node:crypto"
import { Server } from "socket.io"

const port = Number(process.env.REALTIME_PORT || 3015)
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

const encodeJson = (statusCode, payload) => ({
  statusCode,
  body: JSON.stringify(payload),
})

const signPayload = (encodedPayload) =>
  createHmac("sha256", realtimeSecret)
    .update(encodedPayload)
    .digest("base64url")

const decodeBase64Url = (value) =>
  Buffer.from(value, "base64url")
    .toString("utf8")

const verifyRealtimeToken = (token) => {
  const [encodedPayload, signature] = String(token || "").split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload))

    if (!payload.userId || !payload.exp || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  }
  catch {
    return null
  }
}

const realtimeEventNames = {
  notification: ["notification:new", "notification:counts-changed"],
  request: ["request:new", "navigation:counts-changed"],
  message: ["messages:count", "navigation:counts-changed"],
  group_chat_request: ["group-chat-request:new", "navigation:counts-changed"],
  counts: ["navigation:counts-changed"],
}

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
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
        resolve(body ? JSON.parse(body) : {})
      }
      catch (error) {
        reject(error)
      }
    })

    request.on("error", reject)
  })

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

  if (request.method !== "POST" || request.url !== "/internal/notifications/publish") {
    send(encodeJson(404, { ok: false }))
    return
  }

  if (request.headers["x-realtime-secret"] !== realtimeSecret) {
    send(encodeJson(401, { ok: false }))
    return
  }

  try {
    const payload = await readJsonBody(request)
    const recipientId = String(payload.recipientId || "").trim()

    if (!recipientId) {
      send(encodeJson(400, { ok: false, message: "recipientId is required" }))
      return
    }

    const kind = String(payload.kind || "notification").trim()
    const eventNames = realtimeEventNames[kind] || realtimeEventNames.notification
    const eventPayload = {
      notificationId: String(payload.notificationId || ""),
      kind,
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

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  const payload = verifyRealtimeToken(token)

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

  socket.join(`user:${userId}`)
  socket.emit("notification:ready", { userId })

  socket.on("message:typing", (payload = {}) => {
    const recipientId = String(payload.recipientId || "").trim()

    if (!recipientId || recipientId === userId) {
      return
    }

    io.to(`user:${recipientId}`).emit("message:typing", {
      senderId: Number(userId) || userId,
    })
  })

  socket.on("message:typing-stop", (payload = {}) => {
    const recipientId = String(payload.recipientId || "").trim()

    if (!recipientId || recipientId === userId) {
      return
    }

    io.to(`user:${recipientId}`).emit("message:typing-stop", {
      senderId: Number(userId) || userId,
    })
  })
})

server.listen(port, host, () => {
  console.log(`vnseea-realtime listening on ${host}:${port}`)
})
