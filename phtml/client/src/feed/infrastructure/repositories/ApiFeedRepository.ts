// English description: Implements the shared Dev 2 feed repository against Nuxt server API routes.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { FeedRepository } from "../../domain/repositories/FeedRepository"
import type {
  FeedCreatePostResponse,
  FeedCreateStoryResponse,
  FeedCommentRecord,
  FeedExploreResponse,
  FeedHomeResponse,
  FeedMemoriesResponse,
  FeedPokeActionResult,
  FeedPokeRecord,
  FeedPostActionResult,
  FeedPostRecord,
  FeedPostReactionsResponse,
  FeedPostsResponse,
  FeedStoryActionResult,
  FeedStoryReactionType,
} from "../../domain/types/feed.types"

const normalizeOffset = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined

export function createApiFeedRepository(): FeedRepository {
  const client = useNuxtApiClient()

  return {
    async getPostById(id) {
      return await client.get<FeedPostRecord | null>(apiRoutes.feed.posts.detail(id))
    },
    async getHome(input) {
      return await client.get<FeedHomeResponse>(apiRoutes.feed.home, {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
        postType: input?.postType,
        followingOnly: input?.followingOnly ? 1 : 0,
      })
    },
    async getSaved(input) {
      return await client.get<FeedPostsResponse>(apiRoutes.feed.saved, {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
      })
    },
    async getHashtag(tag, input) {
      return await client.get<FeedPostsResponse>(apiRoutes.feed.hashtag(tag), {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
      })
    },
    async getVideos(input) {
      return await client.get<FeedPostsResponse>(apiRoutes.feed.videos, {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
      })
    },
    async getPopular(input) {
      return await client.get<FeedPostsResponse>(apiRoutes.feed.popular, {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
      })
    },
    async getPhotos(input) {
      return await client.get<FeedPostsResponse>(apiRoutes.feed.photos, {
        limit: input?.limit,
        afterPostId: normalizeOffset(input?.afterPostId),
      })
    },
    async getExplore(input) {
      return await client.get<FeedExploreResponse>(apiRoutes.feed.explore, {
        limit: input?.limit,
      })
    },
    async getMemories() {
      return await client.get<FeedMemoriesResponse>(apiRoutes.feed.memories)
    },
    async getPokes() {
      return await client.get<FeedPokeRecord[]>(apiRoutes.feed.poke)
    },
    async getPostReactions(input) {
      return await client.get<FeedPostReactionsResponse>(apiRoutes.feed.posts.reactions(input.postId), {
        reaction: input.reaction && input.reaction !== "all" ? input.reaction : undefined,
        limit: input.limit,
        offset: input.offset,
      })
    },
    async getPostComments(input) {
      return await client.get<FeedCommentRecord[]>(apiRoutes.feed.comments.list, {
        postId: input.postId,
        limit: input.limit,
        offset: input.offset,
      })
    },
    async getCommentReplies(input) {
      return await client.get<FeedCommentRecord[]>(apiRoutes.feed.comments.replies, {
        commentId: input.commentId,
        limit: input.limit,
        offset: input.offset,
      })
    },
    async runPostAction(input) {
      const hasCommentFile = Boolean(input.imageFile || input.gifFile || input.audioFile)

      if (hasCommentFile) {
        const formData = new FormData()

        formData.append("action", input.action)
        formData.append("postId", String(input.postId))

        if (input.optionId) {
          formData.append("optionId", String(input.optionId))
        }

        if (input.text) {
          formData.append("text", input.text)
        }

        if (input.reaction) {
          formData.append("reaction", input.reaction)
        }

        if (input.imageFile) {
          formData.append("commentImage", input.imageFile, input.imageFile.name)
        }

        if (input.gifFile) {
          formData.append("commentGif", input.gifFile, input.gifFile.name)
        }

        if (input.audioFile) {
          formData.append("commentAudio", input.audioFile, input.audioFile.name)
        }

        return await client.post<FeedPostActionResult, FormData>(
          apiRoutes.feed.posts.action,
          formData,
        )
      }

      return await client.post<FeedPostActionResult, Record<string, unknown>>(
        apiRoutes.feed.posts.action,
        input,
      )
    },
    async runCommentAction(input) {
      return await client.post<FeedPostActionResult, Record<string, unknown>>(
        apiRoutes.feed.comments.action,
        input as Record<string, unknown> & {
          reaction?: FeedStoryReactionType
        },
      )
    },
    async createPost(input) {
      const formData = new FormData()
      formData.append("text", input.text)

      if (input.pageId) {
        formData.append("pageId", String(input.pageId))
      }

      if (input.eventId) {
        formData.append("eventId", String(input.eventId))
      }

      if (input.groupId) {
        formData.append("groupId", String(input.groupId))
      }

      if (input.sharedPostId) {
        formData.append("sharedPostId", String(input.sharedPostId))
      }

      if (input.colorId) {
        formData.append("colorId", String(input.colorId))
      }

      for (const answer of input.pollAnswers ?? []) {
        formData.append("answer[]", answer)
      }

      if (input.imageFile || input.videoFile || input.feeling || input.colorId || input.pollAnswers?.length) {
        if (input.audience) {
          formData.append("audience", input.audience)
        }

        if (input.feeling) {
          formData.append("feeling", input.feeling)
        }

        if (input.imageFile) {
          formData.append("postPhotos[]", input.imageFile, input.imageFile.name)
        }

        if (input.videoFile) {
          formData.append("postVideo", input.videoFile, input.videoFile.name)
        }

        return await client.post<FeedCreatePostResponse, FormData>(
          apiRoutes.feed.posts.create,
          formData,
        )
      }

      return await client.post<FeedCreatePostResponse, Record<string, unknown>>(
        apiRoutes.feed.posts.create,
        input as unknown as Record<string, unknown>,
      )
    },
    async createProduct(input) {
      const formData = new FormData()
      formData.append("name", input.name)
      formData.append("price", input.price)
      formData.append("category", input.category)
      formData.append("description", input.description)
      formData.append("location", input.location)
      formData.append("type", input.type)
      formData.append("postPhotos", input.imageFile, input.imageFile.name)

      return await client.post<{ ok: boolean; status: number; href: string; message: string }, FormData>(
        apiRoutes.feed.product.create,
        formData,
      )
    },
    async createStory(input) {
      const formData = new FormData()
      formData.append("file", input.file, input.file.name)
      formData.append("fileType", input.fileType)

      if (input.title) {
        formData.append("title", input.title)
      }

      if (input.description) {
        formData.append("description", input.description)
      }

      return await client.post<FeedCreateStoryResponse, FormData>(
        apiRoutes.feed.stories.create,
        formData,
      )
    },
    async runStoryAction(input) {
      return await client.post<FeedStoryActionResult, Record<string, unknown>>(
        apiRoutes.feed.stories.action,
        input,
      )
    },
    async runPokeAction(input) {
      return await client.post<FeedPokeActionResult, Record<string, unknown>>(
        apiRoutes.feed.poke,
        input,
      )
    },
  }
}
