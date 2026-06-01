// English description: Repository contract for loading the authenticated user's saved post feed through the saved bounded context.

import type { FeedPostRecord } from "../../../feed/domain/types/feed.types"

export type SavedPostsResult = {
  posts: FeedPostRecord[]
  hasMore: boolean
  nextOffset: number | null
}

export interface SavedRepository {
  getSavedPosts(input?: {
    limit?: number
    afterPostId?: number
  }): Promise<SavedPostsResult>
}
