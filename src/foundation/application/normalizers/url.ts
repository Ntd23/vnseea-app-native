// Description: Normalizes media URLs without embedding deployment-specific paths.
export function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function joinUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

export function isRelativeUploadPath(value: string) {
  return /^\/?upload\//i.test(value.trim());
}

export function normalizeRawUrl(
  value: string | undefined,
  webBaseUrl: string,
  mediaBaseUrl = webBaseUrl,
) {
  if (!value) {
    return undefined;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  return joinUrl(
    isRelativeUploadPath(value) ? mediaBaseUrl : webBaseUrl,
    value,
  );
}
