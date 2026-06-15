// Description: Offers bounded context barrel exports.
export * from './domain/types/offer.types';
export * from './domain/repositories/OfferRepository';
export { createOfferRepository } from './infrastructure/repositories/ApiOfferRepository';
export { useOffersViewModel, useCreateOfferViewModel } from './application/view-models/useOfferViewModel';
export { default as OfferCard } from './presentation/components/OfferCard';
export { default as OfferDiscountBadge } from './presentation/components/OfferDiscountBadge';
export { default as OfferExpiryBadge } from './presentation/components/OfferExpiryBadge';
export { default as OffersScreen } from './presentation/screens/OffersScreen';
export { default as PageOffersScreen } from './presentation/screens/PageOffersScreen';
export { default as CreateOfferScreen } from './presentation/screens/CreateOfferScreen';
