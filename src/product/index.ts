// Product domain barrel exports
export * from './domain/types/product.types';
export * from './domain/repositories/ProductRepository';
export { createProductRepository } from './infrastructure/repositories/ApiProductRepository';
export { useProductViewModel, useProductsViewModel } from './application/view-models/useProductViewModel';
export { useMarketplaceViewModel } from './application/view-models/useMarketplaceViewModel';
export { default as CreateProductScreen } from './presentation/screens/CreateProductScreen';
export { default as MarketplaceScreen } from './presentation/screens/MarketplaceScreen';
