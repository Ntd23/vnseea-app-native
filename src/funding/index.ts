// Description: Exports the funding bounded context public API and presentation screen.
export * from './domain/types/funding.types';
export * from './domain/repositories/FundingRepository';
export { createFundingRepository } from './infrastructure/repositories/ApiFundingRepository';
export { useFundingViewModel } from './application/view-models/useFundingViewModel';
export { default as FundingScreen } from './presentation/screens/FundingScreen';
