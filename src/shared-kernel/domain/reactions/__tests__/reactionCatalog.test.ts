import {
  ALL_REACTION_TYPES,
  REACTION_TO_WIRE,
  WIRE_TO_REACTION,
  isReactionType,
  parseReactionType,
} from '../reactionCatalog';

describe('reactionCatalog', () => {
  it('keeps the Feed reaction order and numeric wire ids canonical', () => {
    expect(ALL_REACTION_TYPES).toEqual([
      'like',
      'love',
      'haha',
      'wow',
      'sad',
      'angry',
    ]);
    expect(REACTION_TO_WIRE).toEqual({
      like: '1',
      love: '2',
      haha: '3',
      wow: '4',
      sad: '5',
      angry: '6',
    });
  });

  it('parses numeric and named reaction values defensively', () => {
    expect(WIRE_TO_REACTION['2']).toBe('love');
    expect(parseReactionType(3)).toBe('haha');
    expect(parseReactionType('WOW')).toBe('wow');
    expect(parseReactionType('unknown')).toBeNull();
    expect(parseReactionType(undefined)).toBeNull();
  });

  it('recognizes only the six supported reaction names', () => {
    expect(isReactionType('angry')).toBe(true);
    expect(isReactionType('care')).toBe(false);
  });
});
