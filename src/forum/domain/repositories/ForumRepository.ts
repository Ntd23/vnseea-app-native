// Description: Declares repository operations for forum browsing, members, searching, threads, and replies.
// Port từ: client/src/forum/domain/repositories/

import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMemberList,
  ForumMemberQuery,
  ForumMutationResult,
  ForumReplyPayload,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
  ForumSearchQuery,
  ForumSearchResult,
} from '../types/forum.types';

export interface ForumRepository {
  getForumCatalog(query: ForumCatalogQuery): Promise<ForumCatalog>;
  getForumMembers(query: ForumMemberQuery): Promise<ForumMemberList>;
  searchForum(query: ForumSearchQuery): Promise<ForumSearchResult>;
  getForumThreads(query: ForumThreadQuery): Promise<ForumThreadList>;
  getMyForumThreads(query: ForumCatalogQuery): Promise<ForumThreadList>;
  getMyForumMessages(query: ForumCatalogQuery): Promise<ForumSearchResult>;
  getForumThreadDetail(threadId: number): Promise<ForumThreadDetail>;
  createThread(payload: ForumThreadPayload): Promise<ForumMutationResult>;
  replyThread(payload: ForumReplyPayload): Promise<ForumMutationResult>;
}
