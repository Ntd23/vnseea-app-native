// Description: Normalizes public blog links before they are opened or shared from the native app.

export function normalizeBlogWebUrl(url?: string | null) {
  const normalizedUrl = url?.trim() ?? '';

  if (!normalizedUrl) {
    return '';
  }

  const suffixIndex = normalizedUrl.search(/[?#]/);
  const pathname = suffixIndex >= 0
    ? normalizedUrl.slice(0, suffixIndex)
    : normalizedUrl;
  const suffix = suffixIndex >= 0
    ? normalizedUrl.slice(suffixIndex)
    : '';

  return `${pathname.replace(/\.html$/i, '')}${suffix}`;
}
