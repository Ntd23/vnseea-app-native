// Events API Repository (Infrastructure)
// Port từ: client/src/events/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { EventsItem } from '../../domain/types/events.types';
import type {
  EventsRepository,
  EventFormData,
  CreateEventResult,
} from '../../domain/repositories/EventsRepository';

type EventResponse = {
  api_status: number | string;
  event_id?: number;
  data?: EventsItem | EventsItem[];
  message?: string;
};

type EventsListResponse = {
  api_status: number | string;
  events?: EventsItem[];
  data?: EventsItem[];
};

function extractEventsList(response: any, optionKey: string): EventsItem[] {
  if (!response) return [];
  // Handle different key naming conventions returned by the WoWonder API for get-events options
  return response.events || response[optionKey] || response.data || [];
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

        if (response.api_status === 200 || response.api_status === '200') {
          const myEventIds = new Set((response.my_events || []).map((e: EventsItem) => e.id));
          const events = response.events || [];
          // Mark owned events
          return events.map((event: EventsItem) => ({
            ...event,
            is_owner: myEventIds.has(event.id),
          }));
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getAll error:', error);
        return [];
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

        if (response.api_status === 200 || response.api_status === '200') {
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
        return [];
      }
    },

    async getGoingEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'going' },
        );

        if (response.api_status === 200 || response.api_status === '200') {
          return extractEventsList(response, 'events'); // WoWonder typically returns under 'events' or 'going'
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getGoingEvents error:', error);
        return [];
      }
    },

    async getInterestedEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'interested' },
        );

        if (response.api_status === 200 || response.api_status === '200') {
          return extractEventsList(response, 'events');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getInterestedEvents error:', error);
        return [];
      }
    },

    async getInvitedEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'invited' },
        );

        if (response.api_status === 200 || response.api_status === '200') {
          return extractEventsList(response, 'events');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getInvitedEvents error:', error);
        return [];
      }
    },

    async getPastEvents(): Promise<EventsItem[]> {
      try {
        const response = await apiBridge.post<any>(
          apiRoutes.events.get,
          { fetch: 'past' },
        );

        if (response.api_status === 200 || response.api_status === '200') {
          return extractEventsList(response, 'events');
        }
        return [];
      } catch (error) {
        console.error('[ApiEventsRepository] getPastEvents error:', error);
        return [];
      }
    },

    async getById(id: string | number): Promise<EventsItem | null> {
      try {
        const response = await apiBridge.post<EventResponse>(
          apiRoutes.events.getById,
          { event_id: id },
        );
        if (response.data && !Array.isArray(response.data)) {
          return response.data as EventsItem;
        }
        return null;
      } catch (error) {
        console.error('[ApiEventsRepository] getById error:', error);
        return null;
      }
    },

    async createEvent(data: EventFormData): Promise<CreateEventResult> {
      // Format date/time for WoWonder API
      // Input is already string like "2024-01-15" or "14:30"
      const formatDateForApi = (dateStr: string): string => {
        if (!dateStr) return '';
        // Already in YYYY-MM-DD format from CreateEventScreen
        return dateStr;
      };

      const formatTimeForApi = (timeStr: string): string => {
        if (!timeStr) return '';
        // Already in HH:MM format from CreateEventScreen
        // Ensure format is HH:MM:SS
        if (timeStr.length === 5) {
          return `${timeStr}:00`;
        }
        return timeStr;
      }

      // Prepare form data with correct field names as expected by backend
      const eventData = {
        event_name: data.name,
        event_location: data.location,
        event_description: data.description,
        event_start_date: formatDateForApi(data.startDate),
        event_start_time: formatTimeForApi(data.startTime),
        event_end_date: formatDateForApi(data.endDate),
        event_end_time: formatTimeForApi(data.endTime),
      };

      if (data.image) {
        // Upload with image using multipart
        // NOTE: multipart will build FormData from eventData object
        console.log('[ApiEventsRepository] Creating event WITH image...');
        const response = await apiBridge.multipart<EventResponse>(
          apiRoutes.events.create,
          {
            ...eventData,
            event_cover: {
              uri: data.image,
              name: 'event_cover.jpg',
              type: 'image/jpeg',
            },
          },
        );

        console.log('[ApiEventsRepository] Response:', response);

        if (response.api_status === 200 || response.api_status === '200') {
          return {
            eventId: response.event_id ?? 0,
            event: response.data as EventsItem,
          };
        }
        console.error('[ApiEventsRepository] API error:', response);
        throw new Error(response.message ?? `API error: ${response.api_status}`);
      } else {
        // Upload without image
        console.log('[ApiEventsRepository] Creating event WITHOUT image...');
        console.log('[ApiEventsRepository] Event data:', eventData);
        const response = await apiBridge.post<EventResponse>(
          apiRoutes.events.create,
          eventData,
        );

        console.log('[ApiEventsRepository] Response:', response);

        if (response.api_status === 200 || response.api_status === '200') {
          return {
            eventId: response.event_id ?? 0,
            event: response.data as EventsItem,
          };
        }
        console.error('[ApiEventsRepository] API error:', response);
        throw new Error(response.message ?? `API error: ${response.api_status}`);
      }
    },
  };
}
