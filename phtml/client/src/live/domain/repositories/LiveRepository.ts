// English description: Declares the repository contract for the backend-backed live studio context.

import type {
  GoLiveDraft,
  LiveMutationResult,
  LiveStudioBootstrap,
  LiveStudioHeartbeat,
  LiveStudioSession,
  LiveViewerSession,
} from "../types/live.types"

export interface LiveRepository {
  getBootstrap(): Promise<LiveStudioBootstrap>
  createSession(input: GoLiveDraft): Promise<LiveStudioSession>
  joinViewer(postId: number): Promise<LiveViewerSession>
  getHeartbeat(postId: number, knownCommentIds?: number[], page?: "live" | "story", knownReactionIds?: number[]): Promise<LiveStudioHeartbeat>
  endSession(postId: number): Promise<LiveMutationResult>
  uploadThumbnail(postId: number, thumbnailFile: File): Promise<LiveMutationResult>
}
