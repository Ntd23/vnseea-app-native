const MESSAGE_URL_PATTERN = /(?:https?:\/\/|vnseea:\/\/)[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:\])]+$/;
const PAGE_SHARE_HASH = 'vnseea-page';

const NON_PAGE_ROOT_PATHS = new Set([
  'admin',
  'api',
  'event',
  'events',
  'group',
  'groups',
  'home',
  'job',
  'jobs',
  'login',
  'marketplace',
  'messages',
  'offers',
  'page',
  'pages',
  'post',
  'product',
  'products',
  'reels',
  'register',
  'search',
  'timeline',
  'video',
  'videos',
]);

export type SharedPageMessageMetadata = {
  pageName: string;
  pageTitle?: string;
  note?: string;
  explicit: boolean;
};

export type ParsedSharedPageMessage = SharedPageMessageMetadata & {
  url: string;
  publicUrl: string;
  host: string;
};

function isVnseeaHost(hostname: string) {
  return /(^|\.)vnseea\.vn$/i.test(hostname);
}

function normalizePageName(value: string | null | undefined) {
  if (!value) return '';
  try {
    return decodeURIComponent(value).trim().replace(/^@/, '');
  } catch {
    return value.trim().replace(/^@/, '');
  }
}

function readPageName(url: URL) {
  if (url.protocol === 'vnseea:') {
    if (url.hostname.toLowerCase() !== 'page') return undefined;
    const pageName = normalizePageName(url.pathname.replace(/^\/+|\/+$/g, ''));
    return pageName
      ? { pageName, explicit: true, publicUrl: url.toString() }
      : undefined;
  }

  if (!/^https?:$/.test(url.protocol) || !isVnseeaHost(url.hostname)) {
    return undefined;
  }

  const timelinePageName = normalizePageName(url.searchParams.get('u'));
  if (/\/(?:timeline)\/?$/i.test(url.pathname) && timelinePageName) {
    return {
      pageName: timelinePageName,
      explicit: true,
      publicUrl: url.toString(),
    };
  }

  const pathParts = url.pathname
    .split('/')
    .map(part => normalizePageName(part))
    .filter(Boolean);
  if (pathParts.length !== 1) return undefined;

  const pageName = pathParts[0];
  if (NON_PAGE_ROOT_PATHS.has(pageName.toLowerCase())) return undefined;

  const explicit = url.hash.toLowerCase() === `#${PAGE_SHARE_HASH}`;
  const publicUrl = new URL(url.toString());
  if (explicit) publicUrl.hash = '';

  return {
    pageName,
    explicit,
    publicUrl: publicUrl.toString(),
  };
}

function normalizeShareCopy(before: string, after: string) {
  return [before.trimEnd(), after.trimStart()]
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitPageTitleAndNote(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const pageTitle = lines.pop();
  const note = lines.join('\n').trim() || undefined;
  return { pageTitle, note };
}

export function parseSharedPageMessage(
  message: string,
): ParsedSharedPageMessage | undefined {
  if (!message.trim()) return undefined;

  MESSAGE_URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MESSAGE_URL_PATTERN.exec(message)) !== null) {
    const rawUrl = match[0];
    const cleanUrl = rawUrl.replace(TRAILING_URL_PUNCTUATION, '');

    try {
      const parsedUrl = new URL(cleanUrl);
      const page = readPageName(parsedUrl);
      if (!page) continue;

      const copy = normalizeShareCopy(
        message.slice(0, match.index),
        message.slice(match.index + rawUrl.length),
      );
      const { pageTitle, note } = splitPageTitleAndNote(copy);

      return {
        pageName: page.pageName,
        pageTitle,
        note,
        explicit: page.explicit,
        url: cleanUrl,
        publicUrl: page.publicUrl,
        host: parsedUrl.hostname.replace(/^www\./i, '') || 'vnseea.vn',
      };
    } catch {
      continue;
    }
  }

  return undefined;
}

export function buildSharedPageUrl(rawUrl: string) {
  let shareUrl = rawUrl.trim();
  try {
    const parsedUrl = new URL(shareUrl);
    if (
      /^https?:$/.test(parsedUrl.protocol) &&
      isVnseeaHost(parsedUrl.hostname)
    ) {
      parsedUrl.hash = PAGE_SHARE_HASH;
      shareUrl = parsedUrl.toString();
    }
  } catch {
    // Keep the original URL so external/custom deployments still share.
  }

  return shareUrl;
}

export function buildSharedPageMessage(input: {
  url: string;
  pageTitle: string;
  note?: string;
}) {
  const shareUrl = buildSharedPageUrl(input.url);

  return [input.note?.trim(), input.pageTitle.trim(), shareUrl]
    .filter(Boolean)
    .join('\n\n');
}
