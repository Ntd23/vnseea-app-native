// Ads Repository Interface
import type { AdItem, AdFormData, CreateAdResult, AdDailyStats } from '../types/ads.types';

export interface AdsRepository {
  createAd(data: AdFormData): Promise<CreateAdResult>;
  getMyAds(): Promise<AdItem[]>;
  getAdById(id: number): Promise<AdItem | null>;
  getAdDailyStats(id: number): Promise<AdDailyStats[]>;
  updateAd(id: number, data: Partial<AdFormData>): Promise<boolean>;
  deleteAd(id: number): Promise<boolean>;
}
