// Events Repository Interface
// Port từ: client/src/events/domain/repositories/

import type { EventsItem } from '../types/events.types';

export interface EventFormData {
  name: string;
  startDate: string; // Format: YYYY-MM-DD
  startTime: string; // Format: HH:MM
  endDate: string;   // Format: YYYY-MM-DD
  endTime: string;   // Format: HH:MM
  location: string;
  description: string;
  image?: string; // local file URI for upload
}

export interface CreateEventResult {
  eventId: number;
  event: EventsItem;
}

export interface EventsRepository {
  getAll(): Promise<EventsItem[]>;
  getMyEvents(): Promise<EventsItem[]>;
  getGoingEvents(): Promise<EventsItem[]>;
  getInterestedEvents(): Promise<EventsItem[]>;
  getInvitedEvents(): Promise<EventsItem[]>;
  getPastEvents(): Promise<EventsItem[]>;
  getById(id: string | number): Promise<EventsItem | null>;
  createEvent(data: EventFormData): Promise<CreateEventResult>;
  updateEvent(id: string | number, data: EventFormData): Promise<EventsItem>;
  deleteEvent(id: string | number): Promise<boolean>;
}
