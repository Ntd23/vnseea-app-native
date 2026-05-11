// Notifications - useNotificationsViewModel ViewModel
// Port từ: client/src/notifications/application/view-models/

import { useState, useCallback } from 'react';
import { createNotificationsRepository } from '../../infrastructure/repositories/ApiNotificationsRepository';

const repository = createNotificationsRepository();

export function useNotificationsViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
