// Forum Repository Interface
// Port từ: client/src/forum/domain/repositories/

import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMutationResult,
  ForumReplyPayload,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
} from '../types/forum.types';

export interface ForumRepository {
  getForumCatalog(query: ForumCatalogQuery): Promise<ForumCatalog>;
  getForumThreads(query: ForumThreadQuery): Promise<ForumThreadList>;
  getMyForumThreads(query: ForumCatalogQuery): Promise<ForumThreadList>;
  getForumThreadDetail(threadId: number): Promise<ForumThreadDetail>;
  createThread(payload: ForumThreadPayload): Promise<ForumMutationResult>;
  replyThread(payload: ForumReplyPayload): Promise<ForumMutationResult>;
}
