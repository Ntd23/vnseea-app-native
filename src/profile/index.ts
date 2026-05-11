// Profile domain barrel exports
export * from './domain/types/profile.types';
export * from './domain/repositories/ProfileRepository';
export { createProfileRepository } from './infrastructure/repositories/ApiProfileRepository';
export { useProfileViewModel } from './application/view-models/useProfileViewModel';
