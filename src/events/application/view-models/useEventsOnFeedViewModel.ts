// Description: ViewModel for displaying events on the home feed.
// Fetches events from get-events API and formats/caches them.
import { useCallback, useEffect, useState } from 'react';
import { createEventsRepository } from '../../infrastructure/repositories/ApiEventsRepository';
import type { EventsItem } from '../../domain/types/events.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const repository = createEventsRepository();

export function useEventsOnFeedViewModel() {
  const [events, setEvents] = useState<EventsItem[]>(() => {
    return feedCacheStorage.getCachedEvents();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      // Call repository to get both all events and my events in parallel
      const allPromise = repository.getAll().catch(err => {
        console.error('[useEventsOnFeedViewModel] getAll error:', err);
        return [] as EventsItem[];
      });
      const myPromise = repository.getMyEvents().catch(err => {
        console.error('[useEventsOnFeedViewModel] getMyEvents error:', err);
        return [] as EventsItem[];
      });

      const [allEvents, myEvents] = await Promise.all([allPromise, myPromise]);

      // Merge and deduplicate by event ID
      const mergedMap = new Map<string | number, EventsItem>();
      allEvents.forEach(evt => {
        if (evt && evt.id) {
          mergedMap.set(evt.id, evt);
        }
      });
      myEvents.forEach(evt => {
        if (evt && evt.id) {
          mergedMap.set(evt.id, evt);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      setEvents(mergedList);
      feedCacheStorage.setCachedEvents(mergedList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách sự kiện');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const toggleInterested = useCallback((eventId: string | number) => {
    setEvents(prev =>
      prev.map(event => {
        if (event.id === eventId) {
          const isInterested = !event.is_interested;
          const count = Number(event.interested_count || 0);
          return {
            ...event,
            is_interested: isInterested,
            interested_count: isInterested ? count + 1 : Math.max(0, count - 1),
          };
        }
        return event;
      })
    );
  }, []);

  const toggleGoing = useCallback((eventId: string | number) => {
    setEvents(prev =>
      prev.map(event => {
        if (event.id === eventId) {
          const isGoing = !event.is_going;
          const count = Number(event.going_count || 0);
          return {
            ...event,
            is_going: isGoing,
            going_count: isGoing ? count + 1 : Math.max(0, count - 1),
          };
        }
        return event;
      })
    );
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    error,
    reloadEvents: fetchEvents,
    toggleInterested,
    toggleGoing,
  };
}
