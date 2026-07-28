// Description: Formats the ad website field while keeping the protocol easy to understand.

export const AD_WEBSITE_PREFIX = 'https://';

export function getAdWebsiteHost(value: string) {
  return value.replace(/^https?:\/\//i, '');
}

export function getAdWebsiteProtocol(value: string) {
  return /^http:\/\//i.test(value) ? 'http://' : AD_WEBSITE_PREFIX;
}

export function buildAdWebsiteUrl(value: string) {
  const host = getAdWebsiteHost(value).trimStart();
  return host ? `${AD_WEBSITE_PREFIX}${host}` : AD_WEBSITE_PREFIX;
}
