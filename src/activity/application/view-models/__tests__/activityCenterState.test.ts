import {
  appendActivityPage,
  createActivityCenterState,
  replaceActivityPage,
} from '../activityCenterState';

const item = (id: string) => ({
  id,
  postId: id,
  category: 'saved' as const,
  title: id,
  author: 'A',
  mediaKind: 'text' as const,
  rawPost: {},
});

describe('activity center state', () => {
  it('keeps independent tab state and replaces a refreshed page', () => {
    const initial = createActivityCenterState();
    const next = replaceActivityPage(initial, 'saved', {
      items: [item('1')],
      nextCursor: 'cursor',
      hasMore: true,
    });

    expect(next.saved.items).toHaveLength(1);
    expect(next.reaction.items).toHaveLength(0);
    expect(next.saved.loaded).toBe(true);
  });

  it('deduplicates posts when appending pagination', () => {
    const loaded = replaceActivityPage(createActivityCenterState(), 'saved', {
      items: [item('1')],
      hasMore: true,
    });
    const next = appendActivityPage(loaded, 'saved', {
      items: [item('1'), item('2')],
      hasMore: false,
    });

    expect(next.saved.items.map(entry => entry.id)).toEqual(['1', '2']);
  });
});
