// Description: Offer API repository - connects to backend offer.php
import type { OfferRepository } from '../../domain/repositories/OfferRepository';
import type { Offer, CreateOfferInput } from '../../domain/types/offer.types';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';

type OfferResponse = {
  api_status: number;
  data?: Offer[] | Offer;
  message?: string;
};

export function createOfferRepository(): OfferRepository {
  return {
    async getOffers(pageId?: number, offset = 0, limit = 20): Promise<Offer[]> {
      const response = await apiBridge.post<OfferResponse>(apiRoutes.offers.get, {
        type: 'get',
        page_id: pageId,
        offset,
        limit,
      });
      return Array.isArray(response.data) ? response.data : [];
    },

    async createOffer(input: CreateOfferInput): Promise<Offer> {
      // For UI-only phase, return mock success
      console.log('[Offers] createOffer:', input);
      return {
        id: Date.now(),
        pageId: input.pageId,
        userId: 0,
        discountType: input.discountType,
        discountPercent: input.discountPercent ?? 0,
        discountAmount: input.discountAmount ?? 0,
        buy: input.buy ?? 0,
        get: input.get ?? 0,
        spend: input.spend ?? 0,
        amountOff: input.amountOff ?? 0,
        description: input.description,
        discountedItems: input.discountedItems ?? '',
        image: input.thumbnailBase64 ?? '',
        currency: input.currency,
        expireDate: input.expireDate,
        expireTime: input.expireTime,
        time: Math.floor(Date.now() / 1000),
      };
    },

    async editOffer(offerId: number, input: Partial<CreateOfferInput>): Promise<Offer> {
      console.log('[Offers] editOffer:', offerId, input);
      return {
        id: offerId,
        pageId: input.pageId ?? 0,
        userId: 0,
        discountType: input.discountType ?? 'discount_percent',
        discountPercent: input.discountPercent ?? 0,
        discountAmount: input.discountAmount ?? 0,
        buy: input.buy ?? 0,
        get: input.get ?? 0,
        spend: input.spend ?? 0,
        amountOff: input.amountOff ?? 0,
        description: input.description ?? '',
        discountedItems: input.discountedItems ?? '',
        image: '',
        currency: input.currency ?? 'VND',
        expireDate: input.expireDate ?? '',
        expireTime: input.expireTime ?? '',
        time: Math.floor(Date.now() / 1000),
      };
    },

    async deleteOffer(offerId: number): Promise<void> {
      console.log('[Offers] deleteOffer:', offerId);
    },
  };
}
