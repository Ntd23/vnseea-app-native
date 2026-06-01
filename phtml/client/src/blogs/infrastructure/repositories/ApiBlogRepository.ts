// English description: Nuxt API backed repository for blog authoring flows.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { BlogRepository } from "../../domain/repositories/BlogRepository"
import type { BlogCreateDraft, BlogCreateResult, BlogListArticle, BlogReadArticle } from "../../domain/types/blog.types"
import type { FeedCommentRecord, FeedCommentSubmitPayload, FeedPostActionResult } from "../../../feed/domain/types/feed.types"

export function createApiBlogRepository(): BlogRepository {
  const client = useNuxtApiClient()

  return {
    async getBlogs(input) {
      return await client.get<BlogListArticle[]>(apiRoutes.blogs.list, {
        limit: input?.limit,
        offset: input?.offset,
        category: input?.category,
        mine: input?.mineOnly ? "1" : undefined,
      })
    },
    async getBlogBySlug(slug: string) {
      return await client.get<BlogReadArticle>(apiRoutes.blogs.detail(slug))
    },
    async getBlogComments(slug: string) {
      return await client.get<FeedCommentRecord[]>(apiRoutes.blogs.comments(slug))
    },
    async addBlogComment(slug: string, input: FeedCommentSubmitPayload) {
      return await client.post<FeedCommentRecord, { text: string }>(
        apiRoutes.blogs.comments(slug),
        { text: input.text },
      )
    },
    async getBlogCommentReplies(slug, input) {
      return await client.get<FeedCommentRecord[]>(apiRoutes.blogs.commentReplies(slug), {
        commentId: input.commentId,
        limit: input.limit,
        offset: input.offset,
      })
    },
    async runBlogCommentAction(slug, input) {
      return await client.post<FeedPostActionResult, Record<string, unknown>>(
        apiRoutes.blogs.commentAction(slug),
        input as Record<string, unknown>,
      )
    },
    async createBlog(input: BlogCreateDraft) {
      const formData = new FormData()

      formData.append("title", input.title)
      formData.append("content", input.content)
      formData.append("description", input.description)
      formData.append("category", input.category)
      formData.append("tags", input.tags.join(","))
      formData.append("status", input.status)

      if (input.thumbnailFile) {
        formData.append("thumbnail", input.thumbnailFile)
      }

      return await client.post<BlogCreateResult, FormData>(apiRoutes.blogs.create, formData)
    },
  }
}
