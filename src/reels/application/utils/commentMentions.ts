import type {
  CommentMention,
  ReelCaptionSuggestion,
} from '../../domain/types/reels.types';

export type ActiveCommentMentionToken = {
  query: string;
  start: number;
  end: number;
};

export type CommentMentionSegment = {
  text: string;
  mention?: CommentMention;
  isMention?: boolean;
};

const UNKNOWN_COMMENT_MENTION_PATTERN = /@[\p{L}\p{M}\p{N}_]+/gu;
const MENTION_TOKEN_CHARACTER_PATTERN = /[\p{L}\p{M}\p{N}_]/u;
const EMAIL_LOCAL_CHARACTER_PATTERN = /[\p{L}\p{M}\p{N}_.%+-]/u;

function hasMentionStartBoundary(text: string, index: number) {
  if (index <= 0) return true;
  return !EMAIL_LOCAL_CHARACTER_PATTERN.test(text.charAt(index - 1));
}

function hasMentionEndBoundary(text: string, index: number) {
  if (index >= text.length) return true;
  return !MENTION_TOKEN_CHARACTER_PATTERN.test(text.charAt(index));
}

function findNextKnownMentionIndex(
  text: string,
  value: string,
  fromIndex: number,
) {
  let index = text.indexOf(value, fromIndex);

  while (index >= 0) {
    if (
      hasMentionStartBoundary(text, index) &&
      hasMentionEndBoundary(text, index + value.length)
    ) {
      return index;
    }
    index = text.indexOf(value, index + value.length);
  }

  return -1;
}

function findNextUnknownMention(text: string, fromIndex: number) {
  UNKNOWN_COMMENT_MENTION_PATTERN.lastIndex = fromIndex;
  let match = UNKNOWN_COMMENT_MENTION_PATTERN.exec(text);

  while (match) {
    if (hasMentionStartBoundary(text, match.index)) return match;
    match = UNKNOWN_COMMENT_MENTION_PATTERN.exec(text);
  }

  return null;
}

export function getActiveCommentMentionToken(
  text = '',
): ActiveCommentMentionToken | null {
  const match = /(^|\s)(@[A-Za-z0-9_\u00C0-\u1EF9]*)$/u.exec(text);
  if (!match) return null;

  return {
    query: match[2].slice(1),
    start: match.index + match[1].length,
    end: text.length,
  };
}

export function mentionFromSuggestion(
  suggestion: ReelCaptionSuggestion,
): CommentMention | null {
  if (suggestion.kind !== 'mention') return null;

  const username = String(suggestion.backendValue || suggestion.subtitle || '')
    .trim()
    .replace(/^@+/, '');
  const displayName = String(suggestion.label || username).trim();
  const userId = String(suggestion.id || '').trim();
  if (!username || !displayName || !userId) return null;

  return { userId, username, displayName };
}

export function getCommentMentionDisplayValue(mention: CommentMention) {
  return `@${mention.displayName.trim()}`;
}

export function getCommentMentionBackendValue(mention: CommentMention) {
  return `@${mention.username.trim().replace(/^@+/, '')}`;
}

export function applyCommentMentionSuggestion(
  text: string,
  suggestion: ReelCaptionSuggestion,
) {
  const activeToken = getActiveCommentMentionToken(text);
  const mention = mentionFromSuggestion(suggestion);
  if (!activeToken || !mention) return null;

  const before = text.slice(0, activeToken.start);
  const after = text.slice(activeToken.end).trimStart();
  return {
    text: `${before}${getCommentMentionDisplayValue(mention)} ${after}`,
    mention,
  };
}

export function mergeCommentMention(
  mentions: CommentMention[],
  nextMention: CommentMention,
) {
  return [
    ...mentions.filter(
      mention =>
        mention.userId !== nextMention.userId &&
        mention.username.toLowerCase() !== nextMention.username.toLowerCase(),
    ),
    nextMention,
  ];
}

export function pruneCommentMentions(text: string, mentions: CommentMention[]) {
  return mentions.filter(mention =>
    text.includes(getCommentMentionDisplayValue(mention)),
  );
}

export function serializeCommentMentions(
  text: string,
  mentions: CommentMention[],
) {
  return [...mentions]
    .sort(
      (left, right) =>
        getCommentMentionDisplayValue(right).length -
        getCommentMentionDisplayValue(left).length,
    )
    .reduce(
      (next, mention) =>
        next
          .split(getCommentMentionDisplayValue(mention))
          .join(getCommentMentionBackendValue(mention)),
      text,
    );
}

export function hydrateCommentMentionText(
  text: string,
  mentions: CommentMention[],
) {
  return [...mentions]
    .sort(
      (left, right) =>
        getCommentMentionBackendValue(right).length -
        getCommentMentionBackendValue(left).length,
    )
    .reduce((next, mention) => {
      const displayValue = getCommentMentionDisplayValue(mention);
      const backendValue = getCommentMentionBackendValue(mention);
      const idToken = `@[${mention.userId}]`;
      return next
        .split(idToken)
        .join(displayValue)
        .split(backendValue)
        .join(displayValue);
    }, text);
}

export function splitCommentMentionSegments(
  text: string,
  mentions: CommentMention[] = [],
): CommentMentionSegment[] {
  if (!text) return [];

  const candidates = mentions
    .map(mention => ({
      value: getCommentMentionDisplayValue(mention),
      mention,
    }))
    .filter(candidate => candidate.value.length > 1)
    .sort((left, right) => right.value.length - left.value.length);

  const segments: CommentMentionSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nearestIndex = -1;
    let nearestCandidate: (typeof candidates)[number] | undefined;

    candidates.forEach(candidate => {
      const index = findNextKnownMentionIndex(text, candidate.value, cursor);
      if (index < 0) return;
      if (
        nearestIndex < 0 ||
        index < nearestIndex ||
        (index === nearestIndex &&
          candidate.value.length > (nearestCandidate?.value.length ?? 0))
      ) {
        nearestIndex = index;
        nearestCandidate = candidate;
      }
    });

    const rawUnknown = findNextUnknownMention(text, cursor);
    const unknownIndex = rawUnknown?.index ?? -1;

    const useUnknown =
      unknownIndex >= 0 && (nearestIndex < 0 || unknownIndex < nearestIndex);
    const nextIndex = useUnknown ? unknownIndex : nearestIndex;
    if (nextIndex < 0) {
      segments.push({ text: text.slice(cursor) });
      break;
    }

    if (nextIndex > cursor) {
      segments.push({ text: text.slice(cursor, nextIndex) });
    }

    if (useUnknown && rawUnknown) {
      segments.push({ text: rawUnknown[0], isMention: true });
      cursor = nextIndex + rawUnknown[0].length;
      continue;
    }

    if (nearestCandidate) {
      segments.push({
        text: nearestCandidate.value,
        mention: nearestCandidate.mention,
        isMention: true,
      });
      cursor = nextIndex + nearestCandidate.value.length;
      continue;
    }
  }

  return segments;
}
