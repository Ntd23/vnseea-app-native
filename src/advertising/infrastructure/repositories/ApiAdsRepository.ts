// English description: Maps advertising API responses to the app domain model.

import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import type { AdsRepository } from '../../domain/repositories/AdsRepository';
import type {
  AdItem,
  AdFormData,
  CreateAdResult,
  AdDailyStats,
  AdOption,
  AdPageOption,
  AdsOptions,
} from '../../domain/types/ads.types';

const ADS_ROUTE = apiRoutes.ads.main;

type AdsResponse = {
  api_status: number | string;
  data?: AdItem | AdItem[] | { ad: AdItem; clicks: Array<{ DateOnly: string; ADClicks: number; Spend: number }>; views: Array<{ DateOnly: string; ADviews: number; Spend: number }> };
  message?: string;
};

type RawOptionsResponse = {
  api_status: number | string;
  data?: {
    audience?: unknown;
    genders?: unknown;
    pages?: unknown;
    placements?: unknown;
    prices?: {
      clicks?: number | string;
      views?: number | string;
      currency?: string;
      currency_symbol?: string;
    };
  };
};

type RawWalletResponse = {
  wallet?: number | string;
};

function toNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOptions(value: unknown): AdOption[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return {
          value: String(record.id ?? record.value ?? index),
          label: String(record.name ?? record.label ?? record.text ?? record.id ?? index),
        };
      }
      return { value: String(index), label: String(item) };
    }).filter(item => item.value !== '0');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== '0')
      .map(([key, label]) => ({
        value: key,
        label: typeof label === 'object' && label !== null
          ? String((label as Record<string, unknown>).name ?? (label as Record<string, unknown>).label ?? key)
          : String(label),
      }));
  }

  return [];
}

function normalizePages(value: unknown): AdPageOption[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value as Record<string, unknown>)
      : [];

  return rows.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const page = item as Record<string, unknown>;
    const id = page.page_id ?? page.id;
    const name = page.page_name ?? page.username;
    if (id === undefined || name === undefined) return [];
    return [{
      id: String(id),
      name: String(name),
      title: String(page.page_title ?? page.name ?? name),
      avatar: page.avatar ? String(page.avatar) : undefined,
    }];
  });
}

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
      if (data.pageName) payload.page = data.pageName;
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

    async getAdDailyStats(id: number): Promise<AdDailyStats[]> {
      try {
        const response = await apiBridge.post<AdsResponse>(ADS_ROUTE, {
          type: 'fetch_ad_stats',
          ad_id: id,
        });

        if (response.api_status === 200 || response.api_status === '200') {
          const data = response.data as { ad: AdItem; clicks: Array<{ DateOnly: string; ADClicks: number; Spend: number }>; views: Array<{ DateOnly: string; ADviews: number; Spend: number }> };
          
          // Merge clicks and views data by date
          const statsMap = new Map<string, AdDailyStats>();
          
          // Process clicks data
          if (data.clicks) {
            data.clicks.forEach(click => {
              const date = click.DateOnly;
              statsMap.set(date, {
                date,
                views: 0,
                clicks: click.ADClicks,
                spent: click.Spend,
              });
            });
          }
          
          // Process views data and merge with clicks
          if (data.views) {
            data.views.forEach(view => {
              const date = view.DateOnly;
              const existing = statsMap.get(date);
              if (existing) {
                existing.views = view.ADviews;
                existing.spent = Math.max(existing.spent, view.Spend);
              } else {
                statsMap.set(date, {
                  date,
                  views: view.ADviews,
                  clicks: 0,
                  spent: view.Spend,
                });
              }
            });
          }
          
          // Convert map to array and sort by date descending
          return Array.from(statsMap.values()).sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }
        return [];
      } catch (error) {
        console.error('[ApiAdsRepository] getAdDailyStats error:', error);
        return [];
      }
    },

    async getOptions(): Promise<AdsOptions> {
      const optionsResponse = await apiBridge.post<RawOptionsResponse>(ADS_ROUTE, {
        type: 'fetch_options',
      });
      let walletResponse: RawWalletResponse = {};
      try {
        walletResponse = await apiBridge.get<RawWalletResponse>(apiRoutes.wallet.overview);
      } catch (error) {
        console.warn('[ApiAdsRepository] wallet balance unavailable:', error);
      }

      if (optionsResponse.api_status !== 200 && optionsResponse.api_status !== '200') {
        throw new Error('Không tải được tùy chọn quảng cáo.');
      }

      const data = optionsResponse.data ?? {};
      const pages = normalizePages(data.pages);
      const genders = normalizeOptions(data.genders);
      const backendPlacements = normalizeOptions(data.placements);
      const placementLabels = new Map(
        backendPlacements.map(item => [item.value, item.label]),
      );
      const placements: AdOption[] = [
        ['entire', 'Toàn bộ trang web'],
        ['post', 'Bài viết'],
        ['sidebar', 'Thanh bên'],
        ['jobs', 'Việc làm'],
        ['forum', 'Diễn đàn'],
        ['movies', 'Phim'],
        ['offer', 'Ưu đãi'],
        ['funding', 'Gây quỹ'],
        ['story', 'Tin'],
      ].map(([value, fallbackLabel]) => ({
        value,
        label: placementLabels.get(value) || fallbackLabel,
      }));

      return {
        audience: normalizeOptions(data.audience),
        genders: [
          { value: 'all', label: 'Tất cả' },
          ...genders.filter(item => item.value !== 'all'),
        ],
        pages,
        placements,
        clickPrice: toNumber(data.prices?.clicks),
        viewPrice: toNumber(data.prices?.views),
        currency: data.prices?.currency ?? 'VNSEEA',
        currencySymbol: data.prices?.currency_symbol ?? 'VNSEEA',
        walletBalance: toNumber(walletResponse.wallet),
      };
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
        if (data.pageName) payload.page = data.pageName;
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
