// English description: Declares repository operations for feed share destinations and message shares.

import type {
  FeedShareSearchTargets,
  FeedShareTarget,
} from "../types/feed-share.types"

export interface FeedShareRepository {
  getPageTargets(): Promise<FeedShareTarget[]>
  getGroupTargets(): Promise<FeedShareTarget[]>
  searchTargets(keyword: string, limit?: number): Promise<FeedShareSearchTargets>
  sendMessageShare(input: {
    recipientIds: number[]
    text: string
  }): Promise<void>
}
