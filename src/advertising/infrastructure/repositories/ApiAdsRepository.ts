// Ads API Repository (Infrastructure)

import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import type { AdsRepository } from '../../domain/repositories/AdsRepository';
import type { AdItem, AdFormData, CreateAdResult } from '../../domain/types/ads.types';

const ADS_ROUTE = apiRoutes.ads.main;

type AdsResponse = {
  api_status: number | string;
  data?: AdItem | AdItem[];
  message?: string;
};

export function createAdsRepository(): AdsRepository {
  return {
    async createAd(data: AdFormData): Promise<CreateAdResult> {
      if (!data.media) {
        throw new Error('Vui lòng chọn hình ảnh quảng cáo.');
      }

      const payload: Record<string, unknown> = {
        type: 'create',
        name: data.name,
        website: data.website,
        headline: data.headline,
        description: data.description,
        'audience-list': data.audienceList,
        location: data.location ?? data.audienceList,
        gender: data.gender,
        bidding: data.bidding,
        appears: data.appears,
      };

      // Add optional fields
      if (data.pageId) payload.page = data.pageId;
      if (data.startDate) payload.start = data.startDate;
      if (data.endDate) payload.end = data.endDate;
      if (data.budget) payload.budget = data.budget;

      const response = await apiBridge.multipart<AdsResponse>(ADS_ROUTE, {
        ...payload,
        media: {
          uri: data.media,
          name: data.mediaName ?? `ad_media_${Date.now()}.jpg`,
          type: data.mediaType ?? 'image/jpeg',
        },
      });

      if (response.api_status === 200 || response.api_status === '200') {
        return {
          adId: (response.data as AdItem)?.id ?? 0,
          ad: response.data as AdItem,
        };
      }
      throw new Error(response.message ?? 'Không tạo được quảng cáo.');
    },

    async getMyAds(): Promise<AdItem[]> {
      try {
        const response = await apiBridge.post<AdsResponse>(ADS_ROUTE, {
          type: 'fetch_ads',
          limit: 50,
          offset: 0,
        });

        if (response.api_status === 200 || response.api_status === '200') {
          const ads = response.data;
          return Array.isArray(ads) ? ads : [];
        }
        return [];
      } catch (error) {
        console.error('[ApiAdsRepository] getMyAds error:', error);
        return [];
      }
    },

    async getAdById(id: number): Promise<AdItem | null> {
      try {
        const response = await apiBridge.post<AdsResponse>(ADS_ROUTE, {
          type: 'fetch_ad_by_id',
          ad_id: id,
        });

        if (response.api_status === 200 || response.api_status === '200') {
          return response.data as AdItem;
        }
        return null;
      } catch (error) {
        console.error('[ApiAdsRepository] getAdById error:', error);
        return null;
      }
    },

    async updateAd(id: number, data: Partial<AdFormData>): Promise<boolean> {
      try {
        const payload: Record<string, unknown> = {
          type: 'edit',
          ad_id: id,
        };

        if (data.name) payload.name = data.name;
        if (data.website) payload.website = data.website;
        if (data.headline) payload.headline = data.headline;
        if (data.description) payload.description = data.description;
        if (data.audienceList) payload['audience-list'] = data.audienceList;
        if (data.gender) payload.gender = data.gender;
        if (data.bidding) payload.bidding = data.bidding;
        if (data.appears) payload.appears = data.appears;
        if (data.pageId) payload.page = data.pageId;
        if (data.startDate) payload.start = data.startDate;
        if (data.endDate) payload.end = data.endDate;
        if (data.budget) payload.budget = data.budget;

        // Check if media is a new local file to upload
        const isLocalFile = data.media && (
          data.media.startsWith('file://') ||
          data.media.startsWith('content://') ||
          !data.media.startsWith('http')
        );

        let response;
        if (isLocalFile) {
          response = await apiBridge.multipart<AdsResponse>(ADS_ROUTE, {
            ...payload,
            media: {
              uri: data.media,
              name: data.mediaName ?? `ad_media_${Date.now()}.jpg`,
              type: data.mediaType ?? 'image/jpeg',
            },
          });
        } else {
          response = await apiBridge.post<AdsResponse>(ADS_ROUTE, payload);
        }

        return response.api_status === 200 || response.api_status === '200';
      } catch (error) {
        console.error('[ApiAdsRepository] updateAd error:', error);
        return false;
      }
    },

    async deleteAd(id: number): Promise<boolean> {
      try {
        const response = await apiBridge.post<AdsResponse>(ADS_ROUTE, {
          type: 'delete',
          ad_id: id,
        });

        return response.api_status === 200 || response.api_status === '200';
      } catch (error) {
        console.error('[ApiAdsRepository] deleteAd error:', error);
        return false;
      }
    },
  };
}
