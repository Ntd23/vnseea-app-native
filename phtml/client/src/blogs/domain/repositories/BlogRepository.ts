// English description: Repository contract for blog authoring and article workflows.

import type { BlogCreateDraft, BlogCreateResult, BlogListArticle, BlogListQuery, BlogReadArticle } from "../types/blog.types"
import type { FeedCommentRecord, FeedCommentSubmitPayload, FeedPostActionResult } from "../../../feed/domain/types/feed.types"
import type { FeedStoryReactionType } from "../../../feed/domain/constants/story-reactions"

export interface BlogRepository {
  getBlogs(input?: BlogListQuery): Promise<BlogListArticle[]>
  getBlogBySlug(slug: string): Promise<BlogReadArticle>
  getBlogComments(slug: string): Promise<FeedCommentRecord[]>
  addBlogComment(slug: string, input: FeedCommentSubmitPayload): Promise<FeedCommentRecord>
  getBlogCommentReplies(slug: string, input: { commentId: number; limit?: number; offset?: number }): Promise<FeedCommentRecord[]>
  runBlogCommentAction(slug: string, input: {
    action: "reply"
    commentId: number
    text?: string
  } | {
    action: "reaction"
    target: "comment" | "reply"
    targetId: number
    reaction: FeedStoryReactionType
  }): Promise<FeedPostActionResult>
  createBlog(input: BlogCreateDraft): Promise<BlogCreateResult>
}
