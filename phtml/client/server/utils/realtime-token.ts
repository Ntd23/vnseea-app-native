// English description: Creates and verifies short-lived HMAC tokens for the notification realtime service.

import { createHmac, timingSafeEqual } from "node:crypto"

type RealtimeTokenPayload = {
  userId: string
  exp: number
}

const encodeBase64Url = (value: string) =>
  Buffer.from(value, "utf8")
    .toString("base64url")

const decodeBase64Url = (value: string) =>
  Buffer.from(value, "base64url")
    .toString("utf8")

const signPayload = (encodedPayload: string, secret: string) =>
  createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url")

export function createRealtimeToken(userId: number | string, secret: string, ttlSeconds = 300) {
  const normalizedUserId = String(userId).trim()

  if (!normalizedUserId) {
    throw new Error("Realtime token requires a user id")
  }

  if (!secret.trim()) {
    throw new Error("Realtime token requires a secret")
  }

  const payload: RealtimeTokenPayload = {
    userId: normalizedUserId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, secret)

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: payload.exp,
  }
}

export function verifyRealtimeToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".")

  if (!encodedPayload || !signature || !secret.trim()) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as RealtimeTokenPayload

    if (!payload.userId || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  }
  catch {
    return null
  }
}
