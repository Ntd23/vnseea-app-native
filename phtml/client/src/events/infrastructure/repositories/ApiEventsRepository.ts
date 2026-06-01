// English description: Nuxt API backed repository for the events bounded context.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { EventsRepository } from "../../domain/repositories/EventsRepository"
import type {
  EventAttendeeKind,
  EventAttendeeRecord,
  EventCreateDraft,
  EventPostsRecord,
  EventRecord,
  EventsCatalogRecord,
  EventRsvpResult,
} from "../../domain/types/events.types"

export function createApiEventsRepository(): EventsRepository {
  const client = useNuxtApiClient()

  return {
    async getCatalog() {
      return await client.get<EventsCatalogRecord>(apiRoutes.events.catalog)
    },
    async getEventById(id) {
      return await client.get<EventRecord | null>(apiRoutes.events.detail(id))
    },
    async getPosts(id, input) {
      return await client.get<EventPostsRecord>(apiRoutes.events.posts(id), {
        limit: input?.limit,
        afterPostId: input?.afterPostId,
      })
    },
    async getAttendees(id, kind) {
      return await client.get<EventAttendeeRecord[]>(apiRoutes.events.attendees(id), { kind })
    },
    async createEvent(input: EventCreateDraft) {
      if (input.coverFile) {
        const formData = new FormData()
        formData.append("name", input.name)
        formData.append("location", input.location)
        formData.append("description", input.description)
        formData.append("startDate", input.startDate)
        formData.append("startTime", input.startTime)
        formData.append("endDate", input.endDate)
        formData.append("endTime", input.endTime)
        formData.append("coverFile", input.coverFile, input.coverFile.name)

        return await client.post<EventRecord, FormData>(apiRoutes.events.create, formData)
      }

      return await client.post<EventRecord, EventCreateDraft>(apiRoutes.events.create, input)
    },
    async setGoing(id) {
      return await client.post<EventRsvpResult>(apiRoutes.events.going(id))
    },
    async setInterested(id) {
      return await client.post<EventRsvpResult>(apiRoutes.events.interested(id))
    },
  }
}
