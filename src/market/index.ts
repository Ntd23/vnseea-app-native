// Description: Exposes the public Market context API and route screens.
export * from './domain/types/market.types';
export * from './domain/repositories/MarketRepository';
export { createMarketRepository } from './infrastructure/repositories/ApiMarketRepository';
export { useMarketViewModel } from './application/view-models/useMarketViewModel';

// Re-export CreateProductScreen from product module for backward compatibility
export { default as CreateProductScreen } from '../product/presentation/screens/CreateProductScreen';
