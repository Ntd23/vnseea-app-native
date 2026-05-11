// Messages - useMessagesViewModel ViewModel
// Port từ: client/src/messages/application/view-models/

import { useState, useCallback } from 'react';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';

const repository = createMessagesRepository();

export function useMessagesViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
