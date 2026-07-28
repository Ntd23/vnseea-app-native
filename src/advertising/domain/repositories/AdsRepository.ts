// English description: Declares advertising campaign repository operations.
import type {
  AdItem,
  AdFormData,
  CreateAdResult,
  AdDailyStats,
  AdStatsSnapshot,
  AdsOptions,
} from '../types/ads.types';

export interface AdsRepository {
  createAd(data: AdFormData): Promise<CreateAdResult>;
  getMyAds(): Promise<AdItem[]>;
  getAdById(id: number): Promise<AdItem | null>;
  getAdStatsSnapshot(id: number): Promise<AdStatsSnapshot>;
  getAdDailyStats(id: number): Promise<AdDailyStats[]>;
  getOptions(): Promise<AdsOptions>;
  updateAd(id: number, data: Partial<AdFormData>): Promise<boolean>;
  deleteAd(id: number): Promise<boolean>;
}
