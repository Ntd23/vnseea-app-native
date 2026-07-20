// Description: Defines the canonical six VNSEEA reactions and their backend wire ids.

export const ALL_REACTION_TYPES = [
  'like',
  'love',
  'haha',
  'wow',
  'sad',
  'angry',
] as const;

export type ReactionType = (typeof ALL_REACTION_TYPES)[number];

export const REACTION_TO_WIRE: Record<ReactionType, string> = {
  like: '1',
  love: '2',
  haha: '3',
  wow: '4',
  sad: '5',
  angry: '6',
};

export const WIRE_TO_REACTION: Readonly<Record<string, ReactionType>> =
  ALL_REACTION_TYPES.reduce<Record<string, ReactionType>>((result, type) => {
    result[type] = type;
    result[REACTION_TO_WIRE[type]] = type;
    return result;
  }, {});

export function isReactionType(value: string): value is ReactionType {
  return ALL_REACTION_TYPES.includes(value as ReactionType);
}

export function parseReactionType(value: unknown): ReactionType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return WIRE_TO_REACTION[normalized] ?? null;
}
