// English description: Nuxt API backed implementation of the notification center repository.

import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"
import type { NotificationsRepository } from "../../domain/repositories/NotificationsRepository"
import type { NotificationSummary, RealtimeTokenResponse } from "../../domain/types/notification.types"

const notificationApiRoutes = {
  summary: "notifications",
  read: "notifications/read",
  readOne: "notifications/read-one",
  delete: "notifications/delete",
  sound: "notifications/sound",
  realtimeToken: "realtime/token",
} as const

export function createApiNotificationsRepository(): NotificationsRepository {
  const client = useNuxtApiClient()

  return {
    getSummary: query => client.get<NotificationSummary>(notificationApiRoutes.summary, query),
    markRead: () => client.post<NotificationSummary>(notificationApiRoutes.read),
    markOneRead: id => client.post<NotificationSummary>(notificationApiRoutes.readOne, { id }),
    deleteNotification: async (id) => {
      await client.post<{ ok: true }>(notificationApiRoutes.delete, { id })
    },
    toggleSound: () => client.post(notificationApiRoutes.sound),
    getRealtimeToken: () => client.get<RealtimeTokenResponse>(notificationApiRoutes.realtimeToken),
  }
}
