import type {
  GroupChatMember,
  MessageMention,
} from '../../domain/types/messages.types';

export interface ActiveGroupMention {
  start: number;
  end: number;
  query: string;
}

export interface GroupMentionTextSegment {
  text: string;
  isMention: boolean;
  mentionId?: string;
}

function getMentionDisplayName(
  mention: Pick<MessageMention, 'name' | 'username'>,
) {
  return mention.name.trim() || mention.username.trim().replace(/^@/, '');
}

function getMentionDisplayToken(
  mention: Pick<MessageMention, 'name' | 'username'>,
) {
  const displayName = getMentionDisplayName(mention);
  return displayName ? `@${displayName}` : '';
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findActiveGroupMention(
  text: string,
  cursor: number,
): ActiveGroupMention | undefined {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const beforeCursor = text.slice(0, safeCursor);
  const match = beforeCursor.match(/(?:^|\s)@([\p{L}\p{N}_.-]*)$/u);
  if (!match || match.index === undefined) return undefined;

  const atOffset = match[0].lastIndexOf('@');
  const start = match.index + atOffset;
  return {
    start,
    end: safeCursor,
    query: match[1] ?? '',
  };
}

export function insertGroupMention(
  text: string,
  activeMention: ActiveGroupMention,
  member: Pick<GroupChatMember, 'id' | 'name' | 'username'>,
  mentionedUserIds: string[],
) {
  const replacement = `${getMentionDisplayToken(member)} `;
  const nextText =
    text.slice(0, activeMention.start) +
    replacement +
    text.slice(activeMention.end);

  return {
    text: nextText,
    cursor: activeMention.start + replacement.length,
    mentionedUserIds: Array.from(
      new Set([...mentionedUserIds, String(member.id)]),
    ),
  };
}

export function serializeGroupMentionTokens(
  text: string,
  mentions: MessageMention[],
) {
  if (!text || mentions.length === 0) return text;

  let serialized = text;
  const mentionsByDisplayToken = new Map<string, MessageMention[]>();

  for (const mention of mentions) {
    const token = getMentionDisplayToken(mention);
    if (!token) continue;
    const entries = mentionsByDisplayToken.get(token) ?? [];
    entries.push(mention);
    mentionsByDisplayToken.set(token, entries);
  }

  for (const [displayToken, tokenMentions] of [
    ...mentionsByDisplayToken.entries(),
  ].sort(([left], [right]) => right.length - left.length)) {
    let mentionIndex = 0;
    const pattern = new RegExp(
      `${escapeRegExp(displayToken)}(?![\\p{L}\\p{N}_])`,
      'giu',
    );
    serialized = serialized.replace(pattern, match => {
      const mention = tokenMentions[mentionIndex];
      if (!mention) return match;
      mentionIndex += 1;
      return `@[${mention.id}]`;
    });
  }

  return serialized;
}

export function replaceGroupMentionTokens(
  text: string,
  mentions: MessageMention[],
) {
  if (!text || mentions.length === 0) return text;
  const namesById = new Map(
    mentions.map(mention => [String(mention.id), mention.name]),
  );
  return text.replace(/@\[(\d+)\]/g, (token, userId: string) => {
    const name = namesById.get(userId);
    return name ? `@${name}` : token;
  });
}

export function filterSelectedGroupMentions(
  text: string,
  mentions: MessageMention[],
) {
  const normalized = text.toLocaleLowerCase('vi-VN');
  const retainedByToken = new Map<string, number>();

  return mentions.filter(mention => {
    if (normalized.includes(`@[${mention.id}]`)) return true;

    const displayToken = getMentionDisplayToken(mention)
      .toLocaleLowerCase('vi-VN');
    const username = mention.username.trim().replace(/^@/, '');
    const fallbackToken = `@${username.toLocaleLowerCase('vi-VN')}`;
    if (!displayToken && !username) return false;
    const token = normalized.includes(displayToken)
      ? displayToken
      : normalized.includes(fallbackToken)
      ? fallbackToken
      : '';
    if (!token) return false;

    const tokenCount = normalized.split(token).length - 1;
    const retainedCount = retainedByToken.get(token) ?? 0;
    if (retainedCount >= tokenCount) return false;
    retainedByToken.set(token, retainedCount + 1);
    return true;
  });
}

export function buildGroupMentionTextSegments(
  text: string,
  mentions: MessageMention[],
): GroupMentionTextSegment[] {
  if (!text || mentions.length === 0) {
    return [{ text, isMention: false }];
  }

  const mentionTokens = mentions
    .map(mention => ({
      id: String(mention.id),
      token: getMentionDisplayToken(mention),
    }))
    .filter(item => Boolean(item.token))
    .sort((left, right) => right.token.length - left.token.length);
  const segments: GroupMentionTextSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextIndex = -1;
    let nextMention: (typeof mentionTokens)[number] | undefined;

    for (const mention of mentionTokens) {
      const index = text.indexOf(mention.token, cursor);
      if (
        index >= 0 &&
        (nextIndex < 0 ||
          index < nextIndex ||
          (index === nextIndex &&
            mention.token.length > (nextMention?.token.length ?? 0)))
      ) {
        nextIndex = index;
        nextMention = mention;
      }
    }

    if (nextIndex < 0 || !nextMention) {
      segments.push({ text: text.slice(cursor), isMention: false });
      break;
    }
    if (nextIndex > cursor) {
      segments.push({
        text: text.slice(cursor, nextIndex),
        isMention: false,
      });
    }
    segments.push({
      text: nextMention.token,
      isMention: true,
      mentionId: nextMention.id,
    });
    cursor = nextIndex + nextMention.token.length;
  }

  return segments.length > 0 ? segments : [{ text, isMention: false }];
}
