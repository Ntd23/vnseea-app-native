// English description: Nuxt API implementation of the forum repository contract.

import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { ForumRepository } from "../../domain/repositories/ForumRepository"
import type {
  ForumCatalog,
  ForumCatalogQuery,
  ForumMutationResult,
  ForumReplyPayload,
  ForumThreadDetail,
  ForumThreadList,
  ForumThreadPayload,
  ForumThreadQuery,
} from "../../domain/types/forum.types"

export class ApiForumRepository implements ForumRepository {
  private readonly api = useNuxtApiClient()

  async getCatalog(query: ForumCatalogQuery): Promise<ForumCatalog> {
    return await this.api.get<ForumCatalog>("/forum", query)
  }

  async getThreads(query: ForumThreadQuery): Promise<ForumThreadList> {
    return await this.api.get<ForumThreadList>("/forum/threads", query)
  }

  async getMyThreads(query: Omit<ForumThreadQuery, "forumId">): Promise<ForumThreadList> {
    return await this.api.get<ForumThreadList>("/forum/my-threads", query)
  }

  async getThreadDetail(id: number): Promise<ForumThreadDetail> {
    return await this.api.get<ForumThreadDetail>(`/forum/threads/${id}`)
  }

  async createThread(payload: ForumThreadPayload): Promise<ForumMutationResult> {
    return await this.api.post<ForumMutationResult, ForumThreadPayload>("/forum/threads", payload)
  }

  async replyThread(payload: ForumReplyPayload): Promise<ForumMutationResult> {
    return await this.api.post<ForumMutationResult, ForumReplyPayload>(`/forum/threads/${payload.threadId}/replies`, payload)
  }
}

export const createApiForumRepository = () => new ApiForumRepository()
