// English description: Declares the frontend repository contract for feed, media, discover, memory, story, and poke API bridges.

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
} from "../types/feed.types"

export interface FeedRepository {
  getPostById(id: number): Promise<FeedPostRecord | null>
  getHome(input?: {
    limit?: number
    afterPostId?: number
    postType?: string
    followingOnly?: boolean
  }): Promise<FeedHomeResponse>
  getSaved(input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  getHashtag(tag: string, input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  getVideos(input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  getPopular(input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  getPhotos(input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  getExplore(input?: { limit?: number }): Promise<FeedExploreResponse>
  getMemories(): Promise<FeedMemoriesResponse>
  getPokes(): Promise<FeedPokeRecord[]>
  getPostReactions(input: { postId: number; reaction?: FeedStoryReactionType | "all"; limit?: number; offset?: number }): Promise<FeedPostReactionsResponse>
  getPostComments(input: { postId: number; limit?: number; offset?: number }): Promise<FeedCommentRecord[]>
  getCommentReplies(input: { commentId: number; limit?: number; offset?: number }): Promise<FeedCommentRecord[]>
  runPostAction(input: {
    action: "like" | "reaction" | "comment" | "save" | "report" | "unsave" | "delete" | "hide" | "votePoll"
    postId: number
    optionId?: number
    reaction?: FeedStoryReactionType
    text?: string
    imageFile?: File
    gifFile?: File
    audioFile?: File
  }): Promise<FeedPostActionResult>
  runCommentAction(input: {
    action: "reply"
    commentId: number
    text?: string
  } | {
    action: "reaction"
    target: "comment" | "reply"
    targetId: number
    reaction: FeedStoryReactionType
  }): Promise<FeedPostActionResult>
  createPost(input: {
    text: string
    audience?: string
    imageFile?: File
    videoFile?: File
    feeling?: string
    pageId?: number
    eventId?: number
    groupId?: number
    sharedPostId?: number
    colorId?: number
    pollAnswers?: string[]
  }): Promise<FeedCreatePostResponse>
  createProduct(input: {
    name: string
    price: string
    category: string
    description: string
    location: string
    type: string
    imageFile: File
  }): Promise<{ ok: boolean; status: number; href: string; message: string }>
  createStory(input: {
    file: File
    fileType: "image" | "video"
    title?: string
    description?: string
  }): Promise<FeedCreateStoryResponse>
  runStoryAction(input:
    | {
      action: "react"
      storyId: number
      reaction: FeedStoryReactionType
    }
    | {
      action: "reply"
      storyId: number
      ownerId: number
      text: string
    }
    | {
      action: "view"
      storyId: number
    }
  ): Promise<FeedStoryActionResult>
  runPokeAction(input: {
    action: "create" | "remove"
    userId?: number
    pokeId?: number
  }): Promise<FeedPokeActionResult>
}
