import { selectVisibleScrollPostIds } from '../scrollViewPostVisibility';

describe('scroll view post realtime visibility', () => {
  it('selects only posts intersecting the visible viewport in visual order', () => {
    expect(
      selectVisibleScrollPostIds(
        [
          { postId: '30', y: 100, height: 240 },
          { postId: '20', y: 360, height: 240 },
          { postId: '10', y: 620, height: 240 },
        ],
        { offsetY: 350, height: 300 },
      ),
    ).toEqual(['20', '10']);
  });

  it('limits subscriptions without sorting ids numerically', () => {
    const layouts = Array.from({ length: 12 }, (_, index) => ({
      postId: String(100 - index),
      y: index * 100,
      height: 100,
    }));

    expect(
      selectVisibleScrollPostIds(
        layouts,
        { offsetY: 0, height: 1_200 },
        8,
      ),
    ).toEqual(['100', '99', '98', '97', '96', '95', '94', '93']);
  });
});
