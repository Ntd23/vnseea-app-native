// Product domain barrel exports
export * from './domain/types/product.types';
export * from './domain/repositories/ProductRepository';
export { createProductRepository } from './infrastructure/repositories/ApiProductRepository';
export { useProductViewModel, useProductsViewModel } from './application/view-models/useProductViewModel';
export { useMarketplaceViewModel } from './application/view-models/useMarketplaceViewModel';
export { useMyProductsViewModel } from './application/view-models/useMyProductsViewModel';
export { default as CreateProductScreen } from './presentation/screens/CreateProductScreen';
export { default as MarketplaceScreen } from './presentation/screens/MarketplaceScreen';
export { default as MyProductsScreen } from './presentation/screens/MyProductsScreen';
export { default as ProductDetailScreen } from './presentation/screens/ProductDetailScreen';
