// Product domain barrel exports
export * from './domain/types/product.types';
export * from './domain/repositories/ProductRepository';
export { createProductRepository } from './infrastructure/repositories/ApiProductRepository';
export { useProductViewModel } from './application/view-models/useProductViewModel';
