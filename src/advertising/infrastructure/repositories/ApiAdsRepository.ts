// English description: Maps advertising API responses to the app domain model.

import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import type { AdsRepository } from '../../domain/repositories/AdsRepository';
import type {
  AdItem,
  AdFormData,
  CreateAdResult,
  AdDailyStats,
  AdStatsSnapshot,
  AdOption,
  AdPageOption,
  AdsOptions,
} from '../../domain/types/ads.types';

const ADS_ROUTE = apiRoutes.ads.main;

type RawAdStatsRow = {
  DateOnly?: string;
  ADClicks?: number | string;
  ADviews?: number | string;
  Spend?: number | string;
};

type RawAdStatsData = {
  ad?: AdItem;
  clicks?: RawAdStatsRow[];
  views?: RawAdStatsRow[];
  server_time?: number | string;
};

type AdsResponse = {
  api_status: number | string;
  data?: AdItem | AdItem[] | RawAdStatsData;
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

export function mapAdStatsSnapshot(data: RawAdStatsData): AdStatsSnapshot {
  if (!data.ad) {
    throw new Error('Không tìm thấy dữ liệu chiến dịch quảng cáo.');
  }

  const statsMap = new Map<string, AdDailyStats>();
  const readDay = (date: unknown) => String(date ?? '').trim();
  const getOrCreateDay = (date: string) => {
    const existing = statsMap.get(date);
    if (existing) return existing;
    const created: AdDailyStats = { date, views: 0, clicks: 0, spent: 0 };
    statsMap.set(date, created);
    return created;
  };

  for (const row of data.clicks ?? []) {
    const date = readDay(row.DateOnly);
    if (!date) continue;
    const day = getOrCreateDay(date);
    day.clicks += toNumber(row.ADClicks);
    day.spent += toNumber(row.Spend);
  }

  for (const row of data.views ?? []) {
    const date = readDay(row.DateOnly);
    if (!date) continue;
    const day = getOrCreateDay(date);
    day.views += toNumber(row.ADviews);
    day.spent += toNumber(row.Spend);
  }

  const serverTime = toNumber(data.server_time);

  return {
    ad: data.ad,
    dailyStats: Array.from(statsMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
    fetchedAt: serverTime > 0 ? serverTime : Date.now(),
  };
}

function normalizeOptions(value: unknown): AdOption[] {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return {
            value: String(record.id ?? record.value ?? index),
            label: String(
              record.name ?? record.label ?? record.text ?? record.id ?? index,
            ),
          };
        }
        return { value: String(index), label: String(item) };
      })
      .filter(item => item.value !== '0');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== '0')
      .map(([key, label]) => ({
        value: key,
        label:
          typeof label === 'object' && label !== null
            ? String(
                (label as Record<string, unknown>).name ??
                  (label as Record<string, unknown>).label ??
                  key,
              )
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
    return [
      {
        id: String(id),
        name: String(name),
        title: String(page.page_title ?? page.name ?? name),
        avatar: page.avatar ? String(page.avatar) : undefined,
      },
    ];
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

    async getAdStatsSnapshot(id: number): Promise<AdStatsSnapshot> {
      const response = await apiBridge.post<AdsResponse>(ADS_ROUTE, {
        type: 'fetch_ad_stats',
        ad_id: id,
      });

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(
          response.message ?? 'Không tải được thống kê quảng cáo.',
        );
      }

      return mapAdStatsSnapshot((response.data ?? {}) as RawAdStatsData);
    },

    async getAdDailyStats(id: number): Promise<AdDailyStats[]> {
      try {
        const snapshot = await this.getAdStatsSnapshot(id);
        return snapshot.dailyStats;
      } catch (error) {
        console.error('[ApiAdsRepository] getAdDailyStats error:', error);
        return [];
      }
    },

    async getOptions(): Promise<AdsOptions> {
      const optionsResponse = await apiBridge.post<RawOptionsResponse>(
        ADS_ROUTE,
        {
          type: 'fetch_options',
        },
      );
      let walletResponse: RawWalletResponse = {};
      try {
        walletResponse = await apiBridge.get<RawWalletResponse>(
          apiRoutes.wallet.overview,
        );
      } catch (error) {
        console.warn('[ApiAdsRepository] wallet balance unavailable:', error);
      }

      if (
        optionsResponse.api_status !== 200 &&
        optionsResponse.api_status !== '200'
      ) {
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
        if (data.location) payload.location = data.location;
        if (data.gender) payload.gender = data.gender;
        if (data.bidding) payload.bidding = data.bidding;
        if (data.appears) payload.appears = data.appears;
        if (data.pageName) payload.page = data.pageName;
        if (data.startDate) payload.start = data.startDate;
        if (data.endDate) payload.end = data.endDate;
        if (data.budget) payload.budget = data.budget;

        // Check if media is a new local file to upload
        const isLocalFile =
          data.media &&
          (data.media.startsWith('file://') ||
            data.media.startsWith('content://') ||
            !data.media.startsWith('http'));

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
      } catch {
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
