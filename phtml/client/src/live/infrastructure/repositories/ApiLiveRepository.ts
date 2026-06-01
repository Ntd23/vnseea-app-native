// English description: Connects the live bounded context to the Nuxt live API bridge through a dedicated repository.

import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import { liveApiRoutes } from "../../application/constants/live-api-routes"
import type { LiveRepository } from "../../domain/repositories/LiveRepository"
import type {
  GoLiveDraft,
  LiveMutationResult,
  LiveStudioBootstrap,
  LiveStudioHeartbeat,
  LiveStudioSession,
  LiveViewerSession,
} from "../../domain/types/live.types"

export function createApiLiveRepository(): LiveRepository {
  const client = useNuxtApiClient()

  return {
    async getBootstrap() {
      return await client.get<LiveStudioBootstrap>(liveApiRoutes.bootstrap)
    },

    async createSession(input: GoLiveDraft) {
      return await client.post<LiveStudioSession, GoLiveDraft>(
        liveApiRoutes.create,
        input,
      )
    },

    async joinViewer(postId: number) {
      return await client.post<LiveViewerSession, { postId: number }>(
        liveApiRoutes.join,
        { postId },
      )
    },

    async getHeartbeat(
      postId: number,
      knownCommentIds: number[] = [],
      page: "live" | "story" = "live",
      knownReactionIds: number[] = [],
    ) {
      return await client.post<LiveStudioHeartbeat, {
        postId: number
        knownCommentIds: number[]
        knownReactionIds: number[]
        page: "live" | "story"
      }>(
        liveApiRoutes.heartbeat,
        {
          postId,
          knownCommentIds,
          knownReactionIds,
          page,
        },
      )
    },

    async endSession(postId: number) {
      return await client.post<LiveMutationResult, { postId: number }>(
        liveApiRoutes.end,
        { postId },
      )
    },

    async uploadThumbnail(postId: number, thumbnailFile: File) {
      const formData = new FormData()

      formData.append("postId", String(postId))
      formData.append("thumbnailFile", thumbnailFile, thumbnailFile.name)

      return await client.post<LiveMutationResult, FormData>(
        liveApiRoutes.thumbnail,
        formData,
      )
    },
  }
}
