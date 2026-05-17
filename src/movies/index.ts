// Description: Exports the movies bounded context public API and presentation entry points.
export * from './domain/types/movies.types';
export * from './domain/repositories/MoviesRepository';
export { createMoviesRepository } from './infrastructure/repositories/ApiMoviesRepository';
export { useMoviesViewModel } from './application/view-models/useMoviesViewModel';
export { default as MoviesScreen } from './presentation/screens/MoviesScreen';
