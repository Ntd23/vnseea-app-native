// Description: Offer API Repository
// Port từ: client/src/offers/infrastructure/repositories/

import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { OffersRepository } from '../../domain/repositories/OffersRepository';
import type { OfferItem } from '../../domain/types/offers.types';

const siteRoot = 'https://v2.vnseea.vn';

type OffersApiResponse = {
  api_status: number;
  data?: Record<string, unknown>[];
};

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

export function createOffersRepository(): OffersRepository {
  return {
    async getOffers(options = {}) {
      const { limit = 20, offset = 0 } = options;

      const response = await apiBridge.post<OffersApiResponse>('offer', {
        type: 'get',
        limit,
        offset,
      });

      if (response.api_status !== 200) {
        console.warn('[ApiOffersRepository] getOffers failed:', response);
        return [];
      }

      return (response.data ?? []).map(mapOfferItem);
    },
  };
}

function mapOfferItem(raw: Record<string, unknown>): OfferItem {
  const page = asRecord(raw.page);
  const product = asRecord(raw.product);

  return {
    id: Number(raw.id ?? 0),
    productId: positiveNumber(
      raw.product_id ?? raw.productId ?? product?.product_id ?? product?.id,
    ),
    postId: positiveNumber(raw.post_id ?? raw.postId),
    url: String(raw.url ?? ''),
    page_id: Number(raw.page_id ?? 0),
    user_id: Number(raw.user_id ?? 0),
    discount_type: (raw.discount_type as any) || 'discount_percent',
    discount_percent: Number(raw.discount_percent ?? 0),
    discount_amount: Number(raw.discount_amount ?? 0),
    buy: Number(raw.buy ?? 0),
    get_price: Number(raw.get_price ?? 0),
    spend: Number(raw.spend ?? 0),
    amount_off: Number(raw.amount_off ?? 0),
    description: String(raw.description ?? ''),
    discounted_items: String(raw.discounted_items ?? ''),
    expire_date: String(raw.expire_date ?? ''),
    expire_time: String(raw.expire_time ?? ''),
    image: normalizeUrl(String(raw.image ?? '')),
    time: Number(raw.time ?? 0),
    page: page
      ? {
          page_id: Number(page.page_id ?? 0),
          page_title: String(page.page_title ?? ''),
          page_name: String(page.page_name ?? ''),
          avatar: normalizeUrl(String(page.avatar ?? '')),
          cover: normalizeUrl(String(page.cover ?? '')),
        }
      : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
