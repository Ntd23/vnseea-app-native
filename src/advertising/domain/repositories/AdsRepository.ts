// Ads Repository Interface
import type { AdItem, AdFormData, CreateAdResult } from '../types/ads.types';

export interface AdsRepository {
  createAd(data: AdFormData): Promise<CreateAdResult>;
  getMyAds(): Promise<AdItem[]>;
  getAdById(id: number): Promise<AdItem | null>;
  updateAd(id: number, data: Partial<AdFormData>): Promise<boolean>;
  deleteAd(id: number): Promise<boolean>;
}
