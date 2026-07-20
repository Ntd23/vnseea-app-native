import {
  applyOptimisticMessageReaction,
  createEmptyMessageReactionSummary,
  mapMessageReactionSummary,
} from '../messageReactions';

describe('messageReactions', () => {
  it('maps canonical backend counts and the viewer reaction', () => {
    expect(
      mapMessageReactionSummary({
        count: '6',
        is_reacted: 1,
        type: '2',
        '1': 3,
        '2': 2,
        '4': 1,
      }),
    ).toEqual({
      total: 6,
      myReaction: 'love',
      topReactions: ['like', 'love', 'wow'],
      breakdown: { like: 3, love: 2, wow: 1 },
    });
  });

  it('accepts the normalized response shape and rejects unknown reactions', () => {
    expect(
      mapMessageReactionSummary({
        total: 4,
        my_reaction: 'haha',
        breakdown: { haha: 3, care: 99, sad: 1 },
        top_reactions: ['care', 'haha', 'sad'],
      }),
    ).toEqual({
      total: 4,
      myReaction: 'haha',
      topReactions: ['haha', 'sad'],
      breakdown: { haha: 3, sad: 1 },
    });
  });

  it('optimistically sets, swaps and removes the viewer reaction', () => {
    const empty = createEmptyMessageReactionSummary();
    const liked = applyOptimisticMessageReaction(empty, 'like');
    expect(liked).toEqual({
      total: 1,
      myReaction: 'like',
      topReactions: ['like'],
      breakdown: { like: 1 },
    });

    const loved = applyOptimisticMessageReaction(liked, 'love');
    expect(loved).toEqual({
      total: 1,
      myReaction: 'love',
      topReactions: ['love'],
      breakdown: { love: 1 },
    });

    expect(applyOptimisticMessageReaction(loved, null)).toEqual(empty);
  });
});
