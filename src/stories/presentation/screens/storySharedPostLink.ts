const DEEP_LINK_PATTERN = /vnseea:\/\/post\/([1-9][0-9]*)\b/i;
const WEB_LINK_PATTERN = /https?:\/\/[^\s/]+\/post\/([1-9][0-9]*)(?:[/?#]|\b)/i;

export function parseSharedPostIdFromStoryDescription(
  description: string | null | undefined,
): string | null {
  const value = typeof description === 'string' ? description : '';
  return value.match(DEEP_LINK_PATTERN)?.[1] ?? value.match(WEB_LINK_PATTERN)?.[1] ?? null;
}
