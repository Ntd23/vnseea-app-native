// Settings - useSettingsViewModel ViewModel
// Port từ: client/src/settings/application/view-models/

import { useState, useCallback } from 'react';
import { createSettingsRepository } from '../../infrastructure/repositories/ApiSettingsRepository';

const repository = createSettingsRepository();

export function useSettingsViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: implement state & handlers

  return {
    isLoading,
    error,
  };
}
