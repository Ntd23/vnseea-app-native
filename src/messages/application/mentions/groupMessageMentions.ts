import type {
  GroupChatMember,
  MessageMention,
} from '../../domain/types/messages.types';

export interface ActiveGroupMention {
  start: number;
  end: number;
  query: string;
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
  member: Pick<GroupChatMember, 'id' | 'username'>,
  mentionedUserIds: string[],
) {
  const username = member.username.trim().replace(/^@/, '');
  const replacement = `@${username} `;
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
  return mentions.filter(mention => {
    const username = mention.username.trim().replace(/^@/, '');
    return (
      normalized.includes(`@${username.toLocaleLowerCase('vi-VN')}`) ||
      normalized.includes(`@[${mention.id}]`)
    );
  });
}
