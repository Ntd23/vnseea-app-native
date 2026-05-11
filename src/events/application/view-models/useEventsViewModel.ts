// Events - useEventsViewModel ViewModel
// Port từ: client/src/events/application/view-models/

import { useState, useCallback } from 'react';
import { createEventsRepository } from '../../infrastructure/repositories/ApiEventsRepository';

const repository = createEventsRepository();

export function useEventsViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
