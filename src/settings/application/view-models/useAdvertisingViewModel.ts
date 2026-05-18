// Description: Provides mock data for the Advertising screen (UI-only phase).
import { useState } from 'react';

export interface AdCampaign {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'ended';
  budget: number;
  reach: number;
  startDate: string;
  endDate: string;
}

const MOCK_ADS: AdCampaign[] = [];

export function useAdvertisingViewModel() {
  const [ads] = useState<AdCampaign[]>(MOCK_ADS);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return { ads, isLoading, error };
}
