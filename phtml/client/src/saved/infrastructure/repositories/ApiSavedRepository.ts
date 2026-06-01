// English description: Nuxt API backed repository for the saved bounded context using the saved feed bridge.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { SavedPostsResult, SavedRepository } from "../../domain/repositories/SavedRepository"

const normalizeOffset = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined

export function createApiSavedRepository(): SavedRepository {
  const client = useNuxtApiClient()

  return {
    async getSavedPosts(input) {
      return await client.get<SavedPostsResult>(apiRoutes.feed.saved, {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
      })
    },
  }
}
