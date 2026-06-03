// Popular domain barrel exports
export * from './domain/types/popular.types';
export * from './domain/repositories/PopularRepository';
export { createPopularRepository } from './infrastructure/repositories/ApiPopularRepository';
export { usePopularViewModel } from './application/view-models/usePopularViewModel';
export { default as PopularScreen } from './presentation/screens/PopularScreen';
