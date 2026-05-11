// Movies domain barrel exports
export * from './domain/types/movies.types';
export * from './domain/repositories/MoviesRepository';
export { createMoviesRepository } from './infrastructure/repositories/ApiMoviesRepository';
export { useMoviesViewModel } from './application/view-models/useMoviesViewModel';
