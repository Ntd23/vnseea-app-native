// English description: Centralizes feed reaction asset imports and backend reaction keys for shared UI usage.

import likeReactionUrl from "../../../../app/assets/images/reactions/twemoji--thumbs-up.png"
import loveReactionUrl from "../../../../app/assets/images/reactions/twemoji--beating-heart.png"
import hahaReactionUrl from "../../../../app/assets/images/reactions/twemoji--grinning-squinting-face.png"
import wowReactionUrl from "../../../../app/assets/images/reactions/twemoji--astonished-face.png"
import sadReactionUrl from "../../../../app/assets/images/reactions/twemoji--sad-but-relieved-face.png"
import angryReactionUrl from "../../../../app/assets/images/reactions/twemoji--angry-face.png"
import {
  defaultFeedStoryReaction,
  feedStoryReactionDefinitions,
  type FeedStoryReactionType,
} from "../../domain/constants/story-reactions"

export type FeedReactionAsset = {
  value: FeedStoryReactionType
  backendId: number
  labelKey: string
  src: string
}

export type FeedCommentComposerReactionAsset = FeedReactionAsset & {
  text: string
}

const feedReactionAssetUrls: Record<FeedStoryReactionType, string> = {
  Like: likeReactionUrl,
  Love: loveReactionUrl,
  HaHa: hahaReactionUrl,
  Wow: wowReactionUrl,
  Sad: sadReactionUrl,
  Angry: angryReactionUrl,
}

const feedReactionComposerTexts: Record<FeedStoryReactionType, string> = {
  Like: "👍",
  Love: "❤️",
  HaHa: "😆",
  Wow: "😮",
  Sad: "😢",
  Angry: "😡",
}

export const feedReactionAssets = feedStoryReactionDefinitions.map(reaction => ({
  ...reaction,
  src: feedReactionAssetUrls[reaction.value],
})) satisfies FeedReactionAsset[]

export const defaultFeedReactionAsset = feedReactionAssets.find(reaction => reaction.value === defaultFeedStoryReaction.value)
  ?? feedReactionAssets[0]

export const feedReactionAssetByValue = feedReactionAssets.reduce(
  (assets, asset) => {
    assets[asset.value] = asset
    return assets
  },
  {} as Record<FeedStoryReactionType, FeedReactionAsset>,
)

export const feedPostPreviewReactionAssets = [
  feedReactionAssetByValue.Like,
  feedReactionAssetByValue.Love,
  feedReactionAssetByValue.HaHa,
]

export const feedCommentComposerReactionAssets = feedReactionAssets.map(reaction => ({
  ...reaction,
  text: feedReactionComposerTexts[reaction.value],
})) satisfies FeedCommentComposerReactionAsset[]
