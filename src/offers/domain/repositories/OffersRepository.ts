// Description: Offer repository interface
// Port từ: client/src/offers/domain/repositories/

import type { OfferItem } from '../types/offers.types';

export interface OffersRepository {
  getOffers(options?: {
    limit?: number;
    offset?: number;
  }): Promise<OfferItem[]>;
}