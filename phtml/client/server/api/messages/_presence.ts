// English description: Keeps a short-lived chat presence overlay for users seen by the Nuxt bridge.

type PresenceRecord = {
  online: boolean
  expiresAt: number
}

const PRESENCE_TTL_MS = 70_000
const presenceByUserId = new Map<number, PresenceRecord>()

export const markMessageUserOnline = (userId: number) => {
  if (userId <= 0) return false

  const wasOnline = getMessageUserPresenceState(userId) === true

  presenceByUserId.set(userId, {
    online: true,
    expiresAt: Date.now() + PRESENCE_TTL_MS,
  })

  return !wasOnline
}

export const markMessageUserOffline = (userId: number) => {
  if (userId <= 0) return false

  const wasOnline = getMessageUserPresenceState(userId) === true

  presenceByUserId.set(userId, {
    online: false,
    expiresAt: Date.now() + PRESENCE_TTL_MS,
  })

  return wasOnline
}

export const getMessageUserPresenceState = (userId: number) => {
  if (userId <= 0) return undefined

  const record = presenceByUserId.get(userId)

  if (!record) return undefined

  if (record.expiresAt <= Date.now()) {
    presenceByUserId.delete(userId)
    return undefined
  }

  return record.online
}
