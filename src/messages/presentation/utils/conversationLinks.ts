const ENCODED_LINK_PATTERN = /\[a\]([\s\S]*?)\[\/a\]/i;
const HREF_PATTERN = /href=["']([^"']+)["']/i;
const URL_PATTERN = /https?:\/\/[^\s<>"'\])}]+/i;

function decodeLinkValue(value: string) {
  let decoded = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded.replace(/&amp;/gi, '&').trim();
}

function trimTrailingPunctuation(value: string) {
  return value.replace(/[.,!?;:]+$/, '');
}

function normalizeLinkCandidate(value: string) {
  const candidate = trimTrailingPunctuation(decodeLinkValue(value));
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(candidate)) {
    return `http://${candidate}`;
  }
  return '';
}

export function extractConversationLink(value: string) {
  if (!value) return '';

  const encodedMatch = value.match(ENCODED_LINK_PATTERN)?.[1];
  if (encodedMatch) {
    return normalizeLinkCandidate(encodedMatch);
  }

  const hrefMatch = value.match(HREF_PATTERN)?.[1];
  if (hrefMatch) {
    return normalizeLinkCandidate(hrefMatch);
  }

  const decoded = decodeLinkValue(value);
  return normalizeLinkCandidate(decoded.match(URL_PATTERN)?.[0] ?? '');
}
