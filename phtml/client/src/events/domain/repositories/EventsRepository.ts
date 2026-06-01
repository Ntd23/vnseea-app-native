// English description: Repository contract for backend-backed event catalog, detail, attendee, creation, RSVP, and event-post operations.

import type {
  EventAttendeeKind,
  EventAttendeeRecord,
  EventCreateDraft,
  EventPostsRecord,
  EventRecord,
  EventsCatalogRecord,
  EventRsvpResult,
} from "../types/events.types"

export interface EventsRepository {
  getCatalog(): Promise<EventsCatalogRecord>
  getEventById(id: string | number): Promise<EventRecord | null>
  getPosts(id: string | number, input?: { limit?: number; afterPostId?: number }): Promise<EventPostsRecord>
  getAttendees(id: string | number, kind: EventAttendeeKind): Promise<EventAttendeeRecord[]>
  createEvent(input: EventCreateDraft): Promise<EventRecord>
  setGoing(id: string | number): Promise<EventRsvpResult>
  setInterested(id: string | number): Promise<EventRsvpResult>
}
