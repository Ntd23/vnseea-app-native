// Forum domain barrel exports
export * from './domain/types/forum.types';
export * from './domain/repositories/ForumRepository';
export { createForumRepository } from './infrastructure/repositories/ApiForumRepository';
export { useForumViewModel } from './application/view-models/useForumViewModel';
