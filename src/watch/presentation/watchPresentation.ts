// Description: Builds public URLs used by the Watch screen.

export function buildWatchOriginalPostUrl(
  webBaseUrl: string,
  postId: string,
) {
  const siteRoot = webBaseUrl.trim().replace(/\/+$/, '');
  return `${siteRoot}/post/${encodeURIComponent(postId)}`;
}
