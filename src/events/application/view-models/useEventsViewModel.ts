// Description: Coordinates event tab lists, mutation state, and RSVP actions for React Native screens.
// Events - useEventsViewModel ViewModel
// Port từ: client/src/events/application/view-models/

import { useState, useCallback } from 'react';
import { createEventsRepository } from '../../infrastructure/repositories/ApiEventsRepository';
import type { EventsItem } from '../../domain/types/events.types';
import type { EventFormData } from '../../domain/repositories/EventsRepository';

export type EventsTab =
  | 'browse'
  | 'going'
  | 'invited'
  | 'interested'
  | 'past'
  | 'mine';

const repository = createEventsRepository();

export function useEventsViewModel() {
  const [events, setEvents] = useState<EventsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const loadEventsTab = useCallback(async (tab: EventsTab) => {
    switch (tab) {
      case 'going':
        await fetchGoingEvents();
        return;
      case 'invited':
        await fetchInvitedEvents();
        return;
      case 'interested':
        await fetchInterestedEvents();
        return;
      case 'past':
        await fetchPastEvents();
        return;
      case 'mine':
        await fetchMyEvents();
        return;
      default:
        await fetchEvents();
    }
  }, [
    fetchEvents,
    fetchGoingEvents,
    fetchInterestedEvents,
    fetchInvitedEvents,
    fetchMyEvents,
    fetchPastEvents,
  ]);

  const createEvent = useCallback(async (
    data: EventFormData,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await repository.createEvent(data);
      // Prepend new event to the list
      setEvents(prev => [result.event, ...prev]);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log('[useEventsViewModel] Create event error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateEvent = useCallback(async (
    id: string | number,
    data: EventFormData,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsUpdating(true);
    setError(null);
    try {
      const updatedEvent = await repository.updateEvent(id, data);
      setEvents(prev => prev.map(event => (
        String(event.id) === String(id)
          ? { ...event, ...updatedEvent, id }
          : event
      )));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteEvent = useCallback(async (
    id: string | number,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsDeleting(true);
    setError(null);
    try {
      await repository.deleteEvent(id);
      setEvents(prev => prev.filter(event => String(event.id) !== String(id)));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const toggleGoing = useCallback(async (
    id: string | number,
  ): Promise<{ success: boolean; isGoing?: boolean; error?: string }> => {
    try {
      const result = await repository.toggleGoing(id);
      setEvents(previous => previous.map(event => (
        String(event.id) === String(id)
          ? { ...event, is_going: result.isGoing }
          : event
      )));
      return { success: true, isGoing: result.isGoing };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const toggleInterested = useCallback(async (
    id: string | number,
  ): Promise<{ success: boolean; isInterested?: boolean; error?: string }> => {
    try {
      const result = await repository.toggleInterested(id);
      setEvents(previous => previous.map(event => (
        String(event.id) === String(id)
          ? { ...event, is_interested: result.isInterested }
          : event
      )));
      return { success: true, isInterested: result.isInterested };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    events,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    fetchEvents,
    fetchMyEvents,
    fetchGoingEvents,
    fetchInterestedEvents,
    fetchInvitedEvents,
    fetchPastEvents,
    loadEventsTab,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleGoing,
    toggleInterested,
  };
}
