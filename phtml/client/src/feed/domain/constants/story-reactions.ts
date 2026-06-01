// English description: Defines canonical feed story reaction keys and backend IDs shared by UI and API bridges.

export const feedStoryReactionDefinitions = [
  {
    value: "Like",
    backendId: 1,
    labelKey: "feed.storyCarousel.reactionLike",
  },
  {
    value: "Love",
    backendId: 2,
    labelKey: "feed.storyCarousel.reactionLove",
  },
  {
    value: "HaHa",
    backendId: 3,
    labelKey: "feed.storyCarousel.reactionHaha",
  },
  {
    value: "Wow",
    backendId: 4,
    labelKey: "feed.storyCarousel.reactionWow",
  },
  {
    value: "Sad",
    backendId: 5,
    labelKey: "feed.storyCarousel.reactionSad",
  },
  {
    value: "Angry",
    backendId: 6,
    labelKey: "feed.storyCarousel.reactionAngry",
  },
] as const

export type FeedStoryReactionType = typeof feedStoryReactionDefinitions[number]["value"]

export const defaultFeedStoryReaction = feedStoryReactionDefinitions[0]

export const feedStoryReactionValues = feedStoryReactionDefinitions.map(reaction => reaction.value)

export const feedStoryReactionBackendIds = feedStoryReactionDefinitions.reduce(
  (ids, reaction) => {
    ids[reaction.value] = reaction.backendId
    return ids
  },
  {} as Record<FeedStoryReactionType, number>,
)

export const feedStoryReactionByBackendId = feedStoryReactionDefinitions.reduce(
  (reactions, reaction) => {
    reactions[String(reaction.backendId)] = reaction.value
    return reactions
  },
  {} as Record<string, FeedStoryReactionType>,
)

export function isFeedStoryReaction(value: string): value is FeedStoryReactionType {
  return feedStoryReactionValues.includes(value as FeedStoryReactionType)
}
