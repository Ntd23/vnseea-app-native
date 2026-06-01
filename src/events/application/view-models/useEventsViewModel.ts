// Events - useEventsViewModel ViewModel
// Port từ: client/src/events/application/view-models/

import { useState, useCallback } from 'react';
import { createEventsRepository } from '../../infrastructure/repositories/ApiEventsRepository';
import type { EventsItem } from '../../domain/types/events.types';
import type { EventFormData } from '../../domain/repositories/EventsRepository';

const repository = createEventsRepository();

export function useEventsViewModel() {
  const [events, setEvents] = useState<EventsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getAll();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách sự kiện');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getMyEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sự kiện của bạn');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGoingEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getGoingEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sự kiện đang tham gia');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInterestedEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getInterestedEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sự kiện quan tâm');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInvitedEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getInvitedEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sự kiện được mời');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPastEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getPastEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sự kiện đã kết thúc');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (data: EventFormData): Promise<boolean> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await repository.createEvent(data);
      // Prepend new event to the list
      setEvents(prev => [result.event, ...prev]);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log('[useEventsViewModel] Create event error:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    events,
    isLoading,
    isCreating,
    error,
    fetchEvents,
    fetchMyEvents,
    fetchGoingEvents,
    fetchInterestedEvents,
    fetchInvitedEvents,
    fetchPastEvents,
    createEvent,
  };
}
