import {
  ALL_REACTION_TYPES,
  parseReactionType,
  type ReactionType,
} from '../../../shared-kernel/domain/reactions/reactionCatalog';
import type { MessageReactionSummary } from '../types/messages.types';

type RawReactionRecord = Record<string, unknown>;

function toNonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function readBreakdown(raw: RawReactionRecord) {
  const nested =
    raw.breakdown && typeof raw.breakdown === 'object'
      ? (raw.breakdown as RawReactionRecord)
      : undefined;
  const breakdown: Partial<Record<ReactionType, number>> = {};

  for (const type of ALL_REACTION_TYPES) {
    const wireIndex = String(ALL_REACTION_TYPES.indexOf(type) + 1);
    const count = toNonNegativeInteger(
      nested?.[type] ?? nested?.[wireIndex] ?? raw[type] ?? raw[wireIndex],
    );
    if (count > 0) breakdown[type] = count;
  }

  return breakdown;
}

function sortTopReactions(
  breakdown: Partial<Record<ReactionType, number>>,
): ReactionType[] {
  return ALL_REACTION_TYPES.filter(type => (breakdown[type] ?? 0) > 0)
    .sort((left, right) => {
      const countDifference =
        (breakdown[right] ?? 0) - (breakdown[left] ?? 0);
      return countDifference !== 0
        ? countDifference
        : ALL_REACTION_TYPES.indexOf(left) - ALL_REACTION_TYPES.indexOf(right);
    })
    .slice(0, 3);
}

export function createEmptyMessageReactionSummary(): MessageReactionSummary {
  return {
    total: 0,
    myReaction: null,
    topReactions: [],
    breakdown: {},
  };
}

export function mapMessageReactionSummary(
  value: unknown,
): MessageReactionSummary {
  if (!value || typeof value !== 'object') {
    return createEmptyMessageReactionSummary();
  }

  const raw = value as RawReactionRecord;
  const breakdown = readBreakdown(raw);
  const isReacted =
    raw.is_reacted === true ||
    raw.is_reacted === 1 ||
    raw.is_reacted === '1' ||
    raw.is_reacted === 'true';
  const myReaction = parseReactionType(
    raw.my_reaction ?? raw.myReaction ?? (isReacted ? raw.type : undefined),
  );
  const breakdownTotal = Object.values(breakdown).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  const total = Math.max(
    toNonNegativeInteger(raw.total ?? raw.count),
    breakdownTotal,
  );

  return {
    total,
    myReaction,
    topReactions: sortTopReactions(breakdown),
    breakdown,
  };
}

export function applyOptimisticMessageReaction(
  current: MessageReactionSummary,
  nextReaction: ReactionType | null,
): MessageReactionSummary {
  const previousReaction = current.myReaction;
  if (previousReaction === nextReaction) return current;

  const breakdown = { ...current.breakdown };
  if (previousReaction) {
    const nextCount = Math.max(0, (breakdown[previousReaction] ?? 0) - 1);
    if (nextCount === 0) delete breakdown[previousReaction];
    else breakdown[previousReaction] = nextCount;
  }
  if (nextReaction) {
    breakdown[nextReaction] = (breakdown[nextReaction] ?? 0) + 1;
  }

  const total = Math.max(
    0,
    current.total +
      (previousReaction ? 0 : nextReaction ? 1 : 0) -
      (previousReaction && !nextReaction ? 1 : 0),
  );

  return {
    total,
    myReaction: nextReaction,
    topReactions: sortTopReactions(breakdown),
    breakdown,
  };
}

export function areMessageReactionSummariesEqual(
  left: MessageReactionSummary,
  right: MessageReactionSummary,
) {
  return (
    left.total === right.total &&
    left.myReaction === right.myReaction &&
    left.topReactions.length === right.topReactions.length &&
    left.topReactions.every(
      (reaction, index) => reaction === right.topReactions[index],
    ) &&
    ALL_REACTION_TYPES.every(
      reaction =>
        (left.breakdown[reaction] ?? 0) ===
        (right.breakdown[reaction] ?? 0),
    )
  );
}
