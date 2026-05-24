// Description: Exposes the public Reels context API and route screens.
export * from './domain/types/reels.types';
export * from './domain/repositories/ReelsRepository';
export { createReelsRepository } from './infrastructure/repositories/ApiReelsRepository';
export { useReelsViewModel } from './application/view-models/useReelsViewModel';
export { useCreateReelViewModel } from './application/view-models/useCreateReelViewModel';
export { default as ReelsScreen } from './presentation/screens/ReelsScreen';
export { default as CreateReelScreen } from './presentation/screens/CreateReelScreen';
export { ReelItem } from './presentation/components/ReelItem';
