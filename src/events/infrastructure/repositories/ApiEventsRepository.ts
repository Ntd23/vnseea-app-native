// Description: Connects React Native event screens to the existing backend API.
// Events API Repository (Infrastructure)
// Port từ: client/src/events/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { EventsItem } from '../../domain/types/events.types';
import type {
  EventsRepository,
  EventFormData,
  CreateEventResult,
  EventGoingResult,
  EventInterestedResult,
} from '../../domain/repositories/EventsRepository';

type EventResponse = {
  api_status: number | string;
  event_id?: number;
  data?: EventsItem | EventsItem[];
  message?: string;
  message_data?: string;
  error_message?: string;
  errors?: {
    error_text?: string;
    message?: string;
  };
  go_status?: string;
  interest_status?: string;
};

type EventsListResponse = {
  api_status: number | string;
  events?: EventsItem[];
  data?: EventsItem[];
};

function extractEventsList(response: any, optionKey: string): EventsItem[] {
  if (!response) return [];
  const tabItems = response[optionKey];
  if (Array.isArray(tabItems)) return tabItems;
  if (Array.isArray(response.events)) return response.events;
  return Array.isArray(response.data) ? response.data : [];
}

function isSuccess(response: { api_status: number | string }) {
  return response.api_status === 200 || response.api_status === '200';
}

function getEventErrorMessage(response: EventResponse) {
  return (
    response.errors?.error_text ??
    response.errors?.message ??
    response.error_message ??
    response.message ??
    response.message_data ??
    `API error: ${response.api_status}`
  );
}

function formatDateForApi(dateStr: string): string {
  return dateStr || '';
}

function formatTimeForApi(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.length === 5) {
    return `${timeStr}:00`;
  }
  return timeStr;
}

function toEventPayload(data: EventFormData) {
  return {
    event_name: data.name,
    event_location: data.location,
    event_description: data.description,
    event_start_date: formatDateForApi(data.startDate),
    event_start_time: formatTimeForApi(data.startTime),
    event_end_date: formatDateForApi(data.endDate),
    event_end_time: formatTimeForApi(data.endTime),
  };
}

export function createEventsRepository(): EventsRepository {
  return {
    async getAll(): Promise<EventsItem[]> {
      try {
        // Call API with fetch=events to get all events
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'events,my_events' },  // Get both to know which are owned
        );

        if (isSuccess(response)) {
          const myEventIds = new Set((response.my_events || []).map((e: EventsItem) => String(e.id)));
          const events = response.events || [];
          // Mark owned events
          return events.map((event: EventsItem) => ({
            ...event,
            is_owner: myEventIds.has(String(event.id)),
          }));
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getAll error:', error);
        throw error;
      }
    },

    async getMyEvents(): Promise<EventsItem[]> {
      try {
        // Call API with fetch=my_events to get current user's events
        console.log('[ApiEventsRepository] Calling getMyEvents API...');
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'my_events' },
        );

        console.log('[ApiEventsRepository] getMyEvents raw response:', JSON.stringify(response, null, 2));

        if (isSuccess(response)) {
          // For my_events, events are in response.my_events
          const events = response.my_events || [];
          console.log('[ApiEventsRepository] getMyEvents parsed events:', events.length);
          // Mark all events as owned by current user
          return events.map((event: EventsItem) => ({
            ...event,
            is_owner: true,
          }));
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getMyEvents error:', error);
        throw error;
      }
    },

    async getGoingEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'going' },
        );

        if (isSuccess(response)) {
          return extractEventsList(response, 'going');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getGoingEvents error:', error);
        throw error;
      }
    },

    async getInterestedEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'interested' },
        );

        if (isSuccess(response)) {
          return extractEventsList(response, 'interested');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getInterestedEvents error:', error);
        throw error;
      }
    },

    async getInvitedEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'invited' },
        );

        if (isSuccess(response)) {
          return extractEventsList(response, 'invited');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getInvitedEvents error:', error);
        throw error;
      }
    },

    async getPastEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'past' },
        );

        if (isSuccess(response)) {
          return extractEventsList(response, 'past');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getPastEvents error:', error);
        throw error;
      }
    },

    async getById(id: string | number): Promise<EventsItem | null> {
      try {
        const [events, myEvents] = await Promise.all([
          this.getAll(),
          this.getMyEvents(),
        ]);
        const event = [...myEvents, ...events].find(item => String(item.id) === String(id));
        if (event) {
          return event;
        }
        return null;
      } catch (error) {
        console.error('[ApiEventsRepository] getById error:', error);
        return null;
      }
    },

    async createEvent(data: EventFormData): Promise<CreateEventResult> {
      const eventData = toEventPayload(data);
      const payload = {
        ...eventData,
        ...(data.image
          ? {
              event_cover: {
                uri: data.image,
                name: 'event_cover.jpg',
                type: 'image/jpeg',
              },
            }
          : {}),
      };

      // The Nuxt event bridge submits every create request as FormData.
      // Use the same wire format for RN, with event_cover remaining optional.
      const response = await apiBridge.multipart<EventResponse>(
        apiRoutes.events.create,
        payload,
      );

      if (isSuccess(response)) {
        return {
          eventId: response.event_id ?? 0,
          event: response.data as EventsItem,
        };
      }

      throw new Error(getEventErrorMessage(response));
    },

    async updateEvent(id: string | number, data: EventFormData): Promise<EventsItem> {
      const eventData = {
        type: 'edit',
        event_id: id,
        ...toEventPayload(data),
      };

      const isLocalFile = data.image && (
        data.image.startsWith('file://') ||
        data.image.startsWith('content://') ||
        !data.image.startsWith('http')
      );

      const response = isLocalFile
        ? await apiBridge.multipart<EventResponse>(apiRoutes.events.actions, {
            ...eventData,
            'event-cover': {
              uri: data.image,
              name: 'event_cover.jpg',
              type: 'image/jpeg',
            },
          })
        : await apiBridge.post<EventResponse>(apiRoutes.events.actions, eventData);

      if (isSuccess(response)) {
        return {
          id,
          name: data.name,
          location: data.location,
          description: data.description,
          start_date: data.startDate,
          start_time: data.startTime,
          end_date: data.endDate,
          end_time: data.endTime,
          cover: data.image,
          is_owner: true,
        };
      }

      throw new Error(response.message ?? response.message_data ?? 'Không cập nhật được sự kiện.');
    },

    async deleteEvent(id: string | number): Promise<boolean> {
      const response = await apiBridge.post<EventResponse>(apiRoutes.events.actions, {
        type: 'delete',
        event_id: id,
      });

      if (isSuccess(response)) {
        return true;
      }

      throw new Error(response.message ?? response.message_data ?? 'Không xóa được sự kiện.');
    },

    async toggleGoing(id: string | number): Promise<EventGoingResult> {
      const response = await apiBridge.post<EventResponse>(apiRoutes.events.going, {
        event_id: id,
      });

      if (!isSuccess(response)) {
        throw new Error(getEventErrorMessage(response));
      }

      return { isGoing: response.go_status === 'going' };
    },

    async toggleInterested(id: string | number): Promise<EventInterestedResult> {
      const response = await apiBridge.post<EventResponse>(apiRoutes.events.interested, {
        event_id: id,
      });

      if (!isSuccess(response)) {
        throw new Error(getEventErrorMessage(response));
      }

      return { isInterested: response.interest_status === 'interested' };
    },
  };
}
