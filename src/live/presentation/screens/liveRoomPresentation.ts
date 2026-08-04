// Pure presentation helpers for the live-room timer and native share payload.

export function formatLiveElapsedTime(
  startedAt: string | undefined,
  nowMs = Date.now(),
) {
  const startedAtMs = startedAt ? new Date(startedAt).getTime() : Number.NaN;
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
    : 0;
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const twoDigits = (value: number) => String(value).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
  }

  return `${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

export function buildLiveShareUrl(webBaseUrl: string, postId: number) {
  const siteRoot = webBaseUrl.trim().replace(/\/+$/, '');
  return `${siteRoot}/post/${encodeURIComponent(String(postId))}`;
}

export function buildLiveShareMessage(input: {
  publisherName: string;
  title?: string;
  url: string;
}) {
  const title = input.title?.trim();
  const lines = [
    `${input.publisherName} đang phát trực tiếp trên VNSEEA.`,
    title || undefined,
    `Xem ngay: ${input.url}`,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}
