export const CHAT_FALLBACK_POLL_DELAYS_MS = [7_000, 15_000, 30_000] as const;

export const MESSAGE_LIST_FALLBACK_POLL_DELAYS_MS = [
  5_000,
  10_000,
  20_000,
  30_000,
] as const;

export function getBoundedFallbackPollDelay(
  delays: readonly number[],
  completedPollCount: number,
) {
  if (delays.length === 0) return 30_000;
  const index = Math.min(
    Math.max(0, Math.floor(completedPollCount)),
    delays.length - 1,
  );
  return delays[index];
}
