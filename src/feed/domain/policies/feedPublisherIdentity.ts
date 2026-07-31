import type { FeedPublisher } from '../types/feed.types';

export function isPageFeedPublisher(
  publisher?: FeedPublisher | null,
): publisher is FeedPublisher & { pageId: string } {
  const pageId = publisher?.pageId?.trim();
  if (!pageId) return false;
  const numericPageId = Number(pageId);
  return Number.isFinite(numericPageId) && numericPageId > 0;
}
