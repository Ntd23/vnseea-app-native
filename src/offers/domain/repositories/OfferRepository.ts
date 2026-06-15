// Description: Repository interface for offers.
import type { Offer, CreateOfferInput } from '../types/offer.types';

export interface OfferRepository {
  getOffers(pageId?: number, offset?: number, limit?: number): Promise<Offer[]>;
  createOffer(input: CreateOfferInput): Promise<Offer>;
  editOffer(offerId: number, input: Partial<CreateOfferInput>): Promise<Offer>;
  deleteOffer(offerId: number): Promise<void>;
}
