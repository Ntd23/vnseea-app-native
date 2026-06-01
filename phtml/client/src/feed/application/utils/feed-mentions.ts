// English description: Centralizes feed mention parsing and rendering helpers for publisher and post surfaces.

import type { FeedPostMention } from "../../domain/types/feed.types"

export type FeedMentionSegment = {
  key: string
  text: string
  isMention: boolean
}

const mentionPattern = /(@[\p{L}\p{N}_][\p{L}\p{N}_.-]*)/gu

export function normalizeFeedMentionSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function escapeMentionRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function createMentionSegments(
  text: string,
  knownMentionLabels: Set<string> | Record<string, string> = {},
  options: { highlightUnknownMentions?: boolean } = {},
) {
  const labelSet = knownMentionLabels instanceof Set
    ? knownMentionLabels
    : new Set(Object.keys(knownMentionLabels).map(label => label.toLowerCase()))
  const highlightUnknownMentions = options.highlightUnknownMentions ?? true

  return text
    .split(mentionPattern)
    .filter(segment => segment.length > 0)
    .map<FeedMentionSegment>((segment, index) => ({
      key: `${index}:${segment}`,
      text: segment,
      isMention: segment.startsWith("@")
        && (labelSet.has(segment.toLowerCase()) || (labelSet.size === 0 && highlightUnknownMentions)),
    }))
}

export function getFeedMentionDisplayName(mention: FeedPostMention) {
  return mention.displayName || mention.name.split(/\s+/).filter(Boolean)[0] || mention.username
}

export function createFeedMentionLabelSet(mentions: FeedPostMention[] = []) {
  const labels = new Set<string>()

  for (const mention of mentions) {
    const displayName = getFeedMentionDisplayName(mention)
    const rawLabels = [
      displayName,
      mention.username,
      mention.name.split(/\s+/).filter(Boolean)[0],
    ]

    for (const label of rawLabels) {
      const normalized = label?.replace(/^@/, "").trim()

      if (normalized) {
        labels.add(`@${normalized}`.toLowerCase())
      }
    }
  }

  return labels
}

export function normalizePostTextMentions(text: string, mentions: FeedPostMention[] = []) {
  return mentions.reduce((nextText, mention) => {
    const displayName = getFeedMentionDisplayName(mention)
    const replacements = [
      mention.name,
      mention.username,
    ]

    return replacements.reduce((currentText, label) => {
      const normalized = label.replace(/^@/, "").trim()

      if (!normalized || normalized === displayName) {
        return currentText
      }

      return currentText.replace(
        new RegExp(`(^|\\s)@${escapeMentionRegExp(normalized)}(?=\\s|$)`, "g"),
        `$1@${displayName}`,
      )
    }, nextText)
  }, text)
}

export function createPostTextMentionSegments(text: string, mentions: FeedPostMention[] = []) {
  return createMentionSegments(
    normalizePostTextMentions(text, mentions),
    createFeedMentionLabelSet(mentions),
  )
}
