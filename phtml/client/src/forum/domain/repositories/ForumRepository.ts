// English description: Repository contract for loading backend-backed forum sections.

import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMutationResult,
  ForumReplyPayload,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
} from "../types/forum.types"

export interface ForumRepository {
  getCatalog(query: ForumCatalogQuery): Promise<ForumCatalog>
  getThreads(query: ForumThreadQuery): Promise<ForumThreadList>
  getMyThreads(query: Omit<ForumThreadQuery, "forumId">): Promise<ForumThreadList>
  getThreadDetail(id: number): Promise<ForumThreadDetail>
  createThread(payload: ForumThreadPayload): Promise<ForumMutationResult>
  replyThread(payload: ForumReplyPayload): Promise<ForumMutationResult>
}
