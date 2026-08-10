import { resolveFeedVideoPageCursor } from '../feedVideoPagination';

describe('feed video pagination', () => {
  it('advances across a text-only raw page instead of retrying the same cursor', () => {
    expect(
      resolveFeedVideoPageCursor({
        currentCursor: '100',
        nextCursor: '70',
        reachedEnd: false,
      }),
    ).toEqual({ nextCursor: '70', reachedEnd: false });
  });

  it('trusts an advancing raw cursor over a stale reached-end flag', () => {
    expect(
      resolveFeedVideoPageCursor({
        currentCursor: '100',
        nextCursor: '70',
        reachedEnd: true,
      }),
    ).toEqual({ nextCursor: '70', reachedEnd: false });
  });

  it('stops when the raw video scan cannot advance', () => {
    expect(
      resolveFeedVideoPageCursor({
        currentCursor: '100',
        nextCursor: '100',
        reachedEnd: false,
      }),
    ).toEqual({ nextCursor: undefined, reachedEnd: true });
  });
});
